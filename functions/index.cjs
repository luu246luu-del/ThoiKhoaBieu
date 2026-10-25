'use strict';
/**
 * VanTien Study Admin Backend.
 * Mọi quyết định cấp quyền đều chạy trên máy chủ, không tin dữ liệu từ React.
 * Chủ website phải vượt qua: Firebase UID + custom claim owner + TOTP.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('node:crypto');

initializeApp();
const db = getFirestore();
const ownerUidSecret = defineSecret('VANTIEN_OWNER_UID');
const otpSeedSecret = defineSecret('VANTIEN_ADMIN_TOTP_SEED');
const config = {
  region: 'asia-southeast1',
  secrets: [ownerUidSecret, otpSeedSecret],
  maxInstances: 5,
  timeoutSeconds: 30,
};
const SESSION_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_OTP_FAILURES = 5;

function base32ToBuffer(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const raw = String(input || '').toUpperCase().replace(/\s|=/g, '');
  if (!raw || /[^A-Z2-7]/.test(raw)) throw new Error('Invalid server OTP seed');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const letter of raw) {
    value = (value << 5) | alphabet.indexOf(letter);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits -= 8)) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function calculateTotp(key, counter) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(number).padStart(6, '0');
}

function isValidTotp(code) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const seed = base32ToBuffer(otpSeedSecret.value());
  const counter = Math.floor(Date.now() / 30000);
  const submitted = Buffer.from(code, 'utf8');
  for (let delta = -1; delta <= 1; delta++) {
    const expected = Buffer.from(calculateTotp(seed, counter + delta), 'utf8');
    if (crypto.timingSafeEqual(submitted, expected)) return true;
  }
  return false;
}

async function requireOwner(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Please sign in');
  const expectedUid = ownerUidSecret.value().trim();
  if (!expectedUid || request.auth.uid !== expectedUid || request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'This account has no admin privileges');
  }
  // Firebase callable đã xác minh ID token; vẫn kiểm tra khóa/thu hồi phiên.
  const user = await getAuth().getUser(request.auth.uid);
  if (user.disabled || user.customClaims?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin privilege is disabled');
  }
  const validSinceMs = user.tokensValidAfterTime ? new Date(user.tokensValidAfterTime).getTime() : 0;
  const authenticatedAtMs = Number(request.auth.token.auth_time || 0) * 1000;
  if (validSinceMs && authenticatedAtMs < validSinceMs - 1000) {
    throw new HttpsError('unauthenticated', 'Sign in again; credentials have been revoked');
  }
  return user;
}

function sessionDocId(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function requireAdminSession(request) {
  const owner = await requireOwner(request);
  const raw = request.data?.session;
  if (typeof raw !== 'string' || !/^[0-9a-f]{64}$/.test(raw)) {
    throw new HttpsError('permission-denied', 'Admin second factor required');
  }
  const ref = db.collection('adminSessions').doc(sessionDocId(raw));
  const snap = await ref.get();
  if (!snap.exists || snap.get('uid') !== owner.uid || Number(snap.get('expiresAtMs')) <= Date.now()) {
    throw new HttpsError('permission-denied', 'Admin session expired; verify your code again');
  }
  return owner;
}

function publicUserRecord(user, profile) {
  const providers = (user.providerData || []).map(p => p.providerId);
  return {
    uid: user.uid,
    username: profile?.username || null,
    displayName: profile?.displayName || user.displayName || null,
    email: user.email?.endsWith('@studyflow.internal') ? null : (user.email || null),
    emailVerified: user.emailVerified,
    providers,
    disabled: user.disabled,
    createdAt: user.metadata.creationTime || null,
    lastSignInAt: user.metadata.lastSignInTime || null,
    isOwner: user.uid === ownerUidSecret.value().trim(),
  };
}

async function logAction(actorUid, action, targetUid, extra = {}) {
  await db.collection('adminAuditLogs').add({
    actorUid, action, targetUid, extra,
    timestamp: FieldValue.serverTimestamp(),
  });
}

exports.adminOpenSession = onCall(config, async request => {
  const owner = await requireOwner(request);
  const limitRef = db.collection('adminSecurity').doc(owner.uid);
  const now = Date.now();
  let locked = false;
  // Đếm thất bại cả trước khi kiểm tra OTP để giới hạn đoán mã trên server.
  await db.runTransaction(async tx => {
    const snap = await tx.get(limitRef);
    const data = snap.data() || {};
    const inWindow = now - Number(data.windowStartMs || 0) < RATE_WINDOW_MS;
    const failures = inWindow ? Number(data.failures || 0) : 0;
    if (failures >= MAX_OTP_FAILURES) {
      locked = true;
      return;
    }
    tx.set(limitRef, {
      windowStartMs: inWindow ? data.windowStartMs : now,
      failures: failures + 1,
      lastAttemptAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  if (locked) throw new HttpsError('resource-exhausted', 'Too many attempts. Try again in 15 minutes');
  if (!isValidTotp(request.data?.code)) {
    throw new HttpsError('permission-denied', 'Invalid verification code');
  }
  await limitRef.set({ failures: 0, windowStartMs: now }, { merge: true });
  const raw = crypto.randomBytes(32).toString('hex');
  await db.collection('adminSessions').doc(sessionDocId(raw)).set({
    uid: owner.uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAtMs: now + SESSION_MS,
  });
  await logAction(owner.uid, 'admin.session.open', owner.uid);
  return { session: raw, expiresAtMs: now + SESSION_MS };
});

exports.adminCloseSession = onCall(config, async request => {
  const owner = await requireAdminSession(request);
  await db.collection('adminSessions').doc(sessionDocId(request.data.session)).delete();
  await logAction(owner.uid, 'admin.session.close', owner.uid);
  return { ok: true };
});

exports.adminListUsers = onCall(config, async request => {
  await requireAdminSession(request);
  const pageToken = request.data?.pageToken;
  if (pageToken !== undefined && (typeof pageToken !== 'string' || pageToken.length > 2000)) {
    throw new HttpsError('invalid-argument', 'Invalid pagination token');
  }
  const page = await getAuth().listUsers(40, pageToken || undefined);
  const refs = page.users.map(u => db.collection('users').doc(u.uid));
  const profiles = refs.length ? await db.getAll(...refs) : [];
  return {
    users: page.users.map((user, i) => publicUserRecord(user, profiles[i]?.data())),
    nextPageToken: page.pageToken || null,
  };
});

exports.adminGetUser = onCall(config, async request => {
  await requireAdminSession(request);
  const uid = request.data?.uid;
  if (typeof uid !== 'string' || uid.length > 128 || !uid) {
    throw new HttpsError('invalid-argument', 'Invalid UID');
  }
  let user;
  try { user = await getAuth().getUser(uid); }
  catch { throw new HttpsError('not-found', 'User not found'); }
  const root = db.collection('users').doc(uid);
  const [profile, tasks, focusSessions, calendarEvents, projects, habits] = await Promise.all([
    root.get(),
    root.collection('tasks').count().get(),
    root.collection('focusSessions').count().get(),
    root.collection('calendarEvents').count().get(),
    root.collection('projects').count().get(),
    root.collection('habits').count().get(),
  ]);
  const p = profile.data();
  return {
    user: publicUserRecord(user, p),
    account: {
      timezone: p?.timezone || null,
      locale: p?.locale || null,
      theme: p?.theme || null,
      categoryCount: Array.isArray(p?.categories) ? p.categories.length : 0,
    },
    activity: {
      taskCount: tasks.data().count,
      focusSessionCount: focusSessions.data().count,
      calendarEventCount: calendarEvents.data().count,
      projectCount: projects.data().count,
      habitCount: habits.data().count,
    },
  };
});

exports.adminSummary = onCall(config, async request => {
  await requireAdminSession(request);
  const profiles = await db.collection('users').count().get();
  return { registeredProfiles: profiles.data().count };
});

exports.adminSetDisabled = onCall(config, async request => {
  const actor = await requireAdminSession(request);
  const { uid, disabled } = request.data || {};
  if (typeof uid !== 'string' || !uid || uid.length > 128 || typeof disabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Invalid account status request');
  }
  if (uid === actor.uid || uid === ownerUidSecret.value().trim()) {
    throw new HttpsError('permission-denied', 'Cannot change owner status');
  }
  const target = await getAuth().getUser(uid);
  if (target.customClaims?.admin) {
    throw new HttpsError('permission-denied', 'Cannot change another privileged account');
  }
  await getAuth().updateUser(uid, { disabled });
  if (disabled) await getAuth().revokeRefreshTokens(uid);
  await logAction(actor.uid, disabled ? 'user.disable' : 'user.enable', uid);
  return { ok: true };
});

exports.adminRevokeSessions = onCall(config, async request => {
  const actor = await requireAdminSession(request);
  const uid = request.data?.uid;
  if (typeof uid !== 'string' || !uid || uid.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid UID');
  }
  if (uid === actor.uid || uid === ownerUidSecret.value().trim()) {
    throw new HttpsError('permission-denied', 'Cannot revoke owner session from this panel');
  }
  const target = await getAuth().getUser(uid);
  if (target.customClaims?.admin) {
    throw new HttpsError('permission-denied', 'Cannot revoke privileged account');
  }
  await getAuth().revokeRefreshTokens(uid);
  await logAction(actor.uid, 'user.sessions.revoke', uid);
  return { ok: true };
});
