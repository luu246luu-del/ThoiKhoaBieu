import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowLeft, BarChart3, BookOpenText, CalendarDays, CheckCheck, CheckCircle2,
  Clock3, ExternalLink, Eye, ListChecks, MessageSquareText, RefreshCw,
  ShieldCheck, Star, Target, Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyOwner } from '@/services/firebase/admin-service';
import {
  ACTIVITY_COLLECTIONS, ADMIN_MAX_USERS, subscribeAdminProfiles, subscribeUserActivity,
  dateText, type ActivityCollection, type LiveUserProfile, type LiveUserUsage,
} from '@/services/firebase/admin-live-service';
import {
  moderateReview, subscribeAllReviews, type SiteReview,
} from '@/services/firebase/site-feedback-service';

const AUTH_CONSOLE = 'https://console.firebase.google.com/project/studyflow-pro-56cbc/authentication/users';
const sectionLabels: Record<ActivityCollection, string> = {
  tasks: 'Công việc', calendarEvents: 'Sự kiện lịch', focusSessions: 'Phiên Focus',
  habits: 'Thói quen', habitLogs: 'Lần tích thói quen', dailyReviews: 'Nhật ký',
  projects: 'Dự án cũ', goals: 'Lộ trình / Mục tiêu', learningModules: 'Module học tập',
  lessons: 'Bài học', recurringRules: 'Lịch lặp', reminders: 'Nhắc việc',
  notificationDevices: 'Thiết bị thông báo',
};
const todayVN = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const dateBefore = (days: number) => new Date(Date.now() + 7 * 3_600_000 - days * 86_400_000).toISOString().slice(0, 10);
const formatHours = (ms: number) => `${(ms / 3_600_000).toFixed(1)}h`;
const n = (value: number) => value.toLocaleString('vi-VN');

type Tab = 'overview' | 'users' | 'feedback';

function Metric({ title, value, note, icon: Icon }: {
  title: string; value: string; note?: string; icon: typeof Users;
}) {
  return <div className="min-w-0 space-y-2 rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground"><span>{title}</span><Icon className="h-5 w-5 shrink-0 text-primary" /></div>
    <p className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
  </div>;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user, isDemo, isInitialized } = useAuthStore();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [profiles, setProfiles] = useState<LiveUserProfile[]>([]);
  const [truncatedProfiles, setTruncatedProfiles] = useState(false);
  const [usage, setUsage] = useState<Record<string, LiveUserUsage>>({});
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [reviewsLimited, setReviewsLimited] = useState(false);
  const [workingUid, setWorkingUid] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isInitialized) return;
    let mounted = true;
    if (!user || isDemo) { setAuthorized(false); return; }
    setAuthorized(null);
    void verifyOwner().then(value => { if (mounted) setAuthorized(value); })
      .catch(() => { if (mounted) setAuthorized(false); });
    return () => { mounted = false; };
  }, [isInitialized, isDemo, user]);

  useEffect(() => {
    if (!authorized) return;
    setError('');
    return subscribeAdminProfiles((next, limited) => {
      setProfiles(next);
      setTruncatedProfiles(limited);
    }, err => setError(`Không truy cập được danh sách hồ sơ: ${err.message}`));
  }, [authorized, revision]);

  const profileIds = profiles.map(p => p.uid).join('|');
  useEffect(() => {
    if (!authorized) return;
    const ids = profileIds ? profileIds.split('|') : [];
    setUsage(prev => Object.fromEntries(Object.entries(prev).filter(([uid]) => ids.includes(uid))));
    const subscriptions = ids.map(uid => subscribeUserActivity(uid, value => {
      setUsage(prev => ({ ...prev, [uid]: value }));
    }));
    return () => subscriptions.forEach(stop => stop());
  }, [authorized, profileIds, revision]);

  useEffect(() => {
    if (!authorized) return;
    return subscribeAllReviews((items, limited) => {
      setReviews(items); setReviewsLimited(limited);
    }, err => setError(`Không tải được phản hồi: ${err.message}`));
  }, [authorized, revision]);

  const totals = useMemo(() => {
    const byCollection = Object.fromEntries(ACTIVITY_COLLECTIONS.map(key => [key, 0])) as Record<ActivityCollection, number>;
    const focusByDay: Record<string, number> = {};
    const focusByCategory: Record<string, number> = {};
    let completed = 0, overdue = 0, rescheduled = 0, focusMs = 0, focusCompleted = 0;
    let habitsChecked = 0, roadmapProjects = 0, roadmapModules = 0, roadmapSteps = 0, roadmapStepsDone = 0;
    let loaded = 0; const errors: string[] = []; const truncated: string[] = [];
    for (const profile of profiles) {
      const item = usage[profile.uid];
      if (!item) continue;
      loaded += item.loaded;
      errors.push(...item.errorKeys.map(key => `${profile.username || profile.uid}: ${sectionLabels[key]}`));
      truncated.push(...item.truncatedKeys.map(key => `${profile.username || profile.uid}: ${sectionLabels[key]}`));
      for (const key of ACTIVITY_COLLECTIONS) byCollection[key] += item.counts[key] ?? 0;
      completed += item.tasksCompleted; overdue += item.tasksOverdue; rescheduled += item.tasksRescheduled;
      focusMs += item.focusMs; focusCompleted += item.focusCompleted;
      habitsChecked += item.habitsChecked;
      roadmapProjects += item.roadmapProjects;
      roadmapModules += item.roadmapModules;
      roadmapSteps += item.roadmapSteps;
      roadmapStepsDone += item.roadmapStepsDone;
      for (const [day, ms] of Object.entries(item.focusDailyMs)) focusByDay[day] = (focusByDay[day] ?? 0) + ms;
      for (const [category, ms] of Object.entries(item.focusByCategory)) focusByCategory[category] = (focusByCategory[category] ?? 0) + ms;
    }
    return { byCollection, completed, overdue, rescheduled, focusMs, focusCompleted,
      habitsChecked, roadmapProjects, roadmapModules, roadmapSteps, roadmapStepsDone,
      focusByDay, focusByCategory, loaded, errors, truncated };
  }, [profiles, usage]);

  const complete = profiles.length > 0 && totals.loaded === profiles.length * ACTIVITY_COLLECTIONS.length &&
    totals.errors.length === 0 && totals.truncated.length === 0 && !truncatedProfiles;
  const display = (value: number) => complete ? n(value) : '—';
  const inspected = profiles.find(p => p.uid === selectedUid) ?? null;
  const inspectedUsage = inspected ? usage[inspected.uid] : null;
  const shownUsers = profiles.filter(p => `${p.username} ${p.displayName}`.toLowerCase().includes(filter.toLowerCase()));
  const days = Array.from({ length: 7 }, (_, i) => dateBefore(6 - i));
  const maxDay = Math.max(1, ...days.map(day => totals.focusByDay[day] ?? 0));
  const reviewPending = reviews.filter(r => r.status === 'pending').length;

  async function setReviewStatus(uid: string, status: 'approved' | 'hidden') {
    setWorkingUid(uid); setError('');
    try { await moderateReview(uid, status); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được đánh giá.'); }
    finally { setWorkingUid(null); }
  }

  if (authorized === null) return <main className="flex min-h-screen items-center justify-center bg-background text-foreground">Đang xác minh quyền Owner...</main>;
  if (!authorized) return <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
    <div className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-6"><ShieldCheck className="h-8 w-8 text-primary" /><h1 className="text-xl font-bold">Không có quyền quản trị</h1>
    <p className="text-sm text-muted-foreground">Chỉ tài khoản có Custom Claims admin=true và owner=true mới được xem bảng điều khiển này.</p><Link className="text-primary underline" to="/">Về trang học tập</Link></div>
  </main>;

  return <main className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><ShieldCheck className="h-9 w-9 text-primary" /><div><h1 className="text-2xl font-bold">VanTien Admin Studio</h1><p className="text-xs text-muted-foreground">Dữ liệu Firestore trực tiếp · Firebase Spark · Owner</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" />Vào trang học tập</Button><Button variant="outline" onClick={() => setRevision(r => r + 1)}><RefreshCw className="mr-2 h-4 w-4" />Làm mới kết nối</Button></div>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Các mục quản trị">
        {([['overview', 'Tổng quan'], ['users', 'Người dùng'], ['feedback', `Đánh giá (${reviewPending} chờ duyệt)`]] as const).map(([id, text]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'}`}>{text}</button>)}
      </nav>
      {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className={`rounded-xl border p-3 text-sm ${complete ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-amber-500/30 bg-amber-500/5 text-amber-300'}`}>
        <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" />{complete ? 'Đang nhận cập nhật thời gian thực từ toàn bộ phân hệ đã cấu hình.' : `Đang tải / thiếu dữ liệu: ${totals.loaded}/${profiles.length * ACTIVITY_COLLECTIONS.length} luồng.`}</span>
        {truncatedProfiles && <p className="mt-1">Chỉ theo dõi tối đa {ADMIN_MAX_USERS} hồ sơ. Các tổng số hiện chưa đầy đủ.</p>}
        {totals.errors.length > 0 && <p className="mt-1">Không đọc được: {totals.errors.slice(0, 5).join(', ')}. Cần kiểm tra Security Rules.</p>}
        {totals.truncated.length > 0 && <p className="mt-1">Vượt 500 bản ghi ở: {totals.truncated.slice(0, 5).join(', ')}. Các tổng số chưa đầy đủ.</p>}
        <p className="mt-1 text-xs opacity-80">Các con số là hoạt động đã ghi trong Firestore, không phải số lần bấm/chế độ đang mở hay người online. Firebase Authentication có báo cáo tài khoản riêng.</p>
      </div>

      {tab === 'overview' && <>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Hồ sơ Firestore" value={truncatedProfiles ? `${profiles.length}+` : n(profiles.length)} note="Theo dõi thay đổi trực tiếp" icon={Users}/>
          <Metric title="Tổng công việc" value={display(totals.byCollection.tasks)} note={`${display(totals.completed)} hoàn thành · ${display(totals.overdue)} quá hạn`} icon={ListChecks}/>
          <Metric title="Thời gian tập trung" value={complete ? formatHours(totals.focusMs) : '—'} note={`${display(totals.focusCompleted)} phiên hợp lệ`} icon={Clock3}/>
          <Metric title="Lộ trình & dự án" value={display(totals.roadmapProjects)} note={`${display(totals.roadmapStepsDone)}/${display(totals.roadmapSteps)} bước đã tích`} icon={Target}/>
          <Metric title="Sự kiện lịch" value={display(totals.byCollection.calendarEvents)} note={`${display(totals.rescheduled)} công việc từng dời lịch`} icon={CalendarDays}/>
          <Metric title="Thói quen" value={display(totals.byCollection.habits)} note={`${display(totals.habitsChecked)} lượt tích`} icon={CheckCheck}/>
          <Metric title="Nhật ký & bài học" value={display(totals.byCollection.dailyReviews + totals.byCollection.lessons)} note="Bản ghi nhật ký và bài học" icon={BookOpenText}/>
          <Metric title="Phản hồi website" value={reviewsLimited ? `${reviews.length}+` : n(reviews.length)} note={`${n(reviewPending)} đang chờ duyệt`} icon={MessageSquareText}/>
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-primary" />Giờ Focus trong 7 ngày gần nhất</h2>
            {!complete && <p className="text-xs text-amber-300">Đang đồng bộ dữ liệu, biểu đồ có thể chưa đầy đủ.</p>}
            <div className="flex h-48 items-end gap-3" aria-label="Biểu đồ thời gian tập trung bảy ngày">
              {days.map(day => <div key={day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-muted-foreground">{Math.round((totals.focusByDay[day] ?? 0)/60000)}m</span><div className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-primary to-accent" style={{ height: `${Math.max(3,(totals.focusByDay[day] ?? 0)/maxDay*100)}%` }} title={`${day}: ${Math.round((totals.focusByDay[day]??0)/60000)} phút`}/><span className="text-[10px] text-muted-foreground">{day.slice(8)}</span></div>)}
            </div>
            <p className="text-xs text-muted-foreground">Giờ Việt Nam (UTC+7). Chỉ cộng những phiên có trạng thái completed; không tính thời gian dừng.</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Phân bổ Focus theo lĩnh vực</h2>
            {Object.entries(totals.focusByCategory).length === 0 && <p className="text-sm text-muted-foreground">Chưa có Focus hoàn thành.</p>}
            {Object.entries(totals.focusByCategory).sort((a,b)=>b[1]-a[1]).map(([category,ms]) => <div key={category} className="space-y-1"><div className="flex justify-between gap-2 text-sm"><span className="truncate">{category}</span><span>{formatHours(ms)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${totals.focusMs ? ms / totals.focusMs * 100 : 0}%` }}/></div></div>)}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Toàn bộ phân hệ dữ liệu đang được theo dõi</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ACTIVITY_COLLECTIONS.map(key => <div key={key} className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2 text-sm"><span className="text-muted-foreground">{sectionLabels[key]}</span><strong>{display(totals.byCollection[key])}</strong></div>)}</div>
        </section>
      </>}

      {tab === 'users' && <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Hồ sơ người dùng ({profiles.length})</h2><Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Tìm tên / username" className="w-full sm:w-56" /></div>
          {shownUsers.map(profile => <button key={profile.uid} onClick={() => setSelectedUid(profile.uid)} className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm hover:border-primary/60 ${selectedUid === profile.uid ? 'border-primary bg-primary/5' : 'border-border'}`}><div><p className="font-semibold">{profile.displayName || profile.username || 'Học viên'} {user?.uid===profile.uid && <span className="text-xs text-primary">Owner</span>}</p><p className="text-xs text-muted-foreground">@{profile.username || '—'} · {dateText(profile.createdAt)}</p></div><span className="inline-flex items-center gap-1 text-xs text-primary"><Eye className="h-4 w-4" />Chi tiết</span></button>)}
          {shownUsers.length === 0 && <p className="text-sm text-muted-foreground">Chưa có hồ sơ phù hợp.</p>}
          <p className="text-xs text-muted-foreground">Thông tin đăng nhập cuối, email và khóa tài khoản chỉ có tại <a className="text-primary underline" href={AUTH_CONSOLE} target="_blank" rel="noreferrer">Firebase Authentication <ExternalLink className="inline h-3 w-3"/></a>.</p>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Chi tiết sử dụng</h2>
          {!inspected ? <p className="text-sm text-muted-foreground">Chọn tài khoản bên trái để xem tiến độ và tất cả phân hệ.</p> : <>
            <div className="space-y-1 break-words text-sm"><p><strong>Tên:</strong> {inspected.displayName || '—'}</p><p><strong>Username:</strong> {inspected.username || '—'}</p><p><strong>UID:</strong> <span className="break-all font-mono text-xs">{inspected.uid}</span></p><p><strong>Ngày tạo:</strong> {dateText(inspected.createdAt)}</p><p><strong>Cập nhật:</strong> {dateText(inspected.updatedAt)}</p><p><strong>Múi giờ:</strong> {inspected.timezone || '—'}</p><p><strong>Ngôn ngữ:</strong> {inspected.locale || '—'}</p><p><strong>Giao diện:</strong> {inspected.theme || '—'}</p><p><strong>Nhóm môn:</strong> {inspected.categories.map(c=>c.name).join(', ') || '—'}</p><p><strong>Ghi dữ liệu gần nhất:</strong> {inspectedUsage ? dateText(inspectedUsage.latestSavedAt) : 'Đang tải'}</p></div>
            {inspectedUsage ? <><div className="grid grid-cols-2 gap-2"><Metric title="Đã xong" value={n(inspectedUsage.tasksCompleted)} icon={CheckCircle2}/><Metric title="Focus" value={formatHours(inspectedUsage.focusMs)} icon={Clock3}/><Metric title="Quá hạn" value={n(inspectedUsage.tasksOverdue)} icon={ListChecks}/><Metric title="Bước lộ trình" value={`${inspectedUsage.roadmapStepsDone}/${inspectedUsage.roadmapSteps}`} icon={Target}/></div>
            <div className="space-y-2"><h3 className="text-sm font-semibold">13 phân hệ Firestore</h3>{ACTIVITY_COLLECTIONS.map(key => <div key={key} className="flex justify-between border-b border-border/40 pb-1 text-xs"><span className="text-muted-foreground">{sectionLabels[key]}</span><span>{inspectedUsage.errorKeys.includes(key) ? 'Lỗi quyền' : inspectedUsage.counts[key] ?? 'Đang tải'}</span></div>)}</div></> : <p className="text-sm text-muted-foreground">Đang lấy dữ liệu từ Firestore...</p>}
          </>}
        </aside>
      </section>}

      {tab === 'feedback' && <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">Duyệt đánh giá công khai</h2><p className="text-xs text-muted-foreground">Chỉ bài đã duyệt mới xuất hiện với mọi người.</p></div><Link to="/reviews" className="text-sm text-primary underline">Mở trang đánh giá</Link></div>
        {reviewsLimited && <p className="text-sm text-amber-400">Chỉ đang tải 500 đánh giá; danh sách có thể chưa đầy đủ.</p>}
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">Chưa có phản hồi.</p>}
        <div className="grid gap-3 md:grid-cols-2">{reviews.map(review => <article key={review.uid} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-2"><p className="font-semibold">{review.authorName}</p><span className="text-sm text-amber-400">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div>
          <p className="whitespace-pre-wrap break-words text-sm">{review.message}</p><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Trạng thái: {review.status === 'pending' ? 'Chờ duyệt' : review.status === 'approved' ? 'Đã công khai' : 'Đã ẩn'}</span><span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : 'Mới'}</span></div>
          <div className="flex gap-2"><Button disabled={workingUid===review.uid || review.status==='approved'} size="sm" onClick={() => void setReviewStatus(review.uid,'approved')}><CheckCircle2 className="mr-1 h-4 w-4"/>Duyệt</Button><Button disabled={workingUid===review.uid || review.status==='hidden'} variant="outline" size="sm" onClick={() => void setReviewStatus(review.uid,'hidden')}>Ẩn</Button></div>
        </article>)}</div>
      </section>}
      <p className="text-xs text-muted-foreground">Phiên bản cá nhân: dùng Firestore Spark. Số liệu đổi khi các tài liệu được ghi; không đo lượt xem trang, người online hay hành động chưa lưu. Listener nhiều có thể tiêu thụ quota đọc Firestore. <span className="font-medium">Hôm nay: {todayVN()}.</span></p>
    </div>
  </main>;
}
