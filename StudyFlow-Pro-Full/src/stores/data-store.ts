import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { localDay, dayPlus, parseSlot, slotEnd, hourMinute, hasOverlap } from '@/lib/schedule';
import type {
  Task,
  CalendarEvent,
  FocusSession,
  Habit,
  DailyReview,
  ScheduledSession,
  Subtask,
} from '@/types';
import {
  taskService,
  eventService,
  focusService,
  habitService,
  journalService,
  atomicService,
} from '@/services/firebase/firestore-service';

interface DataState {
  tasks: Task[];
  events: CalendarEvent[];
  focusSessions: FocusSession[];
  habits: Habit[];
  dailyReviews: Record<string, DailyReview>;
  isLoading: boolean;
  activeUid: string | null;

  // Actions
  initializeUserData: (uid: string) => Promise<void>;
  clearData: () => void;

  // Task CRUD
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'actualFocusSeconds' | 'rescheduleHistory' | 'scheduledSessions' | 'progress' | 'subtasks' | 'links'> & {
    progress?: number;
    subtasks?: Subtask[];
    links?: string[];
    plannedMinutes?: number;
    timeSlot?: string;
    date?: string;
  }) => Promise<Task>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskComplete: (taskId: string) => Promise<void>;

  // Smart Reschedule
  rescheduleTask: (taskId: string, targetDate: string, targetTime: string, reason: string) => Promise<void>;
  splitTask: (taskId: string, date: string, time: string) => Promise<void>;

  // Calendar CRUD
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;

  // Focus Session
  recordFocusSession: (session: Omit<FocusSession, 'id' | 'createdAt'> & { id?: string }) => Promise<FocusSession>;

  // Habits
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'currentStreak' | 'longestStreak'>) => Promise<void>;
  toggleHabit: (habitId: string) => Promise<void>;

  // Journal
  saveReview: (review: DailyReview) => Promise<void>;

  // Template Seeder
  seedDefaultUserData: () => Promise<void>;
}

const dataUnsubscribers: Array<() => void> = [];
function stopDataListeners() {
  while (dataUnsubscribers.length) dataUnsubscribers.pop()?.();
}
function recalcFocusTotals(tasks: Task[], sessions: FocusSession[]): Task[] {
  const byTask = new Map<string, number>();
  for(const s of sessions) {
    if(s.taskId && s.status==='completed') byTask.set(s.taskId,(byTask.get(s.taskId)||0)+Math.floor(s.actualFocusMs/1000));
  }
  return tasks.map(t=>({...t,actualFocusSeconds:byTask.get(t.id)||0}));
}

export const useDataStore = create<DataState>((set, get) => ({
  tasks: [],
  events: [],
  focusSessions: [],
  habits: [],
  dailyReviews: {},
  isLoading: false,
  activeUid: null,

  initializeUserData: async (uid: string) => {
    if (get().activeUid === uid && !get().isLoading) return;
    stopDataListeners();
    set({ isLoading: true, activeUid: uid });
    try {
      const [tasks, events, focusSessions, habits] = await Promise.all([
        taskService.getTasks(uid),
        eventService.getEvents(uid),
        focusService.getSessions(uid),
        habitService.getHabits(uid),
      ]);

      // New accounts must start empty. Templates are never imported automatically.
      if (get().activeUid !== uid) return;
      set({ tasks: recalcFocusTotals(tasks,focusSessions), events, focusSessions, habits, isLoading: false });
      // Real-time Firestore listeners keep laptop/mobile synchronized under one UID.
      const updateTasks = (nextTasks: Task[]) => {
        if(get().activeUid !== uid) return;
        set({tasks:recalcFocusTotals(nextTasks,get().focusSessions)});
      };
      const updateFocus = (nextFocus: FocusSession[]) => {
        if(get().activeUid !== uid) return;
        set({focusSessions:nextFocus,tasks:recalcFocusTotals(get().tasks,nextFocus)});
      };
      dataUnsubscribers.push(taskService.subscribe(uid,updateTasks));
      dataUnsubscribers.push(eventService.subscribe(uid,nextEvents=>{if(get().activeUid===uid)set({events:nextEvents});}));
      dataUnsubscribers.push(focusService.subscribe(uid,updateFocus));
      // Guest persistence: react to writes in another browser tab on this origin.
      if(typeof window !== 'undefined'){
        const syncLocal = async (event: StorageEvent) => {
          if(!event.key?.startsWith(`studyflow_${uid}_`))return;
          const [newTasks,newEvents,newSessions] = await Promise.all([
            taskService.getTasks(uid),eventService.getEvents(uid),focusService.getSessions(uid),
          ]);
          if(get().activeUid===uid)set({tasks:recalcFocusTotals(newTasks,newSessions),events:newEvents,focusSessions:newSessions});
        };
        window.addEventListener('storage',syncLocal);
        dataUnsubscribers.push(()=>window.removeEventListener('storage',syncLocal));
      }
    } catch (error) {
      console.error('Failed to initialize user data:', error);
      set({ isLoading: false });
    }
  },

  clearData: () => {
    stopDataListeners();
    set({
      tasks: [],
      events: [],
      focusSessions: [],
      habits: [],
      dailyReviews: {},
      activeUid: null,
      isLoading: false,
    });
  },

  addTask: async (data) => {
    const { activeUid, tasks, events } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Timestamp.now();
    const today = localDay();

    const scheduledDate = data.date || today;
    const scheduledSessions: ScheduledSession[] = [];

    // Inbox tasks remain unscheduled until user chooses a date/time.
    if (data.plannedMinutes && (data.date || data.timeSlot)) {
      scheduledSessions.push({
        id: `session_${Date.now()}`,
        date: scheduledDate,
        startTime: data.timeSlot?.split('–')[0]?.trim() || '08:00',
        endTime: data.timeSlot?.split('–')[1]?.trim() || hourMinute(slotEnd(parseSlot(scheduledDate, data.timeSlot?.split('–')[0]?.trim() || '08:00'), data.plannedMinutes)),
        plannedMinutes: data.plannedMinutes,
        status: 'scheduled',
        actualFocusSeconds: 0,
      });
    }

    const newTask: Task = {
      id: taskId,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      projectId: data.projectId,
      priority: data.priority,
      status: data.status,
      estimatedMinutes: data.estimatedMinutes || data.plannedMinutes || 45,
      actualFocusSeconds: 0,
      progress: data.progress || 0,
      deadline: data.deadline,
      scheduledSessions,
      subtasks: data.subtasks || [],
      links: data.links || [],
      rescheduleHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    // Save atomically with linked event (if scheduled).
    // Also create corresponding calendar event if scheduled
    if (scheduledSessions.length > 0 && scheduledSessions[0]) {
      const s = scheduledSessions[0];
      const startDate = parseSlot(s.date, s.startTime);
      const endDate = slotEnd(startDate, s.plannedMinutes);
      if (hasOverlap(startDate.getTime(), endDate.getTime(), events.map(e => ({
        start: e.startTime.toMillis(), end: e.endTime.toMillis(), id: e.id, status: e.status,
      })))) throw new Error('Lịch bị trùng giờ. Hãy chọn một khung giờ khác.');

      const newEvent: CalendarEvent = {
        id: `event_${taskId}`,
        title: newTask.title,
        categoryId: newTask.categoryId,
        taskId: newTask.id,
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        isAllDay: false,
        isFixed: newTask.categoryId === 'university',
        color: newTask.categoryId,
        isRecurringException: false,
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
      };

      await atomicService.saveTaskAndEvent(activeUid, newTask, newEvent);
      set({ tasks: [newTask, ...tasks], events: [...events, newEvent] });
    } else {
      await taskService.saveTask(activeUid, newTask);
      set({ tasks: [newTask, ...tasks] });
    }

    return newTask;
  },

  updateTask: async (task) => {
    const { activeUid, tasks } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    const updatedTask = { ...task, updatedAt: Timestamp.now() };
    await taskService.saveTask(activeUid, updatedTask);

    set({
      tasks: tasks.map((t) => (t.id === task.id ? updatedTask : t)),
    });
  },

  deleteTask: async (taskId) => {
    const { activeUid, tasks, events } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    await atomicService.deleteTaskAndEvents(activeUid, taskId, events.filter(e => e.taskId === taskId));

    set({
      tasks: tasks.filter((t) => t.id !== taskId),
      events: events.filter((e) => e.taskId !== taskId),
    });
  },

  toggleTaskComplete: async (taskId) => {
    const { activeUid, tasks, events } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    const isCompleted = currentTask.status === 'completed';
    const newStatus = isCompleted ? 'in_progress' : 'completed';
    const now = Timestamp.now();

    const updatedTask: Task = {
      ...currentTask,
      status: newStatus,
      progress: newStatus === 'completed' ? 100 : currentTask.progress,
      completedAt: newStatus === 'completed' ? now : undefined,
      updatedAt: now,
      subtasks: currentTask.subtasks.map((st) => ({
        ...st,
        completed: newStatus === 'completed',
      })),
    };

    // Update calendar event status
    const linkedEvent = events.find((e) => e.taskId === taskId);
    let updatedEvents = events;
    if (linkedEvent) {
      const updatedEvent = {
        ...linkedEvent,
        status: (newStatus === 'completed' ? 'completed' : 'scheduled') as CalendarEvent['status'],
        updatedAt: now,
      };
      await atomicService.saveTaskAndEvent(activeUid, updatedTask, updatedEvent);
      updatedEvents = events.map((e) => (e.id === linkedEvent.id ? updatedEvent : e));
    } else {
      await taskService.saveTask(activeUid, updatedTask);
    }

    set({
      tasks: tasks.map((t) => (t.id === taskId ? updatedTask : t)),
      events: updatedEvents,
    });
  },

  rescheduleTask: async (taskId, targetDate, targetTime, reason) => {
    const { activeUid, tasks, events } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask) throw new Error('Không tìm thấy nhiệm vụ');

    const now = Timestamp.now();
    const currentDateStr = currentTask.scheduledSessions?.[0]?.date || localDay();

    // Record history while STRICTLY PRESERVING original deadline
    const rescheduleRecord = {
      from: currentDateStr,
      to: targetDate,
      reason: reason || 'Smart Reschedule',
      timestamp: now,
    };

    const durationMin = Math.max(1, (currentTask.estimatedMinutes || 60) - Math.floor(currentTask.actualFocusSeconds / 60));
    const targetStart = parseSlot(targetDate, targetTime);
    const targetEnd = slotEnd(targetStart, durationMin);
    const linkedEvent = events.find(e => e.taskId === taskId);
    if (hasOverlap(targetStart.getTime(), targetEnd.getTime(), events.map(e => ({
      start: e.startTime.toMillis(), end: e.endTime.toMillis(), id: e.id, status: e.status,
    })), linkedEvent?.id)) throw new Error('Khung giờ đã có lịch khác. Vui lòng chọn giờ khác.');
    const endTimeStr = hourMinute(targetEnd);

    const newSession: ScheduledSession = {
      id: `session_${Date.now()}`,
      date: targetDate,
      startTime: targetTime,
      endTime: endTimeStr,
      plannedMinutes: durationMin,
      status: 'scheduled',
      actualFocusSeconds: 0,
    };

    const updatedTask: Task = {
      ...currentTask,
      status: 'planned',
      scheduledSessions: [newSession],
      rescheduleHistory: [...(currentTask.rescheduleHistory || []), rescheduleRecord],
      updatedAt: now,
      // DEADLINE GỐC ĐƯỢC GIỮ NGUYÊN: currentTask.deadline
    };

    // Update or create CalendarEvent
    let updatedEvents = events;
    const newCalendarEvent: CalendarEvent = {
      id: linkedEvent?.id || `event_${taskId}`,
      title: currentTask.title,
      categoryId: currentTask.categoryId,
      taskId: currentTask.id,
      startTime: Timestamp.fromDate(targetStart),
      endTime: Timestamp.fromDate(targetEnd),
      isAllDay: false,
      isFixed: currentTask.categoryId === 'university',
      color: currentTask.categoryId,
      isRecurringException: false,
      status: 'scheduled',
      createdAt: linkedEvent?.createdAt || now,
      updatedAt: now,
    };

    await atomicService.saveTaskAndEvent(activeUid, updatedTask, newCalendarEvent);
    if (linkedEvent) {
      updatedEvents = events.map((e) => (e.id === linkedEvent.id ? newCalendarEvent : e));
    } else {
      updatedEvents = [...events, newCalendarEvent];
    }

    set({
      tasks: tasks.map((t) => (t.id === taskId ? updatedTask : t)),
      events: updatedEvents,
    });
  },

  splitTask: async (taskId, date, time) => {
    const {activeUid,tasks,events} = get();
    if(!activeUid)throw new Error('Chưa đăng nhập');
    const task=tasks.find(t=>t.id===taskId);
    if(!task)throw new Error('Không tìm thấy nhiệm vụ');
    const remaining=Math.max(2,(task.estimatedMinutes||60)-Math.floor(task.actualFocusSeconds/60));
    const firstMinutes=Math.ceil(remaining/2), secondMinutes=remaining-firstMinutes;
    const nextDate=dayPlus(date,1);
    const start1=parseSlot(date,time), end1=slotEnd(start1,firstMinutes);
    const start2=parseSlot(nextDate,time), end2=slotEnd(start2,secondMinutes);
    const linked=events.filter(e=>e.taskId===taskId);
    const others=events.filter(e=>e.taskId!==taskId).map(e=>({id:e.id,start:e.startTime.toMillis(),end:e.endTime.toMillis(),status:e.status}));
    if(hasOverlap(start1.getTime(),end1.getTime(),others)||hasOverlap(start2.getTime(),end2.getTime(),others)){
      throw new Error('Có lịch khác trùng giờ; hãy chọn thời điểm khác');
    }
    const now=Timestamp.now();
    const sessions:ScheduledSession[]=[
      {id:crypto.randomUUID(),date,startTime:time,endTime:hourMinute(end1),plannedMinutes:firstMinutes,status:'scheduled',actualFocusSeconds:0},
      {id:crypto.randomUUID(),date:nextDate,startTime:time,endTime:hourMinute(end2),plannedMinutes:secondMinutes,status:'scheduled',actualFocusSeconds:0},
    ];
    const updated:Task={...task,status:'planned',scheduledSessions:sessions,
      rescheduleHistory:[...(task.rescheduleHistory||[]),{from:task.scheduledSessions?.[0]?.date||localDay(),to:date,reason:'Chia 2 phiên',timestamp:now}],updatedAt:now};
    const evList:CalendarEvent[]=sessions.map((session,i)=>({
      id:linked[i]?.id||`event_${taskId}_${i}_${crypto.randomUUID()}`,title:task.title,categoryId:task.categoryId,
      taskId,startTime:Timestamp.fromDate(i===0?start1:start2),endTime:Timestamp.fromDate(i===0?end1:end2),
      isAllDay:false,isFixed:task.categoryId==='university',color:task.categoryId,
      isRecurringException:false,status:'scheduled',createdAt:linked[i]?.createdAt||now,updatedAt:now,
    }));
    await atomicService.saveTaskAndEvents(activeUid,updated,evList);
    set({tasks:tasks.map(t=>t.id===taskId?updated:t),events:[...events.filter(e=>e.taskId!==taskId),...evList]});
  },

  addEvent: async (eventData) => {
    const { activeUid, events } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');
    if(hasOverlap(eventData.startTime.toMillis(),eventData.endTime.toMillis(),events.map(e=>({
      start:e.startTime.toMillis(),end:e.endTime.toMillis(),id:e.id,status:e.status,
    }))))throw new Error('Khung giờ bị trùng lịch.');

    const eventId = `event_${crypto.randomUUID()}`;
    const now = Timestamp.now();
    const newEvent: CalendarEvent = {
      ...eventData,
      id: eventId,
      createdAt: now,
      updatedAt: now,
    };

    await eventService.saveEvent(activeUid, newEvent);
    set({ events: [...events, newEvent] });
    return newEvent;
  },

  updateEvent: async (event) => {
    const { activeUid, events } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');
    if(hasOverlap(event.startTime.toMillis(),event.endTime.toMillis(),events.map(e=>({
      start:e.startTime.toMillis(),end:e.endTime.toMillis(),id:e.id,status:e.status,
    })),event.id))throw new Error('Khung giờ bị trùng lịch.');

    const updatedEvent = { ...event, updatedAt: Timestamp.now() };
    await eventService.saveEvent(activeUid, updatedEvent);
    set({ events: events.map((e) => (e.id === event.id ? updatedEvent : e)) });
  },

  deleteEvent: async (eventId) => {
    const { activeUid, events } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    await eventService.deleteEvent(activeUid, eventId);
    set({ events: events.filter((e) => e.id !== eventId) });
  },

  recordFocusSession: async (sessionData) => {
    const { activeUid, focusSessions, tasks } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    if (!Number.isFinite(sessionData.actualFocusMs) || sessionData.actualFocusMs < 0) throw new Error('Thời gian tập trung không hợp lệ');
    const now = Timestamp.now();
    const newSession: FocusSession = {
      ...sessionData,
      id: sessionData.id || `focus_${crypto.randomUUID()}`,
      createdAt: now,
    };
    // Idempotency: same session ID must never be counted twice.
    const created = await atomicService.recordFocus(activeUid, newSession);
    if (!created) return get().focusSessions.find(s => s.id === newSession.id) || newSession;
    // Derived task totals use Focus Sessions as source of truth.
    const updatedSessions = [newSession, ...get().focusSessions.filter(s => s.id !== newSession.id)];
    const updatedTasks = get().tasks.map(task => task.id === newSession.taskId
      ? {...task, actualFocusSeconds: updatedSessions.filter(s => s.taskId === task.id && s.status === 'completed')
          .reduce((sum,s) => sum + Math.floor(s.actualFocusMs / 1000),0)} : task);
    set({ focusSessions: updatedSessions, tasks: updatedTasks });
    return newSession;
  },

  addHabit: async (habitData) => {
    const { activeUid, habits } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    const habitId = `habit_${Date.now()}`;
    const now = Timestamp.now();
    const newHabit: Habit = {
      ...habitData,
      id: habitId,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: now,
      updatedAt: now,
    };

    await habitService.saveHabit(activeUid, newHabit);
    set({ habits: [...habits, newHabit] });
  },

  toggleHabit: async (habitId) => {
    const { activeUid, habits } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const today = localDay();
    const existingLogs = await habitService.getLogs(activeUid, habitId);
    const todayLog = existingLogs.find((l) => l.date === today);

    const isDone = todayLog?.completed || false;
    const newCompleted = !isDone;
    const byDate=new Map(existingLogs.map(l=>[l.date,l.completed]));
    byDate.set(today,newCompleted);
    let newStreak=0;
    let at=newCompleted?today:dayPlus(today,-1);
    while(byDate.get(at)===true && newStreak<3650){newStreak++;at=dayPlus(at,-1);}
    // Longest streak is computed across actual day logs (not incremented by repeated clicks today).
    const sorted=Array.from(byDate.entries()).filter(([,complete])=>complete).map(([date])=>date).sort();
    let chain=0,longestStreak=0,previous='';
    for(const day of sorted){chain=previous&&dayPlus(previous,1)===day?chain+1:1;
      longestStreak=Math.max(longestStreak,chain);previous=day;}
    const now = Timestamp.now();

    const updatedHabit: Habit = {
      ...habit,
      currentStreak: newStreak,
      longestStreak,
      updatedAt: now,
    };

    await habitService.saveHabitAndLog(activeUid,updatedHabit, {
      id: todayLog?.id || `log_${habitId}_${today}`,
      habitId, date:today,completed:newCompleted,isRestDay:false,createdAt:todayLog?.createdAt||now,
    });

    set({ habits: habits.map((h) => (h.id === habitId ? updatedHabit : h)) });
  },

  saveReview: async (review) => {
    const { activeUid, dailyReviews } = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');

    await journalService.saveReview(activeUid, review);
    set({
      dailyReviews: {
        ...dailyReviews,
        [review.date]: review,
      },
    });
  },

  // Optional roadmap template, invoked only when user explicitly requests import.
  seedDefaultUserData: async () => {
    const {activeUid} = get();
    if (!activeUid) throw new Error('Chưa đăng nhập');
    if (get().tasks.length > 0) throw new Error('Chỉ nhập mẫu vào lịch trống để tránh tạo trùng');
    const titles = [
      ['Luyện Excel: Pivot Table và FPY', 'engineer', 90],
      ['TOPIK 3: Ngữ pháp và từ vựng', 'korean', 60],
      ['TOEIC: Luyện nghe Part 2', 'english', 45],
      ['Xem lại kiến thức OSAT', 'university', 60],
      ['Đọc báo cáo Yield Analysis', 'engineer', 45],
    ] as const;
    for (const [title, categoryId, estimatedMinutes] of titles) {
      await get().addTask({title,categoryId,priority:'medium',status:'inbox',estimatedMinutes});
    }
  },
}));
