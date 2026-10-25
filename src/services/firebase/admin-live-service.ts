import {
  collection, limit, onSnapshot, query, Timestamp,
  type DocumentData, type QueryDocumentSnapshot, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';

/**
 * VanTien Admin (Spark): lấy dữ liệu thật bằng listener Firestore.
 * Giới hạn số hồ sơ/bản ghi để tránh tiêu thụ quota không kiểm soát.
 * Khi vượt giới hạn, UI phải thông báo số liệu chưa đầy đủ.
 */
export const ADMIN_MAX_USERS = 30;
export const ADMIN_MAX_ROWS = 500;

export const ACTIVITY_COLLECTIONS = [
  'tasks', 'calendarEvents', 'focusSessions', 'habits', 'habitLogs',
  'dailyReviews', 'projects', 'goals', 'learningModules', 'lessons',
  'recurringRules', 'reminders', 'notificationDevices',
] as const;
export type ActivityCollection = typeof ACTIVITY_COLLECTIONS[number];

export interface LiveUserProfile {
  uid: string;
  username: string;
  displayName: string;
  createdAt: number | null;
  updatedAt: number | null;
  timezone: string;
  locale: string;
  theme: string;
  categories: { id: string; name: string }[];
}
export type ActivityRow = Record<string, unknown>;
export type ActivityRows = Partial<Record<ActivityCollection, ActivityRow[]>>;
export interface LiveUserUsage {
  uid: string;
  loaded: number;
  errorKeys: ActivityCollection[];
  truncatedKeys: ActivityCollection[];
  counts: Partial<Record<ActivityCollection, number>>;
  tasksCompleted: number;
  tasksOverdue: number;
  tasksRescheduled: number;
  focusCompleted: number;
  focusMs: number;
  focusByCategory: Record<string, number>;
  focusDailyMs: Record<string, number>;
  habitsChecked: number;
  latestSavedAt: number | null;
  roadmapProjects: number;
  roadmapModules: number;
  roadmapSteps: number;
  roadmapStepsDone: number;
}

function toMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}
function safeString(value: unknown): string { return typeof value === 'string' ? value : ''; }
function isRecord(value: unknown): value is ActivityRow {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function dayInVietnam(ms: number): string {
  return new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
}
export function mapLiveProfile(uid: string, row: DocumentData): LiveUserProfile {
  return {
    uid,
    username: safeString(row.username),
    displayName: safeString(row.displayName),
    createdAt: toMs(row.createdAt),
    updatedAt: toMs(row.updatedAt),
    timezone: safeString(row.timezone),
    locale: safeString(row.locale),
    theme: safeString(row.theme),
    categories: Array.isArray(row.categories) ? row.categories
      .filter(isRecord)
      .map(item => ({ id: safeString(item.id), name: safeString(item.name) })) : [],
  };
}

export function summarizeActivity(
  uid: string,
  rows: ActivityRows,
  loadedKeys: ReadonlySet<ActivityCollection>,
  errorKeys: ActivityCollection[],
  truncatedKeys: ActivityCollection[],
): LiveUserUsage {
  const counts: Partial<Record<ActivityCollection, number>> = {};
  for (const key of ACTIVITY_COLLECTIONS) {
    if (loadedKeys.has(key) && !errorKeys.includes(key)) counts[key] = rows[key]?.length ?? 0;
  }
  const tasks = rows.tasks ?? [];
  const sessions = rows.focusSessions ?? [];
  const goals = rows.goals ?? [];
  const now = Date.now();
  const focusByCategory: Record<string, number> = {};
  const focusDailyMs: Record<string, number> = {};
  let focusMs = 0;
  let focusCompleted = 0;
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const duration = typeof session.actualFocusMs === 'number' ? session.actualFocusMs : 0;
    if (!Number.isFinite(duration) || duration < 0) continue;
    focusCompleted++;
    focusMs += duration;
    const key = safeString(session.categoryId) || 'other';
    focusByCategory[key] = (focusByCategory[key] ?? 0) + duration;
    const stamp = toMs(session.endedAt) ?? toMs(session.startedAt);
    if (stamp !== null) {
      const day = dayInVietnam(stamp);
      focusDailyMs[day] = (focusDailyMs[day] ?? 0) + duration;
    }
  }
  // Moc cap nhat gan nhat chi la thoi gian luu du lieu, khong phai lan dang nhap.
  let latestSavedAt: number | null = null;
  for (const key of ACTIVITY_COLLECTIONS) {
    for (const record of rows[key] ?? []) {
      const stamp = toMs(record.updatedAt) ?? toMs(record.createdAt)
        ?? toMs(record.endedAt) ?? toMs(record.startedAt);
      if (stamp !== null && (latestSavedAt === null || stamp > latestSavedAt)) latestSavedAt = stamp;
    }
  }
  let roadmapProjects = 0;
  let roadmapModules = 0;
  let roadmapSteps = 0;
  let roadmapStepsDone = 0;
  for (const goal of goals) {
    if (goal.kind !== 'vantien-roadmap-v2' || !Array.isArray(goal.projects)) continue;
    for (const project of goal.projects) {
      if (!isRecord(project)) continue;
      roadmapProjects++;
      if (!Array.isArray(project.modules)) continue;
      for (const mod of project.modules) {
        if (!isRecord(mod)) continue;
        roadmapModules++;
        if (!Array.isArray(mod.steps)) continue;
        for (const step of mod.steps) {
          if (!isRecord(step)) continue;
          roadmapSteps++;
          if (step.completed === true) roadmapStepsDone++;
        }
      }
    }
  }
  return {
    uid,
    loaded: loadedKeys.size,
    errorKeys,
    truncatedKeys,
    counts,
    tasksCompleted: tasks.filter(t => t.status === 'completed').length,
    tasksOverdue: tasks.filter(t => t.status !== 'completed' && t.status !== 'archived' && (toMs(t.deadline) ?? Infinity) < now).length,
    tasksRescheduled: tasks.filter(t => Array.isArray(t.rescheduleHistory) && t.rescheduleHistory.length > 0).length,
    focusCompleted,
    focusMs,
    focusByCategory,
    focusDailyMs,
    habitsChecked: (rows.habitLogs ?? []).filter(row => row.completed === true).length,
    latestSavedAt,
    roadmapProjects,
    roadmapModules,
    roadmapSteps,
    roadmapStepsDone,
  };
}

export function subscribeAdminProfiles(
  onChange: (users: LiveUserProfile[], truncated: boolean) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, 'users'), limit(ADMIN_MAX_USERS + 1)), snapshot => {
    onChange(snapshot.docs.slice(0, ADMIN_MAX_USERS).map(s => mapLiveProfile(s.id, s.data())), snapshot.size > ADMIN_MAX_USERS);
  }, onError);
}

/**
 * Snapshot từng phân hệ của một người dùng. Listener được dọn khi Admin rời trang.
 * Không lấy metadata nhạy cảm ngoài các trường thống kê cần thiết.
 */
export function subscribeUserActivity(
  uid: string,
  onChange: (usage: LiveUserUsage) => void,
): Unsubscribe {
  const rows: ActivityRows = {};
  const loaded = new Set<ActivityCollection>();
  const failures = new Set<ActivityCollection>();
  const truncated = new Set<ActivityCollection>();
  const emit = () => onChange(summarizeActivity(uid, rows, loaded, [...failures], [...truncated]));
  const unsubscribes = ACTIVITY_COLLECTIONS.map(key => {
    const q = query(collection(db, 'users', uid, key), limit(ADMIN_MAX_ROWS + 1));
    return onSnapshot(q, snapshot => {
      loaded.add(key);
      failures.delete(key);
      if (snapshot.size > ADMIN_MAX_ROWS) truncated.add(key);
      else truncated.delete(key);
      rows[key] = snapshot.docs.slice(0, ADMIN_MAX_ROWS).map((s: QueryDocumentSnapshot) => s.data());
      emit();
    }, () => {
      loaded.add(key);
      failures.add(key);
      rows[key] = [];
      emit();
    });
  });
  return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}

export function dateText(ms: number | null): string {
  return ms === null ? 'Chưa có' : new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
  });
}
