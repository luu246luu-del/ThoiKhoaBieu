import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  Trash2,
  Tag,
  Sparkles,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/stores';
import { toast } from 'sonner';
import type { Task, TaskPriority } from '@/types';

export function TasksPage() {
  const navigate = useNavigate();
  const { tasks, addTask, deleteTask, toggleTaskComplete, isLoading } = useDataStore();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for creating new task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>('engineer');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newMinutes, setNewMinutes] = useState('45');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề nhiệm vụ');
      return;
    }

    try {
      await addTask({
        title: newTaskTitle.trim(),
        categoryId: newCategory,
        priority: newPriority,
        status: 'inbox',
        estimatedMinutes: parseInt(newMinutes, 10) || 45,
        plannedMinutes: parseInt(newMinutes, 10) || 45,
        progress: 0,
        subtasks: [],
        links: [],
      });

      setNewTaskTitle('');
      toast.success('Đã thêm nhiệm vụ mới vào hệ thống!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi tạo nhiệm vụ');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && t.status !== 'completed') ||
      t.status === filterStatus;
    const matchesCategory =
      filterCategory === 'all' || t.categoryId === filterCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Quản lý Công việc & Nhiệm vụ
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {tasks.length} Việc
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dữ liệu đồng bộ tập trung • Tham chiếu cùng ID với Thời khóa biểu, Hôm nay và Thống kê
          </p>
        </div>
      </div>

      {/* Task Creation Form */}
      <Card elevated className="p-4 sm:p-5 border border-border/80">
        <form onSubmit={handleAddTask} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Nhập nhiệm vụ mới... (ví dụ: Luyện đề thi TOPIK 3 Phần Nghe)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm việc
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-muted-foreground font-medium">Lĩnh vực:</span>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-lg border border-input bg-surface px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="engineer">Process Engineer (OSAT)</option>
              <option value="korean">Tiếng Hàn TOPIK 3</option>
              <option value="english">Tiếng Anh TOEIC 450</option>
              <option value="university">Đại học</option>
              <option value="personal">Cá nhân</option>
            </select>

            <span className="text-muted-foreground font-medium ml-2">Ưu tiên:</span>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="rounded-lg border border-input bg-surface px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Cao</option>
              <option value="medium">Bình thường</option>
              <option value="low">Thấp</option>
            </select>

            <span className="text-muted-foreground font-medium ml-2">Dự kiến:</span>
            <input
              type="number"
              min="5"
              step="5"
              value={newMinutes}
              onChange={(e) => setNewMinutes(e.target.value)}
              className="w-16 rounded-lg border border-input bg-surface px-2 py-1 text-xs text-foreground font-mono text-center"
            />
            <span className="text-muted-foreground">phút</span>
          </div>
        </form>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Tìm kiếm công việc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="inline-flex rounded-lg bg-surface p-1 border border-border/60 text-xs">
            {['all', 'active', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                  filterStatus === st
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'all' ? 'Tất cả' : st === 'active' ? 'Đang làm' : 'Đã xong'}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="inline-flex rounded-lg bg-surface p-1 border border-border/60 text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'engineer', label: 'OSAT' },
              { id: 'korean', label: 'Hàn' },
              { id: 'english', label: 'Anh' },
              { id: 'university', label: 'Đại học' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(c.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterCategory === c.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
            Đang đồng bộ dữ liệu nhiệm vụ...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/70 rounded-2xl bg-surface/40">
            <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">Không có nhiệm vụ nào</p>
            <p className="text-xs text-muted-foreground mt-1">
              Thêm nhiệm vụ mới để bắt đầu theo dõi tiến độ
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Card
              key={task.id}
              elevated
              className={`p-4 transition-all duration-200 hover:border-border ${
                task.status === 'completed'
                  ? 'opacity-70 bg-surface/40 border-border/40'
                  : 'bg-surface-elevated'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleTaskComplete(task.id)}
                    className="mt-0.5 text-muted-foreground hover:text-accent transition-colors"
                    title={task.status === 'completed' ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-semibold text-sm ${
                          task.status === 'completed'
                            ? 'line-through text-muted-foreground'
                            : 'text-foreground'
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
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>Dự kiến: {task.estimatedMinutes || 45} phút</span>
                      <span>• Đã học thực tế: {Math.round((task.actualFocusSeconds || 0) / 60)} phút</span>
                      {task.rescheduleHistory && task.rescheduleHistory.length > 0 && (
                        <span className="text-warning flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> Đã dời {task.rescheduleHistory.length} lần
                        </span>
                      )}
                    </div>

                    {/* Subtasks */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="pt-2 pl-2 space-y-1 border-l border-border/60 mt-1">
                        {task.subtasks.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className={st.completed ? 'line-through opacity-70' : ''}>
                              • {st.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {task.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/focus')}
                      className="h-8 text-xs text-primary"
                      title="Bắt đầu học"
                    >
                      <Play className="h-3.5 w-3.5 fill-current mr-1" />
                      Học
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) {
                        deleteTask(task.id);
                        toast.info('Đã xóa nhiệm vụ.');
                      }
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
