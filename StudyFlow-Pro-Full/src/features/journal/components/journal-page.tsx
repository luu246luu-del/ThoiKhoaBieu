import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Save,
  Star,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDateVN } from '@/lib/utils';
import { localDay } from '@/lib/schedule';
import { Timestamp } from 'firebase/firestore';
import { useAuthStore, useDataStore } from '@/stores';
import { journalService } from '@/services/firebase/firestore-service';

export function JournalPage() {
  const { user } = useAuthStore();
  const { saveReview,tasks,focusSessions } = useDataStore();
  const today = new Date();
  const todayStr = localDay(today);

  const [rating, setRating] = useState(4);
  const [completedSummary, setCompletedSummary] = useState('');
  const [unfinishedReason, setUnfinishedReason] = useState('');
  const [tomorrowPriorities, setTomorrowPriorities] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    journalService.getReview(user.uid, todayStr).then((existing) => {
      if (existing) {
        setRating(existing.focusRating || 4);
        setCompletedSummary(existing.completedSummary || '');
        setUnfinishedReason(existing.unfinishedReasons || '');
        setTomorrowPriorities(existing.tomorrowPriorities || '');
        setNotes(existing.notes || '');
      } else {
        // Blank new journal: never invent what the user has accomplished.
        setCompletedSummary('');setUnfinishedReason('');setTomorrowPriorities('');setNotes('');setRating(3);
      }
    });
  }, [user, todayStr]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveReview({
        id: todayStr,
        date: todayStr,
        completedTaskIds: tasks.filter(t=>t.status==='completed' && localDay(t.completedAt?.toDate?.() || new Date(0))===todayStr).map(t=>t.id),
        unfinishedTaskIds: tasks.filter(t=>t.status!=='completed' && t.scheduledSessions.some(session=>session.date===todayStr)).map(t=>t.id),
        completedSummary,
        unfinishedReasons: unfinishedReason,
        tomorrowPriorities,
        focusRating: rating,
        notes,
        totalFocusMinutes: Math.floor(focusSessions.filter(s=>s.status==='completed' && localDay(s.startedAt.toDate())===todayStr).reduce((sum,s)=>sum+s.actualFocusMs,0)/60000),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast.success('Đã lưu nhật ký & tổng kết ngày (Daily Review) vào Firestore thành công!');
    } catch (err: unknown) {
      toast.error('Lỗi khi lưu nhật ký');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nhật ký Học tập & Tổng kết Ngày
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {formatDateVN(today, { weekday: 'long', day: '2-digit', month: '2-digit' })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Đánh giá hiệu suất học tập • Nhìn nhận nguyên nhân tồn đọng • Lưu trữ theo ngày
          </p>
        </div>

        <Button onClick={handleSave} loading={loading}>
          <Save className="mr-1.5 h-4 w-4" />
          Lưu tổng kết
        </Button>
      </div>

      {/* Focus Self-Rating Star System */}
      <Card elevated className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">
            Mức độ tập trung tự đánh giá hôm nay:
          </span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground/40'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 font-mono font-bold text-amber-400 text-sm">
              {rating}/5 Sao
            </span>
          </div>
        </div>
      </Card>

      {/* 4 Review Prompts */}
      <div className="space-y-4">
        {/* Question 1 */}
        <Card elevated className="p-5 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> 1. Hôm nay tôi đã làm được gì?
          </label>
          <textarea
            rows={3}
            value={completedSummary}
            onChange={(e) => setCompletedSummary(e.target.value)}
            className="w-full rounded-xl border border-input bg-surface p-3 text-sm text-foreground focus:ring-1 focus:ring-primary"
          />
        </Card>

        {/* Question 2 */}
        <Card elevated className="p-5 space-y-2 border-warning/30">
          <label className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> 2. Việc chưa làm được và lý do vì sao?
          </label>
          <textarea
            rows={3}
            value={unfinishedReason}
            onChange={(e) => setUnfinishedReason(e.target.value)}
            className="w-full rounded-xl border border-input bg-surface p-3 text-sm text-foreground focus:ring-1 focus:ring-primary"
          />
        </Card>

        {/* Question 3 */}
        <Card elevated className="p-5 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> 3. Ngày mai ưu tiên những công việc gì?
          </label>
          <textarea
            rows={3}
            value={tomorrowPriorities}
            onChange={(e) => setTomorrowPriorities(e.target.value)}
            className="w-full rounded-xl border border-input bg-surface p-3 text-sm text-foreground focus:ring-1 focus:ring-primary"
          />
        </Card>

        {/* Question 4 */}
        <Card elevated className="p-5 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" /> 4. Ghi chú tự do & bài học rút ra
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-input bg-surface p-3 text-sm text-foreground focus:ring-1 focus:ring-primary"
          />
        </Card>
      </div>
    </div>
  );
}
