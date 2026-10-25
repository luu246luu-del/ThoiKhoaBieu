import {
  collection, doc, documentId, getCountFromServer, getDoc, getDocs,
  limit, orderBy, query, startAfter, Timestamp,
} from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';
import { auth, db } from './config';

/**
 * Quan tri mien phi (Firebase Spark).
 * Trinh duyet CHI duoc phep doc nhung tai lieu ma Firestore Rules cho phep.
 * Khong su dung Firebase Admin SDK, service account hay quyen khoa user tren client.
 */
export interface AdminUser {
  uid: string;
  username: string | null;
  displayName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  timezone: string | null;
  locale: string | null;
  theme: string | null;
  categoryCount: number;
  isOwner: boolean;
}

export interface AdminUserDetails {
  user: AdminUser;
  activity: {
    taskCount: number | null;
    focusSessionCount: number | null;
    calendarEventCount: number | null;
    projectCount: number | null;
    habitCount: number | null;
  };
}

export interface AdminUserPage {
  users: AdminUser[];
  nextPageToken: string | null;
}

const PAGE_SIZE = 25;

function dateIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const time = new Date(value);
    return Number.isNaN(time.getTime()) ? null : time.toISOString();
  }
  return null;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function mapUser(uid: string, data: Record<string, unknown>): AdminUser {
  return {
    uid,
    username: optionalText(data.username),
    displayName: optionalText(data.displayName),
    createdAt: dateIso(data.createdAt),
    updatedAt: dateIso(data.updatedAt),
    timezone: optionalText(data.timezone),
    locale: optionalText(data.locale),
    theme: optionalText(data.theme),
    categoryCount: Array.isArray(data.categories) ? data.categories.length : 0,
    isOwner: uid === auth.currentUser?.uid,
  };
}

/**
 * Kiem tra nhanh de hien UI; quyen truy cap THUC TE do Firestore Rules kiem soat.
 * Moi lan lam moi token se nhan custom claim moi nhat tu Firebase Auth.
 */
export async function verifyOwner(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await getIdTokenResult(user, true);
  return token.claims.admin === true && token.claims.owner === true;
}

/** Lay 25 ho so/trang, cursor la UID cuoi cung cua trang truoc. */
export async function listAdminUsers(pageToken = ''): Promise<AdminUserPage> {
  const ref = collection(db, 'users');
  const q = pageToken
    ? query(ref, orderBy(documentId()), startAfter(pageToken), limit(PAGE_SIZE + 1))
    : query(ref, orderBy(documentId()), limit(PAGE_SIZE + 1));
  const snapshot = await getDocs(q);
  const hasNext = snapshot.docs.length > PAGE_SIZE;
  const visible = snapshot.docs.slice(0, PAGE_SIZE);
  return {
    users: visible.map(item => mapUser(item.id, item.data())),
    nextPageToken: hasNext && visible.length ? visible[visible.length - 1].id : null,
  };
}

/** Dem ho so Firestore, khong dong nghia tong so tai khoan trong Firebase Auth. */
export async function getAdminSummary(): Promise<number> {
  const result = await getCountFromServer(collection(db, 'users'));
  return result.data().count;
}

/**
 * Chi dem hoat dong, KHONG tai toan bo task/focus session ve trinh duyet.
 * Gia tri null la khong doc duoc, TUYET DOI khong tu dong coi la 0.
 */
export async function getAdminUser(uid: string): Promise<AdminUserDetails> {
  const profile = await getDoc(doc(db, 'users', uid));
  if (!profile.exists()) throw new Error('Ho so Firestore khong ton tai.');

  const paths = ['tasks', 'focusSessions', 'calendarEvents', 'projects', 'habits'] as const;
  const counts = await Promise.allSettled(paths.map(async path => {
    const response = await getCountFromServer(collection(db, 'users', uid, path));
    return response.data().count;
  }));
  const countAt = (index: number): number | null => {
    const result = counts[index];
    return result.status === 'fulfilled' ? result.value : null;
  };
  return {
    user: mapUser(profile.id, profile.data()),
    activity: {
      taskCount: countAt(0),
      focusSessionCount: countAt(1),
      calendarEventCount: countAt(2),
      projectCount: countAt(3),
      habitCount: countAt(4),
    },
  };
}
