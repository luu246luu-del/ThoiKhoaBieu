import { localDay, dayPlus } from '@/lib/schedule';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Plus,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDateVN } from '@/lib/utils';
import { useDataStore } from '@/stores';
import { toast } from 'sonner';

export function TodayPage() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = localDay(today);

  const { tasks, toggleTaskComplete, updateTask, isLoading } = useDataStore();

  // Tasks scheduled for today or active inbox tasks
  const todayTasks = tasks.filter((t) => {
    if (!t.scheduledSessions || t.scheduledSessions.length === 0) return true;
    return t.scheduledSessions.some((s) => s.date === todayStr);
  });

  const completedCount = todayTasks.filter((t) => t.status === 'completed').length;
  const pendingCount = todayTasks.length - completedCount;
  const progressPercent =
    todayTasks.length > 0 ? Math.round((completedCount / todayTasks.length) * 100) : 0;

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const allDone = newSubtasks.length > 0 && newSubtasks.every((st) => st.completed);

    await updateTask({
      ...task,
      subtasks: newSubtasks,
      status: allDone ? 'completed' : task.status,
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hôm nay
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {formatDateVN(today, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Danh sách lịch trình & nhiệm vụ cần hoàn tất trong ngày • Đồng bộ dữ liệu tập trung
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/backlog')}
              className="border-warning/40 text-warning hover:bg-warning/10"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Smart Reschedule ({pendingCount})
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate('/tasks')}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Thêm việc
          </Button>
        </div>
      </div>

      {/* Daily Progress Banner */}
      <Card elevated className="p-5 border-l-4 border-l-primary">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Tiến độ hoàn thành hôm nay: {completedCount}/{todayTasks.length} nhiệm vụ ({progressPercent}%)
            </h3>
            <p className="text-xs text-muted-foreground">
              {todayTasks.length === 0
                ? 'Chưa có công việc nào cho hôm nay. Nhấn "Thêm việc" để lập lịch trình.'
                : pendingCount === 0
                ? 'Tuyệt vời! Bạn đã hoàn thành toàn bộ công việc được xếp lịch hôm nay!'
                : `Còn ${pendingCount} công việc chưa hoàn thành. Hãy tập trung giải quyết hoặc dùng Smart Reschedule để dời lịch hợp lý.`}
            </p>
          </div>
          <div className="w-full sm:w-48">
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Unfinished Task Rescue Alert */}
      {pendingCount > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20 text-warning shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Phát hiện {pendingCount} việc chưa hoàn thành
              </p>
              <p className="text-xs text-muted-foreground">
                Hệ thống đề xuất bạn hoàn thành ngay trong phiên Focus hoặc chuyển sang khung giờ khả thi ngày mai.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate('/focus')}
            >
              <Play className="mr-1 h-3.5 w-3.5 fill-current" />
              Làm ngay
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/backlog')}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Chọn ngày dời
            </Button>
          </div>
        </div>
      )}

      {/* Task Checklist Group */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Nhiệm vụ & Khung giờ hôm nay
        </h3>

        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
            Đang tải dữ liệu hôm nay...
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/70 rounded-2xl bg-surface/30">
            <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">Hôm nay không có lịch trình</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nhấn nút Thêm việc để sắp xếp công việc mới vào ngày hôm nay
            </p>
          </div>
        ) : (
          todayTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const session = task.scheduledSessions?.[0];
            const timeSlot = session ? `${session.startTime} – ${session.endTime}` : 'Linh hoạt';

            return (
              <Card
                key={task.id}
                elevated
                className={`p-4 transition-all ${
                  isCompleted
                    ? 'bg-surface/50 border-border/50'
                    : 'border-l-4 border-l-warning bg-surface-elevated'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-0.5 text-muted-foreground hover:text-accent transition-colors"
                      title={isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-semibold text-sm ${
                            isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {task.title}
                        </span>
                        <Badge variant={task.categoryId as any} className="text-[10px]">
                          {task.categoryId === 'engineer'
                            ? 'Process Engineer'
                            : task.categoryId === 'korean'
                            ? 'Tiếng Hàn'
                            : task.categoryId === 'english'
                            ? 'Tiếng Anh'
                            : task.categoryId === 'university'
                            ? 'Đại học'
                            : 'Cá nhân'}
                        </Badge>
                        {task.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-[10px]">
                            Khẩn cấp
                          </Badge>
                        )}
                        {task.rescheduleHistory && task.rescheduleHistory.length > 0 && (
                          <Badge variant="outline" className="text-[10px] text-warning">
                            Đã dời {task.rescheduleHistory.length} lần
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {timeSlot}
                        </span>
                        <span>• {task.estimatedMinutes || 45} phút dự kiến</span>
                        {task.actualFocusSeconds > 0 && (
                          <span className="text-accent">
                            • Đã học: {Math.round(task.actualFocusSeconds / 60)} phút
                          </span>
                        )}
                      </div>

                      {/* Subtasks */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="pt-2 pl-2 space-y-1 border-l border-border/60 mt-2">
                          {task.subtasks.map((st) => (
                            <div
                              key={st.id}
                              onClick={() => toggleSubtask(task.id, st.id)}
                              className="flex items-center gap-2 text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={st.completed}
                                onChange={() => {}}
                                className="rounded h-3.5 w-3.5 accent-primary cursor-pointer"
                              />
                              <span className={st.completed ? 'line-through opacity-70' : ''}>
                                {st.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons on task */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isCompleted && (
                      <>
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
                          variant="outline"
                          onClick={() => navigate('/backlog')}
                          className="h-8 text-xs border-warning/40 text-warning hover:bg-warning/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
