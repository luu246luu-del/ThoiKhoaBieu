import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';
import { safeStorage } from '@/lib/storage';
import type { UserProfile } from '@/types';
import {
  DEFAULT_POMODORO_SETTINGS,
  DEFAULT_QUIET_HOURS,
  DEFAULT_WEEKLY_GOALS,
  DEFAULT_CATEGORIES,
} from '@/types';

// ============================================
// USERNAME SANITIZATION & NORMALIZATION
// ============================================

/**
 * Normalizes username: lowercase, trimmed, only allowed safe characters (a-z, 0-9, _, .)
 */
export function normalizeUsername(username: string): string {
  return username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_.]/g, '');
}

/**
 * Internal email representation for Firebase Authentication.
 * NOTE: This is an internal synthetic identifier, NOT a real email mailbox.
 */
export function usernameToInternalEmail(username: string): string {
  const normalized = normalizeUsername(username);
  if (normalized === 'admin') {
    const ownerEmail = import.meta.env.VITE_ADMIN_LOGIN_EMAIL?.trim();
    if (!ownerEmail) throw new Error('Chua thiet lap VITE_ADMIN_LOGIN_EMAIL trong .env.local');
    return ownerEmail;
  }
  return `${normalized}@studyflow.internal`;
}

/**
 * Validates username syntax
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = (username || '').trim().toLowerCase();
  if (!trimmed || trimmed.length < 3) {
    return { valid: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Tên đăng nhập không được vượt quá 30 ký tự' };
  }
  if (trimmed === 'admin') {
    return { valid: false, error: 'Ten admin da duoc danh rieng cho chu so huu' };
  }
  if (!/^[a-z0-9_.]+$/.test(trimmed)) {
    return { valid: false, error: 'Tên đăng nhập chỉ chứa chữ cái thường, số, dấu chấm (.) hoặc gạch dưới (_)' };
  }
  return { valid: true };
}

/**
 * Checks if a username is already registered in Firestore
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const validation = validateUsername(username);
  if (!validation.valid) return true;
  const normalized = normalizeUsername(username);

  if (!isFirebaseConfigured) {
    // In demo/unconfigured mode, check existing local profile registry
    const demoProfile = safeStorage.getItem(`studyflow_profile_${normalized}`);
    return Boolean(demoProfile);
  }

  const docRef = doc(db, 'usernames', normalized);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

// ============================================
// REGISTRATION (Strict & Secure)
// ============================================

export interface RegisterData {
  username: string;
  password: string;
  displayName: string;
}

/**
 * Creates a brand new user account.
 * NEVER stores passwords in plaintext or localStorage.
 */
export async function registerWithUsername(data: RegisterData): Promise<User> {
  const validation = validateUsername(data.username);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  if (!data.password || data.password.length < 6) {
    throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
  }

  const normalized = normalizeUsername(data.username);

  // If Firebase is NOT configured, alert user to configure Firebase
  // No plaintext passwords will ever be saved.
  if (!isFirebaseConfigured) {
    throw new Error(
      'Hệ thống chưa được liên kết Firebase Project. Vui lòng cấu hình file .env.local để kích hoạt đăng ký tài khoản đám mây, hoặc sử dụng "Chế độ Demo" để trải nghiệm thử.'
    );
  }

  const internalEmail = usernameToInternalEmail(normalized);

  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    internalEmail,
    data.password
  );
  const user = userCredential.user;

  try {
    // 2. Atomically claim username and create user profile document
    await runTransaction(db, async (transaction) => {
      const usernameRef = doc(db, 'usernames', normalized);
      const usernameDoc = await transaction.get(usernameRef);

      if (usernameDoc.exists()) {
        throw new Error('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.');
      }

      transaction.set(usernameRef, {
        uid: user.uid,
        createdAt: serverTimestamp(),
      });

      const userRef = doc(db, 'users', user.uid);
      const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        uid: user.uid,
        username: normalized,
        displayName: data.displayName.trim() || normalized,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        theme: 'dark',
        linkedProviders: ['password'],
        pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
        quietHours: DEFAULT_QUIET_HOURS,
        weeklyGoals: DEFAULT_WEEKLY_GOALS,
        categories: DEFAULT_CATEGORIES,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      transaction.set(userRef, profile);
    });

    return user;
  } catch (error) {
    // Rollback Firebase Auth user if Firestore transaction fails
    await user.delete().catch(() => {});
    throw error;
  }
}

// ============================================
// LOGIN (Strict & Secure - Never Auto-Creates Accounts)
// ============================================

export async function loginWithUsername(
  username: string,
  password: string,
  rememberMe: boolean = true
): Promise<User> {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    throw new Error('Vui lòng nhập tên đăng nhập');
  }
  if (!password) {
    throw new Error('Vui lòng nhập mật khẩu');
  }

  if (!isFirebaseConfigured) {
    throw new Error(
      'Hệ thống chưa kết nối Firebase. Hãy điền khóa Firebase vào .env.local để đăng nhập, hoặc chọn "Chế độ Demo" để thử nghiệm nhanh.'
    );
  }

  const internalEmail = usernameToInternalEmail(normalized);

  // Set auth persistence (local vs session) based on rememberMe checkbox
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence
  );

  const userCredential = await signInWithEmailAndPassword(
    auth,
    internalEmail,
    password
  );
  return userCredential.user;
}

// ============================================
// DEMO / GUEST MODE (Safe preview without passwords)
// ============================================

const DEMO_USER_ID = 'studyflow_demo_guest_uid';

export function startDemoSession(): User {
  const mockUser = {
    uid: DEMO_USER_ID,
    displayName: 'Khách trải nghiệm',
    email: 'demo@studyflow.internal',
    photoURL: undefined,
  } as unknown as User;

  const demoProfile: UserProfile = {
    uid: DEMO_USER_ID,
    username: 'demo_guest',
    displayName: 'Khách trải nghiệm',
    timezone: 'Asia/Ho_Chi_Minh',
    locale: 'vi',
    theme: 'dark',
    linkedProviders: ['demo'],
    pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
    quietHours: DEFAULT_QUIET_HOURS,
    weeklyGoals: DEFAULT_WEEKLY_GOALS,
    categories: DEFAULT_CATEGORIES,
    schemaVersion: 1,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  safeStorage.setItem('studyflow_demo_active', 'true');
  safeStorage.setItem('studyflow_demo_profile', JSON.stringify(demoProfile));
  notifyAuthSubscribers(mockUser);
  return mockUser;
}

export function isDemoSession(): boolean {
  return safeStorage.getItem('studyflow_demo_active') === 'true';
}

// ============================================
// AUTH STATE LISTENER & SUBSCRIBERS
// ============================================

type AuthCallback = (user: User | null) => void;
const customAuthSubscribers: Set<AuthCallback> = new Set();

function notifyAuthSubscribers(user: User | null) {
  customAuthSubscribers.forEach((cb) => cb(user));
}

export function onAuthChange(callback: AuthCallback): Unsubscribe {
  // Check if active demo session
  if (isDemoSession()) {
    customAuthSubscribers.add(callback);
    const mockUser = {
      uid: DEMO_USER_ID,
      displayName: 'Khách trải nghiệm',
      email: 'demo@studyflow.internal',
    } as unknown as User;
    setTimeout(() => callback(mockUser), 10);

    return () => {
      customAuthSubscribers.delete(callback);
    };
  }

  // Firebase auth state listener
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

// ============================================
// GOOGLE AUTH
// ============================================

const googleProvider = new GoogleAuthProvider();

export class NeedsUsernameError extends Error {
  constructor(public user: User) {
    super('NEEDS_USERNAME');
    this.name = 'NeedsUsernameError';
  }
}

export async function signInWithGoogle(): Promise<User> {
  if (!isFirebaseConfigured) {
    throw new Error('Tính năng Google Sign-in yêu cầu cấu hình Firebase hợp lệ trong .env.local');
  }

  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new NeedsUsernameError(user);
  }

  return user;
}

export async function completeGoogleSignUp(
  user: User,
  username: string,
  displayName: string
): Promise<void> {
  const validation = validateUsername(username);
  if (!validation.valid) throw new Error(validation.error);
  const normalized = normalizeUsername(username);

  await runTransaction(db, async (transaction) => {
    const usernameRef = doc(db, 'usernames', normalized);
    const usernameDoc = await transaction.get(usernameRef);

    if (usernameDoc.exists()) {
      throw new Error('Tên đăng nhập đã được sử dụng');
    }

    transaction.set(usernameRef, {
      uid: user.uid,
      createdAt: serverTimestamp(),
    });

    const userRef = doc(db, 'users', user.uid);
    transaction.set(userRef, {
      uid: user.uid,
      username: normalized,
      displayName: displayName.trim() || user.displayName || normalized,
      avatarUrl: user.photoURL || undefined,
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      theme: 'dark',
      linkedProviders: ['google.com'],
      pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
      quietHours: DEFAULT_QUIET_HOURS,
      weeklyGoals: DEFAULT_WEEKLY_GOALS,
      categories: DEFAULT_CATEGORIES,
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function linkGoogleAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Chưa đăng nhập');

  await linkWithPopup(user, googleProvider);

  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    const providers = user.providerData.map((p) => p.providerId);
    await setDoc(
      userRef,
      {
        linkedProviders: providers,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function signOut(): Promise<void> {
  if (isDemoSession()) {
    safeStorage.removeItem('studyflow_demo_active');
    safeStorage.removeItem('studyflow_demo_profile');
    notifyAuthSubscribers(null);
    return;
  }
  await firebaseSignOut(auth);
}

export async function changePassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Chưa đăng nhập');
  if (newPassword.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
  await updatePassword(user, newPassword);
}

// ============================================
// PROFILE REPOSITORY
// ============================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isDemoSession() || uid === DEMO_USER_ID) {
    const saved = safeStorage.getItem('studyflow_demo_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }

  if (!isFirebaseConfigured) return null;

  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return null;
  return userDoc.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  if (isDemoSession() || uid === DEMO_USER_ID) {
    const saved = safeStorage.getItem('studyflow_demo_profile');
    if (saved) {
      const profile = JSON.parse(saved);
      const updated = { ...profile, ...updates };
      safeStorage.setItem('studyflow_demo_profile', JSON.stringify(updated));
    }
    return;
  }

  const userRef = doc(db, 'users', uid);
  await setDoc(
    userRef,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
