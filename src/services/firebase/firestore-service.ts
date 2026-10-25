import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { isDemoSession } from './auth-service';
import { safeStorage } from '@/lib/storage';
import type {
  Task,
  CalendarEvent,
  FocusSession,
  Habit,
  HabitLog,
  DailyReview,
  Project,
} from '@/types';

// ============================================
// LOCAL STORAGE PERSISTENCE HELPER (FOR DEMO/OFFLINE)
// ============================================

function getLocalKey(uid: string, entity: string) {
  return `studyflow_${uid}_${entity}`;
}

function getLocalData<T>(uid: string, entity: string, defaultValue: T): T {
  const raw = safeStorage.getItem(getLocalKey(uid, entity));
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw, (_key, value: unknown) => {
      if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value &&
          typeof (value as {seconds: unknown}).seconds === 'number' &&
          typeof (value as {nanoseconds: unknown}).nanoseconds === 'number' &&
          Object.keys(value).every(k => k === 'seconds' || k === 'nanoseconds' || (k === 'type' && (value as {type?: string}).type === 'firestore/timestamp/1.0'))) {
        const t = value as {seconds: number; nanoseconds: number};
        return new Timestamp(t.seconds, t.nanoseconds);
      }
      return value;
    }) as T;
  } catch {
    return defaultValue;
  }
}

function setLocalData<T>(uid: string, entity: string, data: T): void {
  safeStorage.setItem(getLocalKey(uid, entity), JSON.stringify(data));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('studyflow-local-change', {detail: {uid, entity}}));
}

// ============================================
// TASKS SERVICE
// ============================================

export const taskService = {
  async getTasks(uid: string): Promise<Task[]> {
    if (isDemoSession() || !isFirebaseConfigured) {
      return getLocalData<Task[]>(uid, 'tasks', []);
    }

    const tasksRef = collection(db, 'users', uid, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Task));
  },

  async saveTask(uid: string, task: Task): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const tasks = getLocalData<Task[]>(uid, 'tasks', []);
      const index = tasks.findIndex((t) => t.id === task.id);
      if (index >= 0) {
        tasks[index] = { ...task, updatedAt: Timestamp.now() };
      } else {
        tasks.unshift({ ...task, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      }
      setLocalData(uid, 'tasks', tasks);
      return;
    }

    const taskRef = doc(db, 'users', uid, 'tasks', task.id);
    await setDoc(taskRef, {
      ...task,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async deleteTask(uid: string, taskId: string): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const tasks = getLocalData<Task[]>(uid, 'tasks', []);
      setLocalData(uid, 'tasks', tasks.filter((t) => t.id !== taskId));
      return;
    }

    const taskRef = doc(db, 'users', uid, 'tasks', taskId);
    await deleteDoc(taskRef);
  },

  subscribe(uid: string, callback: (tasks: Task[]) => void): Unsubscribe {
    if (isDemoSession() || !isFirebaseConfigured) {
      const tasks = getLocalData<Task[]>(uid, 'tasks', []);
      callback(tasks);
      return () => {};
    }

    const tasksRef = collection(db, 'users', uid, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Task));
      callback(tasks);
    });
  },
};

// ============================================
// CALENDAR EVENTS SERVICE
// ============================================

export const eventService = {
  async getEvents(uid: string): Promise<CalendarEvent[]> {
    if (isDemoSession() || !isFirebaseConfigured) {
      return getLocalData<CalendarEvent[]>(uid, 'events', []);
    }

    const eventsRef = collection(db, 'users', uid, 'calendarEvents');
    const q = query(eventsRef, orderBy('startTime', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CalendarEvent));
  },

  async saveEvent(uid: string, event: CalendarEvent): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const events = getLocalData<CalendarEvent[]>(uid, 'events', []);
      const index = events.findIndex((e) => e.id === event.id);
      if (index >= 0) {
        events[index] = { ...event, updatedAt: Timestamp.now() };
      } else {
        events.push({ ...event, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      }
      setLocalData(uid, 'events', events);
      return;
    }

    const eventRef = doc(db, 'users', uid, 'calendarEvents', event.id);
    await setDoc(eventRef, {
      ...event,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async deleteEvent(uid: string, eventId: string): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const events = getLocalData<CalendarEvent[]>(uid, 'events', []);
      setLocalData(uid, 'events', events.filter((e) => e.id !== eventId));
      return;
    }

    const eventRef = doc(db, 'users', uid, 'calendarEvents', eventId);
    await deleteDoc(eventRef);
  },

  subscribe(uid: string, callback: (events: CalendarEvent[]) => void): Unsubscribe {
    if (isDemoSession() || !isFirebaseConfigured) {
      const events = getLocalData<CalendarEvent[]>(uid, 'events', []);
      callback(events);
      return () => {};
    }

    const eventsRef = collection(db, 'users', uid, 'calendarEvents');
    const q = query(eventsRef, orderBy('startTime', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CalendarEvent));
      callback(events);
    });
  },
};

// ============================================
// FOCUS SESSIONS SERVICE
// ============================================

export const focusService = {
  async getSessions(uid: string): Promise<FocusSession[]> {
    if (isDemoSession() || !isFirebaseConfigured) {
      return getLocalData<FocusSession[]>(uid, 'focus_sessions', []);
    }

    const sessionsRef = collection(db, 'users', uid, 'focusSessions');
    const q = query(sessionsRef, orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FocusSession));
  },

  async saveSession(uid: string, session: FocusSession): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const sessions = getLocalData<FocusSession[]>(uid, 'focus_sessions', []);
      const index = sessions.findIndex(s => s.id === session.id);
      if (index >= 0) sessions[index] = session;
      else sessions.unshift(session);
      setLocalData(uid, 'focus_sessions', sessions);
      return;
    }

    const sessionRef = doc(db, 'users', uid, 'focusSessions', session.id);
    await setDoc(sessionRef, {
      ...session,
      createdAt: serverTimestamp(),
    });
  },

  subscribe(uid: string, callback: (sessions: FocusSession[]) => void): Unsubscribe {
    if (isDemoSession() || !isFirebaseConfigured) {
      const sessions = getLocalData<FocusSession[]>(uid, 'focus_sessions', []);
      callback(sessions);
      return () => {};
    }

    const sessionsRef = collection(db, 'users', uid, 'focusSessions');
    const q = query(sessionsRef, orderBy('startedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FocusSession));
      callback(sessions);
    });
  },
};

// Cross-collection mutations are atomic in Firestore. Demo uses synchronous local writes.
export const atomicService = {
  async saveTaskAndEvent(uid: string, task: Task, event: CalendarEvent): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      await taskService.saveTask(uid, task);
      await eventService.saveEvent(uid, event);
      return;
    }
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'tasks', task.id), task);
    batch.set(doc(db, 'users', uid, 'calendarEvents', event.id), event);
    await batch.commit();
  },
  async saveTaskAndEvents(uid: string, task: Task, events: CalendarEvent[]): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      await taskService.saveTask(uid, task);
      for (const ev of events) await eventService.saveEvent(uid, ev);
      return;
    }
    const batch=writeBatch(db);
    batch.set(doc(db,'users',uid,'tasks',task.id),task);
    for (const ev of events) batch.set(doc(db,'users',uid,'calendarEvents',ev.id),ev);
    await batch.commit();
  },
  async deleteTaskAndEvents(uid: string, taskId: string, events: CalendarEvent[]): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      await taskService.deleteTask(uid, taskId);
      for (const event of events) await eventService.deleteEvent(uid, event.id);
      return;
    }
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid, 'tasks', taskId));
    for (const event of events) batch.delete(doc(db, 'users', uid, 'calendarEvents', event.id));
    await batch.commit();
  },
  async recordFocus(uid: string, session: FocusSession): Promise<boolean> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const list = getLocalData<FocusSession[]>(uid, 'focus_sessions', []);
      if (list.some(entry => entry.id === session.id)) return false;
      list.unshift(session);
      setLocalData(uid, 'focus_sessions', list);
      return true;
    }
    const ref = doc(db, 'users', uid, 'focusSessions', session.id);
    return runTransaction(db, async tx => {
      if ((await tx.get(ref)).exists()) return false;
      tx.set(ref, session);
      return true;
    });
  },
};

// ============================================
// HABITS SERVICE
// ============================================

export const habitService = {
  async getHabits(uid: string): Promise<Habit[]> {
    if (isDemoSession() || !isFirebaseConfigured) {
      return getLocalData<Habit[]>(uid, 'habits', []);
    }

    const habitsRef = collection(db, 'users', uid, 'habits');
    const snapshot = await getDocs(habitsRef);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Habit));
  },

  async saveHabit(uid: string, habit: Habit): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const habits = getLocalData<Habit[]>(uid, 'habits', []);
      const index = habits.findIndex((h) => h.id === habit.id);
      if (index >= 0) {
        habits[index] = { ...habit, updatedAt: Timestamp.now() };
      } else {
        habits.push({ ...habit, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      }
      setLocalData(uid, 'habits', habits);
      return;
    }

    const habitRef = doc(db, 'users', uid, 'habits', habit.id);
    await setDoc(habitRef, {
      ...habit,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async saveHabitAndLog(uid: string, habit: Habit, log: HabitLog): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      await this.saveHabit(uid,habit);
      await this.saveLog(uid,log);
      return;
    }
    const batch=writeBatch(db);
    batch.set(doc(db,'users',uid,'habits',habit.id),habit);
    batch.set(doc(db,'users',uid,'habitLogs',log.id),log);
    await batch.commit();
  },

  async getLogs(uid: string, habitId: string): Promise<HabitLog[]> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const logs = getLocalData<HabitLog[]>(uid, 'habit_logs', []);
      return logs.filter((l) => l.habitId === habitId);
    }

    const logsRef = collection(db, 'users', uid, 'habitLogs');
    const q = query(logsRef, where('habitId', '==', habitId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as HabitLog));
  },

  async saveLog(uid: string, log: HabitLog): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const logs = getLocalData<HabitLog[]>(uid, 'habit_logs', []);
      const index = logs.findIndex((l) => l.habitId === log.habitId && l.date === log.date);
      if (index >= 0) {
        logs[index] = log;
      } else {
        logs.push({ ...log, createdAt: Timestamp.now() });
      }
      setLocalData(uid, 'habit_logs', logs);
      return;
    }

    const logRef = doc(db, 'users', uid, 'habitLogs', log.id);
    await setDoc(logRef, {
      ...log,
      createdAt: serverTimestamp(),
    }, { merge: true });
  },
};

// ============================================
// DAILY REVIEW / JOURNAL SERVICE
// ============================================

export const journalService = {
  async getReview(uid: string, date: string): Promise<DailyReview | null> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const reviews = getLocalData<Record<string, DailyReview>>(uid, 'daily_reviews', {});
      return reviews[date] || null;
    }

    const reviewRef = doc(db, 'users', uid, 'dailyReviews', date);
    const docSnap = await getDoc(reviewRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as DailyReview;
  },

  async saveReview(uid: string, review: DailyReview): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const reviews = getLocalData<Record<string, DailyReview>>(uid, 'daily_reviews', {});
      reviews[review.date] = { ...review, updatedAt: Timestamp.now() };
      setLocalData(uid, 'daily_reviews', reviews);
      return;
    }

    const reviewRef = doc(db, 'users', uid, 'dailyReviews', review.date);
    await setDoc(reviewRef, {
      ...review,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },
};

// ============================================
// ROADMAP / PROJECTS SERVICE
// ============================================

export const roadmapService = {
  async getProjects(uid: string): Promise<Project[]> {
    if (isDemoSession() || !isFirebaseConfigured) {
      return getLocalData<Project[]>(uid, 'projects', []);
    }

    const projectsRef = collection(db, 'users', uid, 'projects');
    const snapshot = await getDocs(projectsRef);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Project));
  },

  async saveProject(uid: string, project: Project): Promise<void> {
    if (isDemoSession() || !isFirebaseConfigured) {
      const projects = getLocalData<Project[]>(uid, 'projects', []);
      const index = projects.findIndex((p) => p.id === project.id);
      if (index >= 0) {
        projects[index] = { ...project, updatedAt: Timestamp.now() };
      } else {
        projects.push({ ...project, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      }
      setLocalData(uid, 'projects', projects);
      return;
    }

    const projectRef = doc(db, 'users', uid, 'projects', project.id);
    await setDoc(projectRef, {
      ...project,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },
};
