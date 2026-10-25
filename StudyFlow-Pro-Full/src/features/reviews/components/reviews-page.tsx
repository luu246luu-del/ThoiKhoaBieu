import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Send, Star, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores';
import {
  subscribePublicReviews, subscribeMyReview, submitSiteReview,
  type SiteReview,
} from '@/services/firebase/site-feedback-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function Stars({ value }: { value: number }) {
  return <span aria-label={`${value}/5 sao`} className="inline-flex gap-0.5 text-amber-400">
    {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < value ? 'fill-current' : 'opacity-30'}`} />)}
  </span>;
}

export function ReviewsPage() {
  const { user, profile, isDemo } = useAuthStore();
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [myReview, setMyReview] = useState<SiteReview | null>(null);
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [limited, setLimited] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState(false);

  useEffect(() => subscribePublicReviews((items, cap) => { setReviews(items); setLimited(cap); }, err => setError(`Không tải được đánh giá: ${err.message}`)), []);
  useEffect(() => {
    if (!user || isDemo) return;
    return subscribeMyReview(user.uid, item => {
      setMyReview(item);
      if (item && !edited) {
        setRating(item.rating);
        setAuthor(item.authorName);
        setMessage(item.message);
      }
    }, err => setError(`Không tải được đánh giá của bạn: ${err.message}`));
  }, [user, isDemo, edited]);
  useEffect(() => {
    if (!myReview && profile && !edited) setAuthor(profile.displayName || profile.username);
  }, [profile, edited, myReview]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      await submitSiteReview(author, rating, message);
      setNotice('Đã gửi góp ý. Phản hồi sẽ công khai sau khi chủ website duyệt.');
      setEdited(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể gửi đánh giá.'); }
    finally { setBusy(false); }
  };

  const avg = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '—';

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MessageSquareText className="h-9 w-9 text-primary" />
          <div><h1 className="text-2xl font-bold">Đánh giá & Phản hồi công khai</h1><p className="text-sm text-muted-foreground">Đóng góp giúp VanTien Study ngày càng tốt hơn</p></div>
        </div>
        <Link className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted" to="/"><ArrowLeft className="h-4 w-4" />Về trang học tập</Link>
      </header>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold">Ý kiến từ cộng đồng</h2><p className="text-xs text-muted-foreground">Chỉ hiển thị các phản hồi đã được duyệt</p></div>
            <div className="text-right"><p className="text-2xl font-bold text-amber-400">{avg} ★</p><p className="text-xs text-muted-foreground">{reviews.length} bài được hiển thị</p></div>
          </div>
          {limited && <p className="text-sm text-amber-400">Danh sách đang giới hạn 100 bài, điểm trung bình chỉ tính trên những bài hiển thị.</p>}
          {reviews.length === 0 && <p className="rounded-xl bg-muted/40 p-6 text-sm text-muted-foreground">Chưa có đánh giá công khai. Hãy là người đầu tiên gửi góp ý!</p>}
          {reviews.map(item => <article key={item.uid} className="space-y-2 rounded-xl border border-border/70 bg-background/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.authorName}</p><Stars value={item.rating} /></div>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.message}</p>
            <p className="text-xs text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Vừa gửi'}</p>
          </article>)}
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Đánh giá VanTien Study</h2>
          <p className="text-xs text-muted-foreground">Mỗi tài khoản có một bài đánh giá; có thể cập nhật bất cứ lúc nào. Mỗi lần chỉnh sửa cần được duyệt lại.</p>
          {!user || isDemo ? <div className="space-y-3 rounded-xl bg-muted/40 p-4 text-sm"><p>Đăng nhập tài khoản thật để gửi đánh giá.</p><Link to="/login" className="font-semibold text-primary underline">Đăng nhập ngay</Link></div> :
            <form onSubmit={submit} className="space-y-4">
              <label className="block space-y-1"><span className="text-sm font-semibold">Tên hiển thị công khai</span><Input value={author} maxLength={80} onChange={e => { setAuthor(e.target.value); setEdited(true); }} required /></label>
              <fieldset className="space-y-2"><legend className="text-sm font-semibold">Chấm điểm</legend><div className="flex gap-2">
                {Array.from({ length: 5 }, (_, i) => <button key={i} type="button" onClick={() => { setRating(i + 1); setEdited(true); }} aria-label={`Chọn ${i + 1} sao`} className="rounded-lg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><Star className={`h-7 w-7 text-amber-400 ${i < rating ? 'fill-current' : 'opacity-40'}`} /></button>)}
              </div></fieldset>
              <label className="block space-y-1"><span className="text-sm font-semibold">Góp ý (10–800 ký tự)</span><textarea className="min-h-[140px] w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" minLength={10} maxLength={800} value={message} onChange={e => { setMessage(e.target.value); setEdited(true); }} placeholder="Điểm bạn thích, những gì cần cải thiện..." required /></label>
              {myReview && <p className="text-xs text-muted-foreground">Bài hiện tại: {myReview.status === 'approved' ? 'Đã công khai' : myReview.status === 'pending' ? 'Đang chờ duyệt' : 'Đã ẩn'}</p>}
              <Button disabled={busy} className="w-full" type="submit"><Send className="mr-2 h-4 w-4" />{busy ? 'Đang gửi...' : myReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</Button>
              <div className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Không gửi số điện thoại, mật khẩu hoặc dữ liệu cá nhân trong nội dung công khai.</div>
            </form>
          }
          {notice && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">{notice}</p>}
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </aside>
      </section>
    </div>
  </main>;
}
