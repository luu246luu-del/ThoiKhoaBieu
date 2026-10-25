import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { UserProfile, ThemeMode } from '@/types';
import { safeStorage } from '@/lib/storage';
import {
  onAuthChange,
  getUserProfile,
  loginWithUsername,
  registerWithUsername,
  signOut as firebaseSignOut,
  signInWithGoogle,
  type RegisterData,
  NeedsUsernameError,
  completeGoogleSignUp,
  startDemoSession,
  isDemoSession,
} from '@/services/firebase';

// ============================================
// AUTH STORE
// ============================================

interface AuthState {
  // State
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  needsUsername: boolean;
  pendingGoogleUser: User | null;
  isDemo: boolean;

  // Actions
  initialize: () => () => void;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithDemo: () => void;
  finishGoogleSignUp: (username: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,
  needsUsername: false,
  pendingGoogleUser: null,
  isDemo: false,

  // Initialize auth listener
  initialize: () => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          set({
            user,
            profile,
            isDemo: isDemoSession(),
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        } catch {
          set({
            user,
            profile: null,
            isDemo: isDemoSession(),
            isLoading: false,
            isInitialized: true,
          });
        }
      } else {
        set({
          user: null,
          profile: null,
          isDemo: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    });
    return unsubscribe;
  },

  // Login with username and password
  login: async (username, password, rememberMe = true) => {
    set({ isLoading: true, error: null });
    try {
      await loginWithUsername(username, password, rememberMe);
    } catch (error) {
      const message = getFirebaseErrorMessage(error);
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Register a new account
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await registerWithUsername(data);
    } catch (error) {
      const message = getFirebaseErrorMessage(error);
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Google Login
  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof NeedsUsernameError) {
        set({
          isLoading: false,
          needsUsername: true,
          pendingGoogleUser: error.user,
        });
        return;
      }
      const message = getFirebaseErrorMessage(error);
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Demo Login (for preview and evaluation without Firebase credentials)
  loginWithDemo: () => {
    set({ isLoading: true, error: null });
    const user = startDemoSession();
    getUserProfile(user.uid).then((profile) => {
      set({
        user,
        profile,
        isDemo: true,
        isLoading: false,
        error: null,
      });
    });
  },

  // Complete Google sign up with unique username
  finishGoogleSignUp: async (username, displayName) => {
    const { pendingGoogleUser } = get();
    if (!pendingGoogleUser) throw new Error('Không tìm thấy tài khoản Google đang chờ');

    set({ isLoading: true, error: null });
    try {
      await completeGoogleSignUp(pendingGoogleUser, username, displayName);
      const profile = await getUserProfile(pendingGoogleUser.uid);
      set({
        user: pendingGoogleUser,
        profile,
        isLoading: false,
        needsUsername: false,
        pendingGoogleUser: null,
      });
    } catch (error) {
      const message = getFirebaseErrorMessage(error);
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });
    try {
      await firebaseSignOut();
      set({
        user: null,
        profile: null,
        isDemo: false,
        isLoading: false,
        needsUsername: false,
        pendingGoogleUser: null,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await getUserProfile(user.uid);
    set({ profile });
  },

  clearError: () => set({ error: null }),
}));

// ============================================
// THEME STORE
// ============================================

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved = (safeStorage.getItem('studyflow-theme') as ThemeMode) || 'dark';
  const resolved = resolveTheme(saved);

  if (typeof document !== 'undefined') {
    applyTheme(resolved);
  }

  return {
    theme: saved,
    resolvedTheme: resolved,
    setTheme: (theme) => {
      const resolved = resolveTheme(theme);
      safeStorage.setItem('studyflow-theme', theme);
      applyTheme(resolved);
      set({ theme, resolvedTheme: resolved });
    },
  };
});

// ============================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================

function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('chưa kết nối Firebase') || msg.includes('chưa được liên kết Firebase')) {
      return msg;
    }
    if (msg.includes('Tên đăng nhập đã được sử dụng')) return msg;
    if (msg.includes('Tên đăng nhập phải có ít nhất')) return msg;
    if (msg.includes('Mật khẩu phải có ít nhất')) return msg;

    const code = (error as { code?: string }).code;
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Tên đăng nhập này đã có người sử dụng. Hãy chọn tên khác.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
      case 'auth/too-many-requests':
        return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau vài phút.';
      case 'auth/weak-password':
        return 'Mật khẩu quá ngắn hoặc yếu. Sử dụng tối thiểu 6 ký tự.';
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.';
      case 'auth/popup-closed-by-user':
        return 'Cửa sổ xác thực đã bị đóng trước khi hoàn tất.';
      default:
        return msg || 'Đã xảy ra lỗi trong quá trình xác thực.';
    }
  }
  return 'Lỗi xác thực không xác định.';
}
