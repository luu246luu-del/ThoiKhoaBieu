import { useMemo,useState } from 'react';
import { AlertTriangle,Activity,ArrowDownRight,ArrowUpRight,BarChart3,CalendarCheck2,CheckCircle2,Clock3,Download,Flame,FolderKanban,History,TimerReset,TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useDataStore } from '@/stores';
import { useAuthStore } from '@/stores/auth-store';
import { DEFAULT_CATEGORIES } from '@/types';
import { useRoadmapPlans } from '@/features/roadmap/use-roadmap-plans';
import { countSteps,percent,projectSteps } from '@/features/roadmap/roadmap-model';
import { computeMetrics,duration,type TimeFilter } from '../analytics-metrics';

const dateLabel=(day:string)=>day.split('-').reverse().slice(0,2).join('/');
const fmt=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
function downloadCSV(name:string,rows:(string|number)[][]){
  const quote=(value:string|number)=>{
    const text=String(value);
    const safe=/^[=+@\-\t\r]/.test(text)?`'${text}`:text;
    return `"${safe.replace(/"/g,'""')}"`;
  };
  const content='\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Stat({label,value,note,tone='text-foreground',icon:Icon}:{label:string;value:string;note:string;tone?:string;icon:typeof Clock3}){
  return <Card elevated className="p-3 sm:p-4 space-y-2 min-w-0">
    <div className="flex items-start justify-between gap-2"><p className="text-[11px] uppercase font-semibold tracking-wide text-muted-foreground">{label}</p><Icon className="w-4 h-4 shrink-0 text-muted-foreground"/></div>
    <p className={`font-mono tabular-nums font-bold text-xl sm:text-2xl break-all ${tone}`}>{value}</p>
    <p className="text-[11px] text-muted-foreground">{note}</p>
  </Card>;
}
export function AnalyticsPage(){
  const {tasks,focusSessions}=useDataStore();
  const profile=useAuthStore(s=>s.profile);
  const {plans,loaded,error}=useRoadmapPlans();
  const [period,setPeriod]=useState<TimeFilter>('week');
  // Recompute from real Firestore rows only. No demo values, simulated timers or setInterval.
  const now=new Date();
  const categories=profile?.categories?.length?profile.categories:DEFAULT_CATEGORIES;
  const goals=profile?.weeklyGoals||{};
  const data=useMemo(()=>computeMetrics(tasks,focusSessions,period,categories,goals,now),[tasks,focusSessions,period,categories,goals,now.getDate(),now.getMonth(),now.getFullYear()]);
  const allRoadmap=plans.reduce((summary,p)=>{const counts=countSteps(p);return {done:summary.done+counts.done,total:summary.total+counts.total};},{done:0,total:0});
  const axis=period==='today'?data.hours.map(x=>({label:`${String(x.hour).padStart(2,'0')}h`,ms:x.ms})):data.daily.map(x=>({label:dateLabel(x.day),ms:x.ms}));
  const maxBar=Math.max(1,...axis.map(x=>x.ms));
  const modeLabel:Record<string,string>={countdown:'Đếm ngược',stopwatch:'Đếm xuôi',pomodoro:'Pomodoro',deep_focus:'Deep Focus',clock:'Đồng hồ'};
  function exportFocus(){
    const rows:[string|number,...(string|number)[]][]=[['Ngày','Giờ bắt đầu','Môn học','Chế độ','Giây tập trung','Phút tập trung','Task ID','Focus ID']];
    for(const s of data.selected){const d=s.startedAt.toDate();rows.push([d.toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),d.toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),categories.find(x=>x.id===s.categoryId)?.name||s.categoryId,s.mode,Math.floor(s.actualFocusMs/1000),(s.actualFocusMs/60000).toFixed(2),s.taskId||'',s.id]);}
    downloadCSV(`vantien_focus_${period}_${data.today}.csv`,rows);toast.success(`Đã xuất ${data.selected.length} phiên Focus`);
  }
  function exportTasks(){
    const rows:(string|number)[][]=[['Tên công việc','Môn học','Trạng thái','Độ ưu tiên','Ngày tạo','Ngày hoàn thành','Deadline','Số lần dời lịch','Checklist xong','Checklist tổng']];
    for(const t of tasks){rows.push([t.title,categories.find(c=>c.id===t.categoryId)?.name||t.categoryId,t.status,t.priority,t.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')||'',t.completedAt?.toDate?.()?.toLocaleDateString('vi-VN')||'',t.deadline?.toDate?.()?.toLocaleDateString('vi-VN')||'',t.rescheduleHistory?.length||0,t.subtasks?.filter(x=>x.completed).length||0,t.subtasks?.length||0]);}
    downloadCSV(`vantien_tasks_${data.today}.csv`,rows);toast.success(`Đã xuất ${tasks.length} công việc`);
  }
  function exportRoadmap(){
    const rows:(string|number)[][]=[['Lộ trình','Dự án','Module','Bước nhỏ','Trạng thái']];
    for(const p of plans)for(const project of p.projects)for(const m of project.modules)for(const s of m.steps)rows.push([p.title,project.title,m.title,s.title,s.completed?'Hoàn thành':'Chưa hoàn thành']);
    downloadCSV(`vantien_roadmap_${data.today}.csv`,rows);toast.success('Đã xuất tiến độ lộ trình');
  }
  const timeText=period==='today'?'Hôm nay':period==='week'?'7 ngày gần nhất':'30 ngày gần nhất';
  return <div className="space-y-5 pb-12 animate-fade-in">
    <header className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
      <div><div className="flex items-center flex-wrap gap-2"><h1 className="text-2xl font-bold tracking-tight">Analytics Studio</h1><Badge variant="engineer" className="text-[10px]">DỮ LIỆU THỰC</Badge></div><p className="text-xs text-muted-foreground mt-1">Theo dõi tiến độ từ Task, Focus Session và checklist Roadmap đã lưu · Múi giờ Việt Nam</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex border border-border bg-surface rounded-xl p-1 gap-1">{([['today','Hôm nay'],['week','7 ngày'],['month','30 ngày']] as const).map(([v,l])=><button key={v} onClick={()=>setPeriod(v)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${v===period?'bg-primary text-primary-foreground':'text-muted-foreground hover:text-foreground'}`}>{l}</button>)}</div>
        <Button size="sm" variant="outline" onClick={exportFocus}><Download className="w-4 h-4 mr-1"/>Focus CSV</Button>
        <Button size="sm" variant="outline" onClick={exportTasks}><Download className="w-4 h-4 mr-1"/>Tasks CSV</Button>
        <Button size="sm" variant="outline" onClick={exportRoadmap}><Download className="w-4 h-4 mr-1"/>Roadmap CSV</Button>
      </div>
    </header>
    {error&&<div className="text-sm text-red-300 border border-red-500/40 rounded-xl p-3">Không tải được thống kê lộ trình: {error}</div>}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat icon={Clock3} label="Tập trung thực tế" value={duration(data.totalMs)} tone="text-primary" note={`${data.selected.length} phiên hợp lệ · ${data.uniqueFocusDays} ngày có học`}/>
      <Stat icon={TrendingUp} label="So với kỳ trước" value={data.focusPercentChange===null?'—':`${data.focusPercentChange>=0?'+':''}${data.focusPercentChange}%`} tone="text-accent" note={data.focusPercentChange===null?'Kỳ trước chưa ghi nhận Focus':`Kỳ trước: ${duration(data.previousMs)}`}/>
      <Stat icon={TimerReset} label="Phiên dài nhất" value={duration(data.longest)} tone="text-purple-400" note={`Trung bình ${duration(data.average)} · Trung vị ${duration(data.median)}`}/>
      <Stat icon={Flame} label="Chuỗi học liên tiếp" value={`${data.streak} ngày`} tone="text-amber-400" note={`Đếm ngày có phiên Focus hoàn thành`}/>
      <Stat icon={CheckCircle2} label="Task hoàn thành trong kỳ" value={fmt(data.completedInWindow.length)} tone="text-emerald-400" note={`${fmt(data.createdInWindow.length)} công việc được tạo trong kỳ`}/>
      <Stat icon={CalendarCheck2} label="Tỷ lệ Task hiện tại" value={`${data.taskRate}%`} tone="text-foreground" note={`${data.active.filter(t=>t.status==='completed').length}/${data.active.length} task không lưu trữ đã hoàn thành`}/>
      <Stat icon={AlertTriangle} label="Task quá hạn" value={fmt(data.overdue.length)} tone="text-amber-400" note="Chưa hoàn thành và deadline đã qua"/>
      <Stat icon={History} label="Lần dời lịch trong kỳ" value={fmt(data.reschedules.length)} tone="text-orange-400" note="Lọc theo thời điểm thực hiện dời lịch"/>
    </div>
    <div className="grid xl:grid-cols-3 gap-4">
      <Card elevated className="p-4 sm:p-5 space-y-4 xl:col-span-2 min-w-0">
        <div><h2 className="font-bold text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/> Biểu đồ thời gian tập trung · {timeText}</h2><p className="text-xs text-muted-foreground">{period==='today'?'Theo giờ bắt đầu phiên trong ngày':'Theo ngày bắt đầu phiên'} · chỉ phiên hoàn thành, không cộng thời gian tạm dừng</p></div>
        <div className="overflow-x-auto pb-1"><div className={`flex items-end gap-1 sm:gap-2 h-52 border-b border-border/60 pb-1 ${period==='month'?'min-w-[750px]':'min-w-[360px]'}`}>
          {axis.map((x,i)=><div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1" title={`${x.label}: ${duration(x.ms)}`}>
            <span className="text-[9px] text-muted-foreground tabular-nums whitespace-nowrap">{x.ms>0?`${Math.round(x.ms/60000)}p`:''}</span>
            <div style={{height:`${x.ms?Math.max(4,x.ms/maxBar*164):2}px`}} className={`w-full rounded-t-sm max-w-8 transition-[height] duration-200 ${x.ms?'bg-gradient-to-t from-primary to-purple-400':'bg-muted/40'}`}/>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">{period==='today'?(i%3===0?x.label:''):period==='month'?(i%3===0?x.label:''):x.label}</span>
          </div>)}
        </div></div>
        <p className="text-xs text-muted-foreground">Tổng kỳ: <strong className="text-foreground font-mono">{duration(data.totalMs)}</strong> · Trung bình {duration(data.totalMs/(period==='today'?1:data.days))}/ngày lịch</p>
      </Card>
      <Card elevated className="p-4 sm:p-5 space-y-4">
        <h2 className="font-bold text-base flex items-center gap-2"><Activity className="w-4 h-4 text-accent"/> Theo phương pháp Focus</h2>
        {data.modes.length===0?<p className="text-sm text-muted-foreground">Chưa ghi nhận phiên tập trung nào trong kỳ.</p>:data.modes.map(m=><div key={m.mode} className="space-y-1.5"><div className="flex justify-between gap-2 text-sm"><span>{({countdown:'Đếm ngược',stopwatch:'Đếm xuôi',pomodoro:'Pomodoro',deep_focus:'Deep Focus',clock:'Đồng hồ'} as Record<string,string>)[m.mode]||m.mode}</span><span className="font-mono text-xs">{duration(m.ms)}</span></div><Progress value={data.totalMs?m.ms/data.totalMs*100:0} className="h-2"/><p className="text-[11px] text-muted-foreground">{m.count} phiên</p></div>)}
      </Card>
    </div>
    <Card elevated className="p-4 sm:p-6 space-y-5">
      <div><h2 className="font-bold text-base">Phân bổ theo môn học</h2><p className="text-xs text-muted-foreground">Giờ Focus thực tế và mục tiêu tuần quy đổi theo {data.days} ngày. Nếu chưa đặt mục tiêu thì chỉ hiện thời lượng thực tế.</p></div>
      {data.subjects.length===0?<p className="text-sm text-muted-foreground">Chưa có dữ liệu Focus hoặc mục tiêu cho kỳ này.</p>:<div className="grid md:grid-cols-2 gap-5">{data.subjects.map(s=><div key={s.id} className="space-y-2 min-w-0"><div className="flex justify-between gap-2 items-center text-sm"><span className="font-semibold truncate">{s.name}</span><span className="font-mono text-xs tabular-nums shrink-0">{duration(s.ms)}{s.goalMs>0?` / ${duration(s.goalMs)}`:''}</span></div><Progress value={s.goalMs>0?Math.min(100,s.ms/s.goalMs*100):(data.totalMs?s.ms/data.totalMs*100:0)} className="h-2"/><p className="text-xs text-muted-foreground">{s.sessions} phiên · {s.goalMs>0?`${Math.round(s.ms/s.goalMs*100)}% mục tiêu`:`${Math.round(s.ms/(data.totalMs||1)*100)}% tổng thời gian`}</p></div>)}</div>}
    </Card>
    <div className="grid lg:grid-cols-2 gap-4">
      <Card elevated className="p-4 sm:p-6 space-y-4"><h2 className="font-bold text-base">Công việc theo môn học · toàn thời gian</h2><p className="text-xs text-muted-foreground">Mẫu số là tổng Task hiện có, không tính đã lưu trữ. Không suy diễn từ Focus.</p>
        {data.taskByCategory.length===0?<p className="text-xs text-muted-foreground">Chưa có công việc.</p>:data.taskByCategory.map(s=><div key={s.id} className="space-y-1.5"><div className="flex justify-between gap-2 text-sm"><span>{s.name}</span><span className="text-xs font-mono">{s.completed}/{s.total} · {percent(s.completed,s.total)}%</span></div><Progress value={percent(s.completed,s.total)} className="h-2"/></div>)}
      </Card>
      <Card elevated className="p-4 sm:p-6 space-y-4"><div className="flex justify-between gap-2"><h2 className="font-bold text-base">Lộ trình · tiến độ checklist</h2><Badge variant="secondary">{allRoadmap.done}/{allRoadmap.total} bước</Badge></div>
        {!loaded?<p className="text-xs text-muted-foreground">Đang đồng bộ lộ trình...</p>:plans.map(p=>{const total=countSteps(p);return <div key={p.id} className="space-y-1.5"><div className="flex justify-between text-sm gap-3"><span className="truncate">{p.title}</span><span className="text-xs font-mono shrink-0">{total.done}/{total.total} · {percent(total.done,total.total)}%</span></div><Progress value={percent(total.done,total.total)} className="h-2"/></div>;})}
      </Card>
    </div>
    <Card elevated className="p-4 sm:p-6 space-y-4"><h2 className="font-bold text-base flex items-center gap-2"><FolderKanban className="w-4 h-4 text-primary"/> Chi tiết tiến độ từng dự án</h2>
      {plans.flatMap(p=>p.projects.map(project=>({roadmap:p.title,project,progress:projectSteps(project)}))).length===0?<p className="text-sm text-muted-foreground">Chưa có dự án.</p>:
        <div className="grid md:grid-cols-2 gap-3">{plans.flatMap(p=>p.projects.map(project=>({roadmap:p.title,project,progress:projectSteps(project)}))).map(item=><div key={`${item.roadmap}:${item.project.id}`} className="rounded-xl border p-3 space-y-2"><p className="text-xs text-muted-foreground">{item.roadmap}</p><div className="flex justify-between gap-2"><strong className="text-sm break-words">{item.project.title}</strong><span className="font-mono text-xs shrink-0">{percent(item.progress.done,item.progress.total)}%</span></div><Progress value={percent(item.progress.done,item.progress.total)} className="h-1.5"/><p className="text-[11px] text-muted-foreground">{item.progress.done}/{item.progress.total} bước nhỏ · {item.project.modules.length} module</p></div>)}</div>}
    </Card>
    <div className="grid xl:grid-cols-2 gap-4">
      <Card elevated className="p-4 sm:p-6 space-y-3"><h2 className="font-bold text-base">Phiên Focus gần nhất trong kỳ</h2>
        <div className="overflow-x-auto"><table className="w-full text-xs min-w-[350px]"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Thời gian</th><th className="py-2">Môn học</th><th className="py-2 text-right">Tập trung</th></tr></thead><tbody>{[...data.selected].sort((a,b)=>b.startedAt.toMillis()-a.startedAt.toMillis()).slice(0,12).map(s=><tr key={s.id} className="border-b border-border/50"><td className="py-2 pr-2 whitespace-nowrap">{s.startedAt.toDate().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td className="py-2 pr-2">{categories.find(c=>c.id===s.categoryId)?.name||s.categoryId}</td><td className="py-2 text-right font-mono">{duration(s.actualFocusMs)}</td></tr>)}</tbody></table></div>
        {data.selected.length===0&&<p className="text-sm text-muted-foreground">Chưa có phiên Focus hợp lệ.</p>}
      </Card>
      <Card elevated className="p-4 sm:p-6 space-y-3"><h2 className="font-bold text-base">Lịch sử dời lịch trong kỳ</h2>
        {data.reschedules.length===0?<p className="text-sm text-muted-foreground">Chưa dời lịch trong kỳ.</p>:<div className="max-h-80 overflow-y-auto space-y-2">{data.reschedules.slice(0,20).map((r,i)=><div key={`${r.taskId}-${i}`} className="p-3 rounded-lg border text-xs space-y-1"><p className="font-semibold">{r.title}</p><p className="text-muted-foreground">{r.from} → {r.to}</p>{r.reason&&<p className="text-muted-foreground">Lý do: {r.reason}</p>}</div>)}</div>}
      </Card>
    </div>
    <p className="text-[11px] text-muted-foreground">Quy ước: Focus tính một lần theo ID và quy về ngày bắt đầu phiên (UTC+7), chỉ tính trạng thái completed có actualFocusMs lớn hơn 0. Chuỗi ngày học dựa trên ngày có Focus hoàn thành. Tiến độ Roadmap đếm bước checklist; không suy ra từ thời gian học. Tỷ lệ Task hiện tại và tiến độ Roadmap là số liệu toàn thời gian; các KPI còn lại theo khoảng được chọn.</p>
  </div>;
}
