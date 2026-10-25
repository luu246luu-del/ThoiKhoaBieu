import { Timestamp } from 'firebase/firestore';

// ============================================
// CORE TYPES
// ============================================

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus =
  | 'inbox'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'postponed'
  | 'archived';

export type EventStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export type FocusMode = 'countdown' | 'stopwatch' | 'pomodoro' | 'deep_focus' | 'clock';

export type FocusSessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export type ReminderStatus = 'pending' | 'sent' | 'seen' | 'snoozed' | 'dismissed' | 'cancelled';

export type GoalStatus = 'active' | 'completed' | 'archived';

export type ThemeMode = 'dark' | 'light' | 'system';

// ============================================
// CATEGORY SYSTEM
// ============================================

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isDefault?: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'engineer', name: 'Process Engineer', color: 'hsl(245, 86%, 63%)', icon: 'cpu', isDefault: true },
  { id: 'korean', name: 'Tiếng Hàn', color: 'hsl(340, 65%, 65%)', icon: 'languages', isDefault: true },
  { id: 'english', name: 'Tiếng Anh', color: 'hsl(210, 80%, 60%)', icon: 'book-open', isDefault: true },
  { id: 'university', name: 'Đại học', color: 'hsl(38, 90%, 65%)', icon: 'graduation-cap', isDefault: true },
  { id: 'personal', name: 'Cá nhân', color: 'hsl(162, 62%, 55%)', icon: 'user', isDefault: true },
  { id: 'rest', name: 'Nghỉ ngơi', color: 'hsl(215, 16%, 47%)', icon: 'moon', isDefault: true },
];

// ============================================
// USER & AUTH
// ============================================

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  timezone: string;
  locale: string;
  theme: ThemeMode;
  linkedProviders: string[];
  pomodoroSettings: PomodoroSettings;
  quietHours: QuietHours;
  weeklyGoals: Record<string, number>; // categoryId -> minutes
  categories: Category[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: true,
  start: '23:00',
  end: '06:00',
};

export const DEFAULT_WEEKLY_GOALS: Record<string, number> = {
  engineer: 450,  // 7.5 hours
  korean: 360,    // 6 hours
  english: 240,   // 4 hours
};

// ============================================
// TASKS
// ============================================

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RescheduleRecord {
  from: string; // ISO date
  to: string;   // ISO date
  reason?: string;
  timestamp: Timestamp;
}

export interface ScheduledSession {
  id: string;
  eventId?: string;
  date: string;        // ISO date YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  plannedMinutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled';
  actualFocusSeconds: number;
  focusSessionId?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  projectId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes?: number;
  actualFocusSeconds: number;
  progress: number; // 0-100
  deadline?: Timestamp;
  scheduledSessions: ScheduledSession[];
  subtasks: Subtask[];
  links: string[];
  reminderSettings?: ReminderSettings;
  rescheduleHistory: RescheduleRecord[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// ============================================
// CALENDAR EVENTS
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  taskId?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  isAllDay: boolean;
  isFixed: boolean;
  color: string;
  recurringRuleId?: string;
  isRecurringException: boolean;
  originalDate?: string; // ISO date for recurring exception
  status: EventStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// RECURRING RULES
// ============================================

export interface RecurringException {
  date: string; // YYYY-MM-DD
  action: 'skip' | 'modified';
  modifications?: Partial<{
    title: string;
    startTime: string;
    endTime: string;
    categoryId: string;
  }>;
}

export interface RecurringRule {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  interval: number;       // every N days/weeks/months
  dayOfMonth?: number;    // for monthly
  startDate: string;      // ISO date
  endDate?: string;       // ISO date
  color: string;
  isFixed: boolean;
  exceptions: RecurringException[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// FOCUS SESSIONS
// ============================================

export interface TimerSegment {
  start: number;   // unix ms
  end?: number;     // unix ms
  type: 'focus' | 'pause' | 'break';
}

export interface FocusSession {
  id: string;
  taskId?: string;
  categoryId: string;
  mode: FocusMode;
  plannedDurationMs?: number;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  actualFocusMs: number;
  totalPausedMs: number;
  segments: TimerSegment[];
  status: FocusSessionStatus;
  deviceId?: string;
  notes?: string;
  endReason?: string;
  pomodoroCount?: number;
  createdAt: Timestamp;
}

// ============================================
// REMINDERS
// ============================================

export interface ReminderSettings {
  beforeMinutes: number[]; // e.g. [5, 15, 30]
  atStart: boolean;
  atEnd: boolean;
  atDeadline: boolean;
  soundEnabled: boolean;
}

export interface Reminder {
  id: string;
  taskId?: string;
  eventId?: string;
  title: string;
  message?: string;
  triggerAt: Timestamp;
  type: 'before_start' | 'at_start' | 'at_end' | 'deadline' | 'daily_review' | 'overdue' | 'custom';
  status: ReminderStatus;
  snoozeCount: number;
  snoozedUntil?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// GOALS & ROADMAP
// ============================================

export interface Goal {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  deadline?: Timestamp;
  progress: number;
  status: GoalStatus;
  projectIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Project {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  deadline?: Timestamp;
  progress: number;
  status: GoalStatus;
  moduleIds: string[];
  milestones: Milestone[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Milestone {
  id: string;
  title: string;
  deadline?: Timestamp;
  completed: boolean;
  completedAt?: Timestamp;
}

export interface LearningModule {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  order: number;
  progress: number;
  lessonIds: string[];
  createdAt: Timestamp;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  order: number;
  estimatedMinutes?: number;
  completed: boolean;
  completedAt?: Timestamp;
  taskId?: string; // linked task
  resources: string[];
}

// ============================================
// HABITS
// ============================================

export interface Habit {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  frequency: 'daily' | 'weekly';
  target: {
    type: 'boolean' | 'count' | 'duration';
    value: number; // 1 for boolean, count for count, minutes for duration
  };
  currentStreak: number;
  longestStreak: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number;
  isRestDay: boolean;
  note?: string;
  createdAt: Timestamp;
}

// ============================================
// DAILY REVIEW / JOURNAL
// ============================================

export interface DailyReview {
  id: string; // YYYY-MM-DD
  date: string;
  completedTaskIds: string[];
  unfinishedTaskIds: string[];
  completedSummary?: string;
  unfinishedReasons?: string;
  tomorrowPriorities?: string;
  focusRating?: number; // 1-5
  notes?: string;
  totalFocusMinutes: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// NOTIFICATION DEVICES
// ============================================

export interface NotificationDevice {
  id: string;
  fcmToken: string;
  deviceName?: string;
  platform: string;
  lastActiveAt: Timestamp;
  createdAt: Timestamp;
}
