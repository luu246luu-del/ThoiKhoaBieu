'use strict';
/**
 * One-time owner registration (run LOCALLY, with Application Default Credentials).
 * Create the Firebase Authentication user with a REAL email and strong password
 * in Firebase Console first. Then pass ONLY that user's UID here.
 * This script NEVER accepts or stores user passwords.
 */
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const uid = process.argv[2] || '';
const expectedProject = 'studyflow-pro-56cbc';
if (!/^[A-Za-z0-9_-]{15,128}$/.test(uid)) {
  console.error('Usage: node bootstrap-owner.cjs <EXACT_FIREBASE_AUTH_UID>');
  process.exit(1);
}
const projectId = process.env.GOOGLE_CLOUD_PROJECT || expectedProject;
if (projectId !== expectedProject) {
  console.error('Refusing to run against an unexpected Firebase project');
  process.exit(1);
}
initializeApp({ credential: applicationDefault(), projectId });

async function main() {
  const user = await getAuth().getUser(uid);
  if (!user.email || user.email.endsWith('@studyflow.internal')) {
    throw new Error('Owner must have a real recovery email. Do not use a synthetic email.');
  }
  const db = getFirestore();
  const usernameRef = db.doc('usernames/admin');
  const profileRef = db.doc(`users/${uid}`);
  const [usernameSnap, profileSnap] = await Promise.all([usernameRef.get(), profileRef.get()]);
  if (usernameSnap.exists && usernameSnap.get('uid') !== uid) {
    throw new Error('Username admin already claimed by a different UID. Resolve conflict safely first.');
  }
  if (profileSnap.exists && profileSnap.get('username') !== 'admin') {
    throw new Error('UID already owns another username; do not convert an ordinary account.');
  }
  console.log('\nOWNER CANDIDATE');
  console.log('Project :', expectedProject);
  console.log('UID     :', uid);
  console.log('Email   :', user.email);
  console.log('Username: admin');
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question('Type CONFIRM to assign OWNER role to this exact account: ');
  rl.close();
  if (answer !== 'CONFIRM') throw new Error('Cancelled. No changes were made.');
  if (!usernameSnap.exists || !profileSnap.exists) {
    await db.runTransaction(async tx => {
      const [nameDoc, accountDoc] = await Promise.all([tx.get(usernameRef), tx.get(profileRef)]);
      if (nameDoc.exists && nameDoc.get('uid') !== uid) throw new Error('admin username conflict');
      if (accountDoc.exists && accountDoc.get('username') !== 'admin') throw new Error('user profile conflict');
      if (!nameDoc.exists) tx.create(usernameRef, { uid, createdAt: FieldValue.serverTimestamp() });
      if (!accountDoc.exists) {
        tx.create(profileRef, {
          uid, username: 'admin', displayName: 'VanTien Administrator',
          timezone: 'Asia/Ho_Chi_Minh', locale: 'vi', theme: 'dark',
          linkedProviders: ['password'],
          pomodoroSettings: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 },
          quietHours: { enabled: true, start: '23:00', end: '06:00' },
          weeklyGoals: {}, categories: [], schemaVersion: 1,
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  }
  await getAuth().setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: true, owner: true });
  console.log('\nOWNER REGISTERED. Save this UID for VANTIEN_OWNER_UID secret:');
  console.log(uid);
  console.log('Owner must log out and log back in to refresh Firebase custom claims.');
}
main().catch(err => { console.error('BOOTSTRAP FAILED:', err.message); process.exitCode = 1; });
