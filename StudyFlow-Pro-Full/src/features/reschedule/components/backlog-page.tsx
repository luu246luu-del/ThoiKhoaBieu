import { localDay, dayPlus, parseSlot, nextFreeSlot } from '@/lib/schedule';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  RotateCcw,
  Play,
  Calendar,
  Clock,
  Split,
  BellOff,
  Archive,
  Trash2,
  AlertTriangle,
  History,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDataStore } from '@/stores';
import { toast } from 'sonner';
import type { Task } from '@/types';

export function BacklogPage() {
  const navigate = useNavigate();
  const { tasks, events, rescheduleTask, splitTask, updateTask, deleteTask } = useDataStore();

  const todayStr = localDay();

  // Unfinished tasks from today or earlier
  const unfinishedTasks = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const session = t.scheduledSessions?.[0];
    if (!session) return true; // inbox/unscheduled tasks
    return session.date <= todayStr;
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(
    unfinishedTasks[0] || null
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return localDay(tomorrow);
  });
  const [targetTime, setTargetTime] = useState('08:00');
  const [rescheduleReason, setRescheduleReason] = useState('Dời lịch sang ngày mai');

  const activeTask = selectedTask || unfinishedTasks[0] || null;

  // Execute Reschedule
  const handleExecuteReschedule = async (date: string, time: string, reason: string) => {
    if (!activeTask) return;

    try {
      await rescheduleTask(activeTask.id, date, time, reason);

      toast.success(`Đã dời lịch nhiệm vụ "${activeTask.title}" sang ngày ${date} lúc ${time}!`);
      toast.info('Bảo toàn deadline gốc & lịch sử dời lịch đã được lưu trữ.');

      setDialogOpen(false);
      // Select next unfinished task if available
      const remaining = unfinishedTasks.filter((t) => t.id !== activeTask.id);
      setSelectedTask(remaining[0] || null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi dời lịch');
    }
  };

  // Find an actual non-overlapping free interval (not only equal start-hours).
  const handleSuggestFreeSlot = () => {
    if (!activeTask) return;
    const remaining = Math.max(1,(activeTask.estimatedMinutes||60)-Math.floor(activeTask.actualFocusSeconds/60));
    const chosen=nextFreeSlot(targetDate,remaining,events.filter(e=>e.taskId!==activeTask.id).map(e=>({
      id:e.id,start:e.startTime.toMillis(),end:e.endTime.toMillis(),status:e.status,
    })));
    if(!chosen){toast.warning('Không còn khoảng trống phù hợp từ 08:00 đến 22:00 trong ngày này.');return;}
    setTargetTime(chosen);
    toast.info(`Gợi ý ${targetDate} lúc ${chosen}. Nhấn xác nhận trong hộp thoại để áp dụng.`);
    setDialogOpen(true);
  };

  const handleSplitSession = async () => {
    if (!activeTask) return;
    try {
      await splitTask(activeTask.id,targetDate,targetTime);
      toast.success('Đã chia thành hai buổi vào ngày đã chọn và ngày kế tiếp.');
      setSelectedTask(null);
    }catch(err){toast.error(err instanceof Error?err.message:'Không thể chia buổi học');}
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Smart Reschedule & Tồn đọng
            </h1>
            <Badge variant="warning" className="font-mono text-xs">
              REAL RESCHEDULE ENGINE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Xử lý nhiệm vụ chưa hoàn thành • Đồng bộ Firestore • Bảo toàn deadline gốc
          </p>
        </div>

        <Badge variant="outline" className="font-mono text-xs">
          {unfinishedTasks.length} Việc cần xử lý
        </Badge>
      </div>

      {/* Main Focus Alert: The Active Unfinished Task */}
      {activeTask ? (
        <Card elevated className="border-2 border-warning/60 bg-warning/5 p-6 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs uppercase">
                  Chưa hoàn thành
                </Badge>
                <Badge variant={activeTask.categoryId as any} className="text-[10px]">
                  {activeTask.categoryId}
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                "{activeTask.title}"
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
                <span>Dự kiến: {activeTask.estimatedMinutes || 60} phút</span>
                <span>• Đã học: {Math.round((activeTask.actualFocusSeconds || 0) / 60)} phút</span>
                <span>
                  • Deadline gốc:{' '}
                  {activeTask.deadline?.toDate?.()
                    ? activeTask.deadline.toDate().toLocaleDateString('vi-VN')
                    : 'Không hạn'}
                </span>
                <span className="text-warning">
                  • Đã dời: {activeTask.rescheduleHistory?.length || 0} lần
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                onClick={() => navigate('/focus')}
                className="bg-primary hover:bg-primary/90"
              >
                <Play className="mr-1.5 h-4 w-4 fill-current" />
                1. Làm ngay
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExecuteReschedule(targetDate, '08:00', 'Chuyển sang sáng mai')}
              >
                <RotateCcw className="mr-1.5 h-4 w-4 text-warning" />
                2. Sang sáng mai
              </Button>
            </div>
          </div>

          {/* 10 Smart Options Matrix */}
          <div className="mt-6 pt-6 border-t border-border/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              10 Phương án xử lý theo nguyên tắc Smart Reschedule
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/focus')}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <Play className="h-4 w-4 text-accent" />
                <span>1. Làm ngay</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExecuteReschedule(targetDate, '08:00', 'Dời sang sáng mai')}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <RotateCcw className="h-4 w-4 text-warning" />
                <span>2. Sang ngày mai</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRescheduleReason('Chọn ngày tùy chỉnh');
                  setDialogOpen(true);
                }}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <Calendar className="h-4 w-4 text-blue-400" />
                <span>3. Chọn ngày</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRescheduleReason('Chọn giờ tùy chỉnh');
                  setDialogOpen(true);
                }}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <Clock className="h-4 w-4 text-purple-400" />
                <span>4. Chọn giờ</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSuggestFreeSlot}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>5. Gợi ý giờ trống</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSplitSession}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <Split className="h-4 w-4 text-pink-400" />
                <span>6. Chia nhỏ phiên</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info('Đã hoãn nhắc thêm 30 phút.');
                }}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <BellOff className="h-4 w-4 text-amber-400" />
                <span>7. Hoãn nhắc 30p</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await updateTask({ ...activeTask, status: 'planned', scheduledSessions: [] });
                  toast.success('Đã đưa nhiệm vụ vào Smart Backlog an toàn.');
                }}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span>8. Đưa vào Backlog</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await updateTask({ ...activeTask, scheduledSessions: [] });
                  toast.info('Đã bỏ lịch hiện tại nhưng vẫn giữ nguyên nhiệm vụ trong hệ thống.');
                }}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs"
              >
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span>9. Bỏ lịch giữ task</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (window.confirm('Bạn có chắc chắn muốn hủy nhiệm vụ này?')) {
                    await deleteTask(activeTask.id);
                    toast.error('Đã hủy nhiệm vụ.');
                  }
                }}
                className="h-auto py-2.5 flex flex-col items-center gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 className="h-4 w-4" />
                <span>10. Hủy nhiệm vụ</span>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card elevated className="p-8 text-center space-y-2 border-dashed border-border/80">
          <CheckCircle2 className="h-10 w-10 text-accent mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            Không có công việc tồn đọng cần xử lý!
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Tất cả các nhiệm vụ đã được hoàn thành đúng hạn hoặc được lập lịch trình rõ ràng.
          </p>
        </Card>
      )}

      {/* List of All Unfinished Tasks */}
      {unfinishedTasks.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Các nhiệm vụ tồn đọng khác ({unfinishedTasks.length})
          </h3>
          <div className="space-y-2">
            {unfinishedTasks.map((t) => (
              <Card
                key={t.id}
                elevated
                onClick={() => setSelectedTask(t)}
                className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                  activeTask?.id === t.id ? 'border-primary bg-primary/5' : 'hover:bg-surface-elevated'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-foreground">{t.title}</span>
                  <Badge variant={t.categoryId as any} className="text-[10px]">
                    {t.categoryId}
                  </Badge>
                </div>
                <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <span>{t.estimatedMinutes || 60}p</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                    Chọn xử lý
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog for Custom Date/Time Reschedule */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tùy chỉnh dời lịch nhiệm vụ</DialogTitle>
            <DialogDescription>
              {activeTask?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Chọn ngày mới</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Khung giờ bắt đầu</label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Lý do dời lịch</label>
              <input
                type="text"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Deadline gốc ({activeTask?.deadline?.toDate?.() ? activeTask.deadline.toDate().toLocaleDateString('vi-VN') : 'N/A'}) sẽ được bảo toàn.
            </p>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => handleExecuteReschedule(targetDate, targetTime, rescheduleReason)}>
              Xác nhận dời lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
