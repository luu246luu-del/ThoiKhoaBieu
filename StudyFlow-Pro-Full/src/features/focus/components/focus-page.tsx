import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Maximize2, Volume2, VolumeX, Clock, Timer, Coffee, History } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useDataStore, useAuthStore } from '@/stores';
import { formatTime } from '@/lib/utils';
import { elapsedFocusMs } from '@/lib/focus-time';
import type { FocusMode } from '@/types';

/**
 * Focus session local checkpoint: persists only timing metadata, never a password.
 * The data is keyed by UID; server-recording is idempotent using stable session id.
 */
interface Checkpoint {
  id: string;
  uid: string;
  startedAtMs: number;
  pausedMs: number;
  pauseSinceMs: number | null;
  durationMs: number;
  mode: FocusMode;
  taskId: string;
  categoryId: string;
  isBreak: boolean;
  status: 'running' | 'paused';
}
const localKey = (uid: string) => `studyflow_active_focus_${uid}`;
const readCheckpoint = (uid: string): Checkpoint | null => {
  try {
    const raw = localStorage.getItem(localKey(uid));
    if (!raw) return null;
    const value = JSON.parse(raw) as Checkpoint;
    if (value.uid !== uid || !Number.isFinite(value.startedAtMs) || !value.id ||
        !['running','paused'].includes(value.status)) return null;
    return value;
  } catch { return null; }
};
const saveCheckpoint = (value: Checkpoint | null, uid: string) => {
  try {
    if (value) localStorage.setItem(localKey(uid), JSON.stringify(value));
    else localStorage.removeItem(localKey(uid));
  } catch { /* Private mode may disallow storage; timer still runs while mounted. */ }
};

export function FocusPage() {
  const uid = useAuthStore(s => s.user?.uid) || 'guest';
  const tasks = useDataStore(s => s.tasks);
  const focusSessions = useDataStore(s => s.focusSessions);
  const recordFocusSession = useDataStore(s => s.recordFocusSession);
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isBreak, setIsBreak] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const finishGuard = useRef(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = readCheckpoint(uid);
    setCheckpoint(saved);
    if (saved) {
      setMode(saved.mode);
      setSelectedTaskId(saved.taskId);
      setIsBreak(saved.isBreak);
      setFocusMinutes(Math.max(1, Math.round(saved.durationMs / 60000)));
    }
    finishGuard.current = false;
  }, [uid]);

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const running = checkpoint?.status === 'running';
  const paused = checkpoint?.status === 'paused';
  const elapsedMs = checkpoint ? elapsedFocusMs(checkpoint, clock) : 0;
  const durationMs = checkpoint?.durationMs ?? (isBreak ? breakMinutes : focusMinutes) * 60000;
  const shownMs = mode === 'stopwatch' ? elapsedMs : Math.max(0, durationMs - elapsedMs);
  // Tiến độ tính trực tiếp từ thời gian thực, không tạo state phụ hay ghi dữ liệu.
  const focusProgress = durationMs > 0 ? Math.min(100, Math.max(0, elapsedMs / durationMs * 100)) : 0;
  const display = mode === 'clock'
    ? new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit', minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(clock))
    : formatTime(Math.floor(shownMs / 1000));
  const selectedTask = tasks.find(t => t.id === (checkpoint?.taskId || selectedTaskId));
  const recent = useMemo(() => focusSessions.filter(s => s.status === 'completed').slice(0, 6), [focusSessions]);

  const chime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const context = new AudioContext();
      [523.25,659.25,783.99].forEach((freq, i) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, context.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + i * 0.15 + 0.48);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(context.currentTime + i * 0.15);
        oscillator.stop(context.currentTime + i * 0.15 + 0.48);
      });
      setTimeout(() => void context.close(), 1600);
    } catch { /* Autoplay policies may block sound */ }
  }, [soundEnabled]);

  const start = () => {
    if (mode === 'clock') return;
    const existing = readCheckpoint(uid);
    if (existing && existing.id !== checkpoint?.id) {
      toast.error('Có phiên học khác đang hoạt động trên thiết bị này.');
      setCheckpoint(existing); return;
    }
    const task = tasks.find(t => t.id === selectedTaskId);
    const value: Checkpoint = {
      id: crypto.randomUUID(), uid, startedAtMs: Date.now(), pausedMs: 0,
      pauseSinceMs: null, durationMs: (isBreak ? breakMinutes : focusMinutes) * 60000,
      mode, taskId: task?.id || '', categoryId: task?.categoryId || 'personal',
      isBreak, status: 'running',
    };
    saveCheckpoint(value, uid); setCheckpoint(value); finishGuard.current = false;
    toast.success('Đã bắt đầu phiên tập trung');
  };

  const pause = () => {
    if (!checkpoint || checkpoint.status !== 'running') return;
    const value = {...checkpoint, pauseSinceMs: Date.now(), status: 'paused' as const};
    saveCheckpoint(value, uid); setCheckpoint(value);
  };
  const resume = () => {
    if (!checkpoint || checkpoint.status !== 'paused') return;
    const now = Date.now();
    const value: Checkpoint = {
      ...checkpoint, status: 'running', pauseSinceMs: null,
      pausedMs: checkpoint.pausedMs + Math.max(0, now - (checkpoint.pauseSinceMs ?? now)),
    };
    saveCheckpoint(value, uid); setCheckpoint(value);
  };
  const reset = () => {
    if (checkpoint && !window.confirm('Bỏ phiên này? Thời gian chưa được lưu vào thống kê.')) return;
    finishGuard.current = false; saveCheckpoint(null, uid); setCheckpoint(null);
    setIsBreak(false);
  };

  const finish = useCallback(async (current: Checkpoint) => {
    if (finishGuard.current) return;
    finishGuard.current = true;
    setIsSaving(true);
    const now = Date.now();
    const elapsed = elapsedFocusMs(current, now);
    const actualMs = current.mode === 'stopwatch' ? elapsed : Math.min(elapsed, current.durationMs);
    if (!current.isBreak && actualMs >= 1000) {
      try {
        await recordFocusSession({
          id: current.id,
          taskId: current.taskId || undefined,
          categoryId: current.categoryId,
          mode: current.mode,
          plannedDurationMs: current.mode === 'stopwatch' ? undefined : current.durationMs,
          startedAt: Timestamp.fromMillis(current.startedAtMs),
          endedAt: Timestamp.fromMillis(now),
          actualFocusMs: Math.floor(actualMs),
          totalPausedMs: current.pausedMs + (current.pauseSinceMs === null ? 0 : now - current.pauseSinceMs),
          segments: [{start:current.startedAtMs,end:now,type:'focus'}],
          status: 'completed',
        });
        toast.success(`Đã lưu ${formatTime(Math.floor(actualMs / 1000))} tập trung.`);
      } catch (err) {
        finishGuard.current = false;
        toast.error(err instanceof Error ? err.message : 'Không lưu được phiên. Nhấn Kết thúc để thử lại.');
        setIsSaving(false);
        return;
      }
    }
    chime(); saveCheckpoint(null, uid); setCheckpoint(null);
    if (current.mode === 'pomodoro') setIsBreak(!current.isBreak);
    setIsSaving(false);
    finishGuard.current = false;
  }, [uid, recordFocusSession, chime]);

  useEffect(() => {
    if (checkpoint && checkpoint.status === 'running' &&
        checkpoint.mode !== 'stopwatch' && elapsedMs >= checkpoint.durationMs && !finishGuard.current) {
      void finish(checkpoint);
    }
  }, [checkpoint, elapsedMs, finish]);

  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (host.current?.requestFullscreen) await host.current.requestFullscreen();
      setFullScreen(Boolean(document.fullscreenElement));
    } catch { toast.warning('Thiết bị hoặc trình duyệt không hỗ trợ toàn màn hình.'); }
  };

  return <div ref={host} className={`space-y-6 pb-12 ${fullScreen ? 'bg-[#0B0E17] p-6 overflow-y-auto h-full' : ''}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Focus Studio</h1><p className="text-sm text-muted-foreground">Đồng hồ giờ : phút : giây · Lưu phiên thật · Tự khôi phục sau tải lại</p></div>
      <button onClick={() => setSoundEnabled(x => !x)} className="rounded-xl border p-3" aria-label="Bật tắt tiếng">{soundEnabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
    </div>
    <div className="vt-focus-panel rounded-3xl border border-white/10 bg-[#101524] px-4 py-9 text-white shadow-2xl shadow-primary/10 sm:p-12">
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {([['pomodoro','Pomodoro'],['countdown','Đếm ngược'],['stopwatch','Đếm tiến'],['clock','Đồng hồ']] as const).map(([value,label]) => <button key={value} disabled={Boolean(checkpoint)} onClick={()=>{setMode(value);setIsBreak(false)}} className={`vt-mode-tab vt-focus-control rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-40 ${mode===value?'text-white':'bg-white/10 text-slate-300'}`} aria-pressed={mode===value}>{label}</button>)}
      </div>
      <div className="text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.22em] text-violet-200"><span className="vt-status-dot" aria-hidden="true" />{mode==='clock'?'Giờ Việt Nam':isBreak?'Giải lao':running?'Đang tập trung':paused?'Đã tạm dừng':'Sẵn sàng tập trung'}</p>
        <div className="vt-focus-display font-mono text-[clamp(2rem,8.1vw,6.5rem)] leading-none tabular-nums tracking-tight font-semibold" aria-live="off">{display}</div>
        {mode !== 'clock' && mode !== 'stopwatch' && (
          <div className="mx-auto mt-8 w-full max-w-sm">
            <div className="vt-focus-progress" role="progressbar" aria-label="Tiến độ phiên tập trung" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(focusProgress)}>
              <div style={{ width: `${focusProgress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] tracking-wider text-slate-500">
              <span>0%</span><span>{Math.round(focusProgress)}%</span><span>100%</span>
            </div>
          </div>
        )}
        <p className="mt-5 text-sm text-slate-400">{selectedTask?.title ?? (isBreak ? 'Thư giãn một chút' : 'Phiên tập trung tự do')}</p>
      </div>
      <div className="mx-auto mt-10 flex max-w-sm flex-wrap items-center justify-center gap-3">
        {!checkpoint && mode !== 'clock' && <button onClick={start} className="vt-focus-primary vt-focus-control rounded-full px-8 py-3 font-semibold text-white flex items-center gap-2"><Play size={17}/> Bắt đầu</button>}
        {running && <button onClick={pause} className="vt-focus-primary vt-focus-control rounded-full px-7 py-3 font-semibold flex items-center gap-2"><Pause size={17}/> Tạm dừng</button>}
        {paused && <button onClick={resume} className="vt-focus-primary vt-focus-control rounded-full px-7 py-3 font-semibold flex items-center gap-2"><Play size={17}/> Tiếp tục</button>}
        {checkpoint && <button onClick={()=>void finish(checkpoint)} disabled={isSaving} className="vt-focus-secondary vt-focus-control rounded-full border border-white/20 px-5 py-3 font-semibold flex items-center gap-2"><CheckCircle2 size={17}/> {isSaving?'Đang lưu':'Kết thúc'}</button>}
        {checkpoint && <button onClick={reset} disabled={isSaving} className="vt-focus-secondary vt-focus-control rounded-full border border-white/20 p-3" title="Đặt lại"><RotateCcw size={17}/></button>}
        <button onClick={()=>void toggleFullScreen()} className="vt-focus-secondary vt-focus-control rounded-full border border-white/20 p-3" title="Toàn màn hình"><Maximize2 size={17}/></button>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">Âm thanh và báo thức nền tùy thuộc quyền của trình duyệt và hệ điều hành.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold"><Timer size={18}/> Thời lượng</div>
        <label className="block text-xs text-muted-foreground">Tập trung (phút)</label>
        <input type="number" min="1" max="720" disabled={Boolean(checkpoint)} value={focusMinutes} onChange={e=>setFocusMinutes(Math.min(720,Math.max(1,Number(e.target.value)||1)))} className="w-full rounded-lg border bg-background p-2"/>
        <label className="block text-xs text-muted-foreground">Nghỉ (phút)</label>
        <input type="number" min="1" max="120" disabled={Boolean(checkpoint)} value={breakMinutes} onChange={e=>setBreakMinutes(Math.min(120,Math.max(1,Number(e.target.value)||1)))} className="w-full rounded-lg border bg-background p-2"/>
      </div>
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold"><Clock size={18}/> Liên kết công việc</div>
        <select disabled={Boolean(checkpoint)} className="w-full rounded-xl border bg-background px-3 py-2" value={selectedTaskId} onChange={e=>setSelectedTaskId(e.target.value)}>
          <option value="">Tập trung tự do</option>
          {tasks.filter(t=>t.status!=='completed').map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <p className="text-sm text-muted-foreground">Hoàn thành đồng hồ không tự đánh dấu đã xong nhiệm vụ.</p>
      </div>
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold"><History size={18}/> Phiên gần đây</div>
        {recent.length===0 ? <p className="text-sm text-muted-foreground">Chưa có phiên học. Bắt đầu để ghi nhận thời gian thực tế.</p> : recent.map(s=><p key={s.id} className="flex justify-between gap-2 text-xs"><span>{s.startedAt?.toDate?.()?.toLocaleDateString('vi-VN') || ''}</span><strong>{formatTime(Math.floor(s.actualFocusMs/1000))}</strong></p>)}
      </div>
    </div>
  </div>;
}
