import React, { useState } from 'react';
import {
  Target,
  Plus,
  Flame,
  CheckCircle2,
  Circle,
  Award,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDataStore } from '@/stores';
import { toast } from 'sonner';

export function HabitsPage() {
  const { habits, toggleHabit, addHabit } = useDataStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('engineer');
  const [newDuration, setNewDuration] = useState('30');

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Vui lòng nhập tên thói quen');
      return;
    }

    try {
      await addHabit({
        title: newTitle.trim(),
        categoryId: newCategory,
        frequency: 'daily',
        target: {
          type: 'duration',
          value: parseInt(newDuration, 10) || 30,
        },
        isActive: true,
      });

      toast.success('Đã tạo thói quen mới thành công!');
      setIsModalOpen(false);
      setNewTitle('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi tạo thói quen');
    }
  };

  const handleToggle = async (habitId: string) => {
    try {
      await toggleHabit(habitId);
      toast.success('Đã cập nhật trạng thái thói quen hôm nay!');
    } catch (err: unknown) {
      toast.error('Không thể cập nhật thói quen');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Theo dõi Thói quen (Habit Tracker)
            </h1>
            <Badge variant="warning" className="font-mono text-xs">
              STREAK ENGINE • FIRESTORE PERSISTED
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Xây dựng tính kỷ luật hàng ngày • Chuỗi ngày liên tục • Dữ liệu lưu trữ theo tài khoản
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Tạo thói quen mới
        </Button>
      </div>

      {/* Habit List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habits.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-sm text-muted-foreground border border-dashed border-border/70 rounded-2xl">
            Chưa có thói quen nào. Nhấn "Tạo thói quen mới" để bắt đầu rèn luyện!
          </div>
        ) : (
          habits.map((habit) => (
            <Card key={habit.id} elevated className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">
                      {habit.title}
                    </h3>
                    <Badge variant={habit.categoryId as any} className="text-[10px]">
                      {habit.categoryId === 'engineer'
                        ? 'OSAT'
                        : habit.categoryId === 'korean'
                        ? 'Tiếng Hàn'
                        : habit.categoryId === 'english'
                        ? 'Tiếng Anh'
                        : 'Sinh hoạt'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Mục tiêu: {habit.target?.value || 30} phút/ngày
                  </p>
                </div>

                <button
                  onClick={() => handleToggle(habit.id)}
                  className="transition-transform active:scale-95"
                >
                  <CheckCircle2 className="h-6 w-6 text-accent" />
                </button>
              </div>

              {/* Streak & History Row */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                  <Flame className="h-4 w-4 fill-current" />
                  <span>Streak: {habit.currentStreak} ngày</span>
                  <span className="text-muted-foreground text-[10px] font-normal">
                    (Kỷ lục: {habit.longestStreak} ngày)
                  </span>
                </div>

                <span className="text-[10px] text-muted-foreground">Dựa trên lịch sử đánh dấu thật</span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal Tạo thói quen mới */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thói quen rèn luyện mới</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateHabit} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Tên thói quen</label>
              <Input
                placeholder="vd: Đọc 1 bài báo cáo SEMI OSAT"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Lĩnh vực</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-xs text-foreground"
                >
                  <option value="engineer">Process Engineer</option>
                  <option value="korean">Tiếng Hàn</option>
                  <option value="english">Tiếng Anh</option>
                  <option value="personal">Cá nhân</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Thời lượng mục tiêu (phút)</label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">
                Tạo thói quen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
