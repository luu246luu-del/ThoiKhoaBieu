import '@/styles/hero-calendar-addon.css';
import { localDay, dayPlus } from '@/lib/schedule';
import { DailyQuoteCard } from './daily-quote-card';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Timer,
  ArrowUpRight,
  Plus,
  Play,
  RotateCcw,
  BookOpen,
  Cpu,
  Languages,
  CheckSquare,
} from 'lucide-react';
import { useAuthStore, useDataStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getGreeting, formatTime, formatDateVN } from '@/lib/utils';

export function DashboardPage() {
  const { profile, user } = useAuthStore();
  const { tasks, events, focusSessions, toggleTaskComplete, isLoading } = useDataStore();
  const navigate = useNavigate();

  const displayName = profile?.displayName || user?.displayName || profile?.username || 'Bạn';
  const greeting = getGreeting();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = localDay(currentTime);

  // Filter tasks for today
  const todayTasks = tasks.filter((t) => {
    if (!t.scheduledSessions || t.scheduledSessions.length === 0) return true;
    return t.scheduledSessions.some((s) => s.date === todayStr);
  });

  const totalTasks = todayTasks.length;
  const completedTasks = todayTasks.filter((t) => t.status === 'completed').length;
  const remainingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Real today focus seconds computed from focusSessions
  const todaySessions = focusSessions.filter((s) => {
    const sDate = s.startedAt?.toDate?.();
    if (!sDate) return false;
    return localDay(sDate) === todayStr;
  });

  const todayFocusSeconds = todaySessions.reduce((acc, s) => acc + Math.floor(s.actualFocusMs / 1000), 0);

  // Seven-day focus statistics, sourced only from completed recorded sessions.
  const weekStartMs = new Date(currentTime.getTime() - 7*86400000).getTime();
  const weeklySessions = focusSessions.filter(s => s.status === 'completed' && s.startedAt?.toMillis?.() >= weekStartMs);
  const weeklyFocusSeconds = weeklySessions.reduce((acc, s) => acc + Math.floor(s.actualFocusMs / 1000), 0);
  const weeklyActualHours = (weeklyFocusSeconds / 3600).toFixed(1);
  const weeklyGoalHours = profile?.weeklyGoals ? Object.values(profile.weeklyGoals).reduce((sum,n)=>sum+n,0)/60 : 17.5;

  // Track hours
  const engineerSec = weeklySessions
    .filter((s) => s.categoryId === 'engineer')
    .reduce((acc, s) => acc + Math.floor(s.actualFocusMs / 1000), 0);
  const koreanSec = weeklySessions
    .filter((s) => s.categoryId === 'korean')
    .reduce((acc, s) => acc + Math.floor(s.actualFocusMs / 1000), 0);
  const englishSec = weeklySessions
    .filter((s) => s.categoryId === 'english')
    .reduce((acc, s) => acc + Math.floor(s.actualFocusMs / 1000), 0);

  const engineerHours = (engineerSec / 3600).toFixed(1);
  const koreanHours = (koreanSec / 3600).toFixed(1);
  const englishHours = (englishSec / 3600).toFixed(1);

  // First unfinished task for rescue prompt
  const firstUnfinishedTask = todayTasks.find((t) => t.status !== 'completed');

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Welcome Banner */}
      <div className="vt-hero relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-surface-elevated via-surface to-surface-elevated p-5 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="engineer" className="px-2.5 py-1 text-[11px] font-semibold">
                PROCESS ENGINEER • SEMICONDUCTOR OSAT
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono">
                {currentTime.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
              {greeting}, <span className="text-gradient">{displayName}</span>!
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
              Hôm nay bạn đã hoàn thành <span className="text-accent font-semibold">{completedTasks}/{totalTasks}</span> nhiệm vụ.
              {remainingTasks > 0 ? (
                <> Còn <span className="text-warning font-semibold">{remainingTasks}</span> việc chưa hoàn tất cần xử lý hoặc dời lịch.</>
              ) : (
                <> Không còn công việc nào chưa hoàn thành hôm nay.</>
              )}
            </p>
          </div>

          {/* Quick Action Button Group */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => navigate('/focus')}
              className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/25"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Bắt đầu Focus
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/today')}
            >
              <CalendarCheck className="mr-2 h-4 w-4 text-accent" />
              Xem Hôm Nay
            </Button>
          </div>
        </div>
      </div>

      {/* Loi nhan / ca dao tuc ngu thay doi theo ngay Viet Nam. */}
      <DailyQuoteCard day={todayStr} />

      {/* 4 Core KPI Cards with Real Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Nhiệm vụ hôm nay */}
        <Card elevated hover className="vt-stat-card relative overflow-hidden">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tiến độ hôm nay
            </CardTitle>
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">
                {completedTasks}/{totalTasks}
              </span>
              <span className="text-xs font-semibold text-accent font-mono">
                {completionRate}%
              </span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              {remainingTasks === 0 ? 'Đã hoàn tất toàn bộ' : `Còn ${remainingTasks} việc chưa xong`}
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Thời gian tập trung thực tế hôm nay */}
        <Card elevated hover className="vt-stat-card relative overflow-hidden">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Focus hôm nay
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Timer className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-bold font-clock tabular-nums text-primary">
              {formatTime(todayFocusSeconds)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {todaySessions.length} phiên tập trung hợp lệ
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Cần xử lý / Tồn đọng */}
        <Card elevated hover className={`vt-stat-card relative overflow-hidden ${remainingTasks > 0 ? 'border-warning/30 bg-warning/5' : ''}`}>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className={`text-xs font-semibold uppercase tracking-wider ${remainingTasks > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
              Cần xử lý
            </CardTitle>
            <div className={`p-2 rounded-lg ${remainingTasks > 0 ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className={`text-2xl font-bold font-mono ${remainingTasks > 0 ? 'text-warning' : 'text-foreground'}`}>
              {remainingTasks} việc
            </div>
            <button
              onClick={() => navigate('/backlog')}
              className="text-[11px] text-warning/90 hover:underline flex items-center font-medium"
            >
              Xem Smart Reschedule <ArrowUpRight className="ml-1 h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* KPI 4: Mục tiêu tuần */}
        <Card elevated hover className="vt-stat-card relative overflow-hidden">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mục tiêu tuần này
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">
                {weeklyActualHours}h / {weeklyGoalHours}h
              </span>
              <span className="text-xs font-semibold text-purple-400 font-mono">
                {Math.min(100, Math.round((Number(weeklyActualHours) / weeklyGoalHours) * 100))}%
              </span>
            </div>
            <Progress value={Math.min(100, Math.round((Number(weeklyActualHours) / weeklyGoalHours) * 100))} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              {Math.max(0, weeklyGoalHours - Number(weeklyActualHours)).toFixed(1)}h còn lại
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Today's Schedule & 3 Key Subject Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real Today Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                Lịch trình hôm nay ({formatDateVN(currentTime, { weekday: 'long', day: '2-digit', month: '2-digit' })})
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calendar')}
            >
              Mở Thời khóa biểu
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border/80 rounded-2xl">
                Không có sự kiện nào hôm nay. Hãy thêm công việc mới.
              </div>
            ) : (
              todayTasks.map((t) => {
                const isCompleted = t.status === 'completed';
                const session = t.scheduledSessions?.[0];
                const timeSlot = session ? `${session.startTime} – ${session.endTime}` : 'Linh hoạt';

                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                      isCompleted
                        ? 'border-border/60 bg-surface/50 text-muted-foreground'
                        : 'border-warning/40 bg-warning/5 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaskComplete(t.id)}
                        className="text-muted-foreground hover:text-accent"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-accent" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-warning/60" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {t.title}
                          </span>
                          <Badge variant={t.categoryId as any} className="text-[10px]">
                            {t.categoryId}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {timeSlot} • Dự kiến: {t.estimatedMinutes || 45}p
                          {t.actualFocusSeconds > 0 && ` • Đã học: ${Math.round(t.actualFocusSeconds / 60)}p`}
                        </p>
                      </div>
                    </div>

                    {!isCompleted && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate('/focus')}
                          className="h-8 text-xs bg-primary hover:bg-primary/90"
                        >
                          <Play className="mr-1 h-3.5 w-3.5 fill-current" />
                          Học
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate('/backlog')}
                          className="h-8 text-xs border-warning/40 text-warning hover:bg-warning/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Smart Reschedule Callout if any unfinished */}
            {firstUnfinishedTask && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border-2 border-warning/60 bg-warning/10 shadow-lg shadow-warning/5 gap-3 mt-4">
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full bg-purple-500 mt-1 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {firstUnfinishedTask.title}
                      </span>
                      <Badge variant="warning" className="text-[10px]">Chưa hoàn thành</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      Cần xử lý bằng Smart Reschedule hoặc hoàn thành ngay.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    onClick={() => navigate('/focus')}
                    className="bg-primary hover:bg-primary/90 h-8 text-xs font-semibold"
                  >
                    <Play className="mr-1 h-3.5 w-3.5 fill-current" />
                    Học ngay
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/backlog')}
                    className="h-8 text-xs font-semibold border-warning/40 text-warning hover:bg-warning/10"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Dời lịch
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: The 3 Dedicated Learning Tracks with Real Data */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              3 Lĩnh vực trọng tâm
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/roadmap')}
              className="text-xs text-primary"
            >
              Chi tiết
            </Button>
          </div>

          {/* Track 1: Process Engineer */}
          <Card elevated className="p-4 space-y-3 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                <span className="font-bold text-sm text-foreground">
                  Process Engineer (OSAT)
                </span>
              </div>
              <span className="text-xs font-mono text-purple-400 font-semibold">
                {engineerHours} / 7.5h
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.round((Number(engineerHours) / 7.5) * 100))}
              className="h-1.5"
              indicatorClassName="bg-purple-500"
            />
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>Mục tiêu 5 dự án (đến 30/06/2027)</span>
              <span className="font-semibold text-foreground/80">Lộ trình 36 tuần</span>
            </div>
          </Card>

          {/* Track 2: Korean TOPIK 3 */}
          <Card elevated className="p-4 space-y-3 border-l-4 border-l-pink-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-pink-400" />
                <span className="font-bold text-sm text-foreground">
                  Tiếng Hàn TOPIK 3
                </span>
              </div>
              <span className="text-xs font-mono text-pink-400 font-semibold">
                {koreanHours} / 6.0h
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.round((Number(koreanHours) / 6.0) * 100))}
              className="h-1.5"
              indicatorClassName="bg-pink-500"
            />
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>Ngữ pháp & Từ vựng Trung cấp</span>
              <span className="font-semibold text-foreground/80">
                {Math.min(100, Math.round((Number(koreanHours) / 6.0) * 100))}% tuần
              </span>
            </div>
          </Card>

          {/* Track 3: English TOEIC 450 */}
          <Card elevated className="p-4 space-y-3 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-sm text-foreground">
                  Tiếng Anh TOEIC 450
                </span>
              </div>
              <span className="text-xs font-mono text-blue-400 font-semibold">
                {englishHours} / 4.0h
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.round((Number(englishHours) / 4.0) * 100))}
              className="h-1.5"
              indicatorClassName="bg-blue-500"
            />
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>Luyện nghe & Đọc hiểu cơ bản</span>
              <span className="font-semibold text-foreground/80">
                {Math.min(100, Math.round((Number(englishHours) / 4.0) * 100))}% tuần
              </span>
            </div>
          </Card>

          {/* Milestone OSAT Banner */}
          <div className="rounded-xl border border-border/80 bg-surface-elevated/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Cột mốc tiếp theo
              </span>
              <Badge variant="outline" className="text-[10px] text-accent">
                30/11/2026
              </Badge>
            </div>
            <p className="text-xs font-bold text-foreground">
              Dự án 1: Semiconductor Yield Analysis
            </p>
            <p className="text-[11px] text-muted-foreground">
              Chuẩn bị dataset SPC & Phân tích lỗi dây hàn (Wire Bonding)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
