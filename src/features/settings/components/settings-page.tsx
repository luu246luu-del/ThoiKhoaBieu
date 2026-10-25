import React, { useState, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { taskService, eventService, focusService, habitService } from '@/services/firebase/firestore-service';
import type { Task, CalendarEvent, FocusSession, Habit } from '@/types';
import {
  Settings,
  User,
  Shield,
  Bell,
  Clock,
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  CheckCircle2,
  Cpu,
  Languages,
  BookOpen,
} from 'lucide-react';
import { useAuthStore, useThemeStore, useDataStore } from '@/stores';
import { updateUserProfile } from '@/services/firebase/auth-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { tasks, events, focusSessions, habits } = useDataStore();
  const importInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [engineerGoal, setEngineerGoal] = useState(
    profile?.weeklyGoals?.engineer ? (profile.weeklyGoals.engineer / 60).toString() : '7.5'
  );
  const [koreanGoal, setKoreanGoal] = useState(
    profile?.weeklyGoals?.korean ? (profile.weeklyGoals.korean / 60).toString() : '6.0'
  );
  const [englishGoal, setEnglishGoal] = useState(
    profile?.weeklyGoals?.english ? (profile.weeklyGoals.english / 60).toString() : '4.0'
  );

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    profile?.quietHours?.enabled ?? true
  );
  const [quietStart, setQuietStart] = useState(profile?.quietHours?.start || '23:00');
  const [quietEnd, setQuietEnd] = useState(profile?.quietHours?.end || '06:00');

  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
      });
      await refreshProfile();
      toast.success('Đã cập nhật tên hiển thị trong hồ sơ người dùng!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        weeklyGoals: {
          engineer: parseFloat(engineerGoal) * 60,
          korean: parseFloat(koreanGoal) * 60,
          english: parseFloat(englishGoal) * 60,
        },
      });
      await refreshProfile();
      toast.success('Đã lưu chỉ tiêu số giờ học theo tuần vào Firestore!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu chỉ tiêu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuietHours = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        quietHours: {
          enabled: quietHoursEnabled,
          start: quietStart,
          end: quietEnd,
        },
      });
      await refreshProfile();
      toast.success('Đã lưu cấu hình Giờ yên lặng (Quiet Hours)!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu giờ yên lặng');
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      user: profile || { uid: user?.uid, username: 'guest' },
      tasks,
      events,
      focusSessions,
      habits,
      exportTimestamp: new Date().toISOString(),
      schemaVersion: 1,
    };

    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `studyflow_real_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast.success('Đã tải xuống bản sao lưu JSON toàn diện của hệ thống!');
  };

  const handleRestoreBackup = async (file?: File) => {
    if(!file || !user)return;
    if(file.size > 10 * 1024 * 1024){toast.error('Tệp quá lớn (giới hạn 10 MB)');return;}
    setLoading(true);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text, (_key,value:unknown) => {
        if(value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value){
          const v=value as {seconds:number;nanoseconds:number};
          if(Number.isFinite(v.seconds)&&Number.isFinite(v.nanoseconds))return new Timestamp(v.seconds,v.nanoseconds);
        }
        return value;
      });
      if(!parsed || typeof parsed!=='object')throw new Error('File sao lưu không hợp lệ');
      const record=parsed as Record<string, unknown>;
      if(record.schemaVersion !== 1)throw new Error('Phiên bản sao lưu không được hỗ trợ');
      const taskList=Array.isArray(record.tasks)?record.tasks as Task[]:[];
      const eventList=Array.isArray(record.events)?record.events as CalendarEvent[]:[];
      const focusList=Array.isArray(record.focusSessions)?record.focusSessions as FocusSession[]:[];
      const habitList=Array.isArray(record.habits)?record.habits as Habit[]:[];
      if(taskList.length>5000||eventList.length>5000||focusList.length>20000||habitList.length>500)
        throw new Error('Sao lưu vượt quá giới hạn số bản ghi');
      const validId=(value:string)=>/^[a-zA-Z0-9_-]{1,120}$/.test(value);
      if(!taskList.every(t=>t&&validId(t.id)&&typeof t.title==='string'&&t.title.length>0&&t.title.length<=250&&Array.isArray(t.scheduledSessions)&&t.createdAt instanceof Timestamp&&t.updatedAt instanceof Timestamp))
        throw new Error('Có nhiệm vụ không hợp lệ trong file');
      if(!eventList.every(e=>e&&validId(e.id)&&typeof e.title==='string'&&e.startTime instanceof Timestamp&&e.endTime instanceof Timestamp))
        throw new Error('Có sự kiện không hợp lệ trong file');
      if(!focusList.every(f=>f&&validId(f.id)&&f.startedAt instanceof Timestamp&&Number.isFinite(f.actualFocusMs)&&f.actualFocusMs>=0&&f.actualFocusMs<=86400000))
        throw new Error('Có phiên tập trung không hợp lệ');
      if(!habitList.every(h=>h&&validId(h.id)&&typeof h.title==='string'))
        throw new Error('Có thói quen không hợp lệ');
      if(!window.confirm(`Nhập ${taskList.length} việc, ${eventList.length} lịch, ${focusList.length} phiên học và ${habitList.length} thói quen? Các ID trùng có thể được cập nhật. Hãy sao lưu dữ liệu hiện tại trước.`))return;
      for(const task of taskList)await taskService.saveTask(user.uid,task);
      for(const ev of eventList)await eventService.saveEvent(user.uid,ev);
      // A completed focus record has an immutable ID; importing it twice must not add duplicate time.
      const existing=new Set((await focusService.getSessions(user.uid)).map(f=>f.id));
      for(const f of focusList)if(!existing.has(f.id))await focusService.saveSession(user.uid,f);
      for(const habit of habitList)await habitService.saveHabit(user.uid,habit);
      // New UID data is reloaded to avoid stale page state.
      useDataStore.getState().clearData();
      await useDataStore.getState().initializeUserData(user.uid);
      toast.success('Nhập xong sao lưu và đã làm mới dữ liệu.');
    }catch(err){toast.error(err instanceof Error?err.message:'Lỗi đọc bản sao lưu');}
    finally{setLoading(false);if(importInput.current)importInput.current.value='';}
  };

  const handleTestNotification = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('VanTien Study — Báo thức thử nghiệm', {
            body: 'Hệ thống thông báo đang hoạt động chuẩn xác trên thiết bị này!',
            icon: '/favicon.svg',
          });
          toast.success('Đã gửi thông báo kiểm tra đến thiết bị!');
        } else {
          toast.warning('Quyền gửi thông báo bị từ chối hoặc chưa cấp phép.');
        }
      });
    } else {
      toast.error('Trình duyệt không hỗ trợ Web Notification API.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cài đặt Hệ thống & Cá nhân hóa
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Hồ sơ người dùng • Chỉ tiêu thời gian học • Giờ yên lặng ban đêm • Sao lưu dữ liệu thật
        </p>
      </div>

      {/* 1. Account Profile */}
      <Card elevated className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base text-foreground">Hồ sơ người dùng</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Họ tên hiển thị</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Tên đăng nhập</label>
              <Input
                value={profile?.username || 'quyenvan'}
                disabled
                className="bg-muted cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Múi giờ mặc định: <span className="font-mono text-foreground font-semibold">Asia/Ho_Chi_Minh</span>
            </div>
            <Button type="submit" size="sm" loading={loading}>
              Lưu tên hiển thị
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Weekly Study Goals */}
      <Card elevated className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-base text-foreground">Chỉ tiêu thời gian học theo tuần</h2>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            TỔNG: {Number(engineerGoal) + Number(koreanGoal) + Number(englishGoal)} GIỜ/TUẦN
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 p-3 rounded-xl bg-surface border border-purple-500/20">
            <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <Cpu className="h-4 w-4" /> Process Engineer (OSAT)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                value={engineerGoal}
                onChange={(e) => setEngineerGoal(e.target.value)}
              />
              <span className="text-xs text-muted-foreground font-mono">giờ</span>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-surface border border-pink-500/20">
            <label className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
              <Languages className="h-4 w-4" /> Tiếng Hàn TOPIK 3
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                value={koreanGoal}
                onChange={(e) => setKoreanGoal(e.target.value)}
              />
              <span className="text-xs text-muted-foreground font-mono">giờ</span>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-surface border border-blue-500/20">
            <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> Tiếng Anh TOEIC 450
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                value={englishGoal}
                onChange={(e) => setEnglishGoal(e.target.value)}
              />
              <span className="text-xs text-muted-foreground font-mono">giờ</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSaveGoals} loading={loading}>
            Lưu chỉ tiêu vào Firestore
          </Button>
        </div>
      </Card>

      {/* 3. Theme & Quiet Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Theme Settings */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Moon className="h-5 w-5 text-warning" />
            <h2 className="font-bold text-base text-foreground">Giao diện (Theme)</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                theme === 'dark' ? 'bg-primary/15 border-primary text-primary' : 'bg-surface border-border text-muted-foreground'
              }`}
            >
              <Moon className="h-5 w-5" />
              <span>Chế độ tối</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                theme === 'light' ? 'bg-primary/15 border-primary text-primary' : 'bg-surface border-border text-muted-foreground'
              }`}
            >
              <Sun className="h-5 w-5" />
              <span>Chế độ sáng</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                theme === 'system' ? 'bg-primary/15 border-primary text-primary' : 'bg-surface border-border text-muted-foreground'
              }`}
            >
              <Laptop className="h-5 w-5" />
              <span>Hệ thống</span>
            </button>
          </div>
        </Card>

        {/* Quiet Hours */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Bell className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-base text-foreground">Giờ yên lặng (Quiet Hours)</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-semibold">Tự động tắt chuông báo thức ban đêm:</span>
              <button
                onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                className={`px-3 py-1 rounded-full font-bold text-xs ${
                  quietHoursEnabled ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                }`}
              >
                {quietHoursEnabled ? 'Đang bật' : 'Đang tắt'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground">Bắt đầu:</label>
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Kết thúc:</label>
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                />
              </div>
            </div>

            <Button size="sm" variant="secondary" className="w-full mt-2" onClick={handleSaveQuietHours} loading={loading}>
              Lưu cài đặt giờ yên lặng
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. Diagnostics & Backup */}
      <Card elevated className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base text-foreground">Chẩn đoán thiết bị & Sao lưu dữ liệu</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Kiểm tra thông báo (Test Notifications)</p>
            <p className="text-xs text-muted-foreground">
              Gửi một thông báo mẫu để xác thực quyền hiển thị và chuông báo trên trình duyệt/PWA.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleTestNotification}>
            <Bell className="mr-1.5 h-4 w-4" />
            Gửi Test Notification
          </Button>
        </div>

        <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Sao lưu toàn bộ hệ thống (JSON Export)</p>
            <p className="text-xs text-muted-foreground">
              Lưu công việc ({tasks.length}), phiên tập trung ({focusSessions.length}), lịch trình ({events.length}) và thói quen. Nhật ký và cấu hình không thuộc file sao lưu này.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExportBackup}>
            <Download className="mr-1.5 h-4 w-4" />
            Tải bản sao lưu JSON thật
          </Button>
        </div>
        <div className="border-t border-border/50 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">Khôi phục từ file JSON</p><p className="text-xs text-muted-foreground">Chỉ nhập file do VanTien Studyxuất. Dữ liệu được trộn theo ID; hãy sao lưu hiện tại trước.</p></div>
          <input type="file" ref={importInput} accept=".json,application/json" className="hidden" onChange={e=>void handleRestoreBackup(e.currentTarget.files?.[0])}/>
          <Button variant="outline" size="sm" disabled={loading} onClick={()=>importInput.current?.click()}><Upload className="mr-2 h-4 w-4"/> Nhập sao lưu</Button>
        </div>
      </Card>
    </div>
  );
}
