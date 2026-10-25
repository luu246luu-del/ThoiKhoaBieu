import '@/styles/hero-calendar-addon.css';
import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, LockKeyhole, AlertTriangle, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDataStore } from '@/stores';
import { dayPlus, hasOverlap, hourMinute, localDay, parseSlot, slotEnd } from '@/lib/schedule';
import type { CalendarEvent } from '@/types';

type ViewMode = 'day' | 'week' | 'month' | 'agenda';
const categories = [
  ['engineer', 'Kỹ thuật'], ['korean', 'TOPIK'], ['english', 'TOEIC'],
  ['university', 'Đại học'], ['personal', 'Cá nhân'], ['rest', 'Nghỉ ngơi'],
] as const;
const colors: Record<string, string> = {
  engineer: 'bg-violet-500/15 border-violet-400/30 text-violet-400',
  korean: 'bg-pink-500/15 border-pink-400/30 text-pink-400',
  english: 'bg-blue-500/15 border-blue-400/30 text-blue-400',
  university: 'bg-amber-500/15 border-amber-400/30 text-amber-400',
  personal: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400',
  rest: 'bg-slate-500/15 border-slate-400/30 text-slate-400',
};
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(parseSlot(value,'12:00'));
const time = (value: Timestamp) => hourMinute(value.toDate());
const intervals = (events: CalendarEvent[]) => events.map(ev => ({id:ev.id,start:ev.startTime.toMillis(),end:ev.endTime.toMillis(),status:ev.status}));


// Một ngày học bắt đầu 03:00 và kết thúc sau mốc 01:00 sáng ngày hôm sau.
// Dữ liệu thực vẫn dùng ngày giờ tuyệt đối; đây chỉ là cách nhóm và trình bày lịch.
const STUDY_HOURS = Array.from({ length: 23 }, (_, index) =>
  `${String((index + 3) % 24).padStart(2, '0')}:00`
);

const studySlotDate = (day: string, hour: string): string =>
  Number(hour.slice(0, 2)) < 3 ? dayPlus(day, 1) : day;

const operationalDay = (value: Date = new Date()): string => {
  const date = localDay(value);
  return Number(hourMinute(value).slice(0, 2)) < 3 ? dayPlus(date, -1) : date;
};

export function CalendarPage() {
  const {events,tasks,addEvent,updateEvent,deleteEvent,rescheduleTask} = useDataStore();
  const [view,setView] = useState<ViewMode>(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'day' : 'week');
  const [anchor,setAnchor] = useState(operationalDay());
  const [dialog,setDialog] = useState(false);
  const [editId,setEditId] = useState<string | null>(null);
  const [title,setTitle] = useState('');
  const [category,setCategory] = useState('engineer');
  const [date,setDate] = useState(localDay());
  const [start,setStart] = useState('08:00');
  const [end,setEnd] = useState('09:00');
  const [repeat,setRepeat] = useState(0);
  const [saving,setSaving] = useState(false);
  const [draggedId,setDraggedId] = useState<string | null>(null);

  const anchorDate = parseSlot(anchor,'12:00');
  const weekdaysBefore = (anchorDate.getUTCDay() + 6) % 7; // Noon UTC+7 -> UTC 05:00, day unchanged
  const monday = dayPlus(anchor, -weekdaysBefore);
  const days = useMemo(() => view==='day' ? [anchor] : view==='month'
    ? Array.from({length:42},(_,i)=>dayPlus(dayPlus(`${anchor.slice(0,7)}-01`, -((parseSlot(`${anchor.slice(0,7)}-01`,'12:00').getUTCDay()+6)%7)),i))
    : Array.from({length:7},(_,i)=>dayPlus(monday,i)),[view,anchor,monday]);

  const relevant = useMemo(() => events.filter(ev => ev.status!=='cancelled').sort((a,b)=>a.startTime.toMillis()-b.startTime.toMillis()), [events]);
  const grouped = useMemo(() => {
    const result: Record<string, CalendarEvent[]> = {};
    for(const ev of relevant) {
      const key=localDay(ev.startTime.toDate());
      (result[key]??=[]).push(ev);
    }
    return result;
  },[relevant]);
  // Nhóm chỉ những ô giờ hiển thị; 00:xx và 01:xx được đưa về ngày học liền trước.
  // Không thay đổi timestamp thực trong Firestore và không ảnh hưởng lịch tháng.
  const studyEvents = useMemo(() => {
    const bucket: Record<string, CalendarEvent[]> = {};
    for (const event of relevant) {
      const hour = time(event.startTime).slice(0, 2);
      const key = `${operationalDay(event.startTime.toDate())}|${hour}`;
      (bucket[key] ??= []).push(event);
    }
    return bucket;
  }, [relevant]);

  const collisions = useMemo(() => relevant.reduce((sum,ev,i) => sum + (hasOverlap(ev.startTime.toMillis(), ev.endTime.toMillis(),intervals(relevant.slice(i+1)))?1:0),0),[relevant]);
  const jump = (dir:number) => {
    if(view==='month') {
      const current=parseSlot(`${anchor.slice(0,7)}-01`,'12:00');
      current.setUTCMonth(current.getUTCMonth()+dir);
      setAnchor(localDay(current));
    } else setAnchor(dayPlus(anchor,dir*(view==='day'?1:7)));
  };
  const openNew=(d=anchor, clock='08:00')=>{
    setEditId(null);setTitle('');setCategory('engineer');setDate(d);
    setStart(clock);setEnd(hourMinute(slotEnd(parseSlot(d,clock),60)));
    setRepeat(0);setDialog(true);
  };
  const openEdit=(ev:CalendarEvent)=>{
    if(ev.taskId){toast.info('Để đổi lịch nhiệm vụ, hãy sử dụng mục Tồn đọng / Dời lịch.');return;}
    setEditId(ev.id);setTitle(ev.title);setCategory(ev.categoryId);
    setDate(localDay(ev.startTime.toDate()));setStart(time(ev.startTime));setEnd(time(ev.endTime));
    setRepeat(0);setDialog(true);
  };
  const save = async (e:FormEvent)=>{
    e.preventDefault(); if(!title.trim()) {toast.error('Vui lòng nhập tên sự kiện');return;}
    setSaving(true);
    try{
      const current=events.find(item=>item.id===editId);
      const startDate=parseSlot(date,start), rawEnd=parseSlot(date,end), endDate=rawEnd <= startDate ? new Date(rawEnd.getTime() + 86400000) : rawEnd;
      if(end === start) throw new Error('Giờ bắt đầu và kết thúc phải khác nhau');
      const busy=intervals(events).filter(item=>item.id!==editId);
      for(let i=0;i<=repeat;i++) {
        const s=new Date(startDate.getTime()+i*7*86400000);
        const e=new Date(endDate.getTime()+i*7*86400000);
        if(hasOverlap(s.getTime(),e.getTime(),busy)) throw new Error(`Trùng lịch ngày ${localDay(s)}. Chưa lưu, vui lòng đổi giờ.`);
        busy.push({id:`new-${i}`,start:s.getTime(),end:e.getTime(),status:'scheduled'});
      }
      if(current){
        await updateEvent({...current,title:title.trim(),categoryId:category,color:category,startTime:Timestamp.fromDate(startDate),endTime:Timestamp.fromDate(endDate)});
      } else {
        for(let i=0;i<=repeat;i++) {
          const s=new Date(startDate.getTime()+i*7*86400000),e=new Date(endDate.getTime()+i*7*86400000);
          await addEvent({title:title.trim(),categoryId:category,color:category,
            startTime:Timestamp.fromDate(s),endTime:Timestamp.fromDate(e),
            isAllDay:false,isFixed:category==='university',isRecurringException:false,status:'scheduled'});
        }
      }
      toast.success('Đã lưu lịch');setDialog(false);
    }catch(err){toast.error(err instanceof Error?err.message:'Không lưu được sự kiện');}
    finally{setSaving(false);}
  };
  const remove=async(ev:CalendarEvent)=>{
    if(ev.taskId){toast.error('Sự kiện này liên kết nhiệm vụ. Hãy xử lý trong mục Công việc.');return;}
    if(!window.confirm(`Xóa lịch "${ev.title}"?`))return;
    try{await deleteEvent(ev.id);toast.success('Đã xóa lịch');}catch{toast.error('Không xóa được lịch');}
  };
  const move=async(id:string,newDate:string,newTime:string)=>{
    const ev=events.find(item=>item.id===id); if(!ev)return;
    if(ev.isFixed){toast.warning('Lịch cố định không được kéo dời');return;}
    try{
      const s=parseSlot(newDate,newTime), duration=Math.round((ev.endTime.toMillis()-ev.startTime.toMillis())/60000);
      const e=slotEnd(s,duration);
      if(hasOverlap(s.getTime(),e.getTime(),intervals(events),id))throw new Error('Giờ mới bị trùng lịch');
      if(ev.taskId)await rescheduleTask(ev.taskId,newDate,newTime,'Kéo thả trên lịch');
      else await updateEvent({...ev,startTime:Timestamp.fromDate(s),endTime:Timestamp.fromDate(e)});
      toast.success(`Đã chuyển sang ${newDate} ${newTime}`);
    }catch(err){toast.error(err instanceof Error?err.message:'Không dời được lịch');}
  };
  const onDrop=(e:DragEvent<HTMLElement>,day:string,hour:string)=>{
    e.preventDefault();
    const id=e.dataTransfer.getData('text/studyflow-event')||draggedId;
    setDraggedId(null);if(id)void move(id,day,hour);
  };
  const EventChip=({ev,compact=false}:{ev:CalendarEvent;compact?:boolean})=><div
    draggable={!ev.isFixed}
    onDragStart={e=>{setDraggedId(ev.id);e.dataTransfer.setData('text/studyflow-event',ev.id);}}
    className={`flex items-start gap-1 rounded-lg border p-2 text-left transition-transform hover:scale-[1.01] ${colors[ev.categoryId]||colors.personal}`}
  ><button type="button" onClick={()=>openEdit(ev)} className="min-w-0 flex-1 text-left" title={ev.title}>
    <span className="block truncate text-xs font-semibold">{ev.title}</span>
    {!compact&&<span className="mt-1 block text-[10px] opacity-80">{time(ev.startTime)}–{time(ev.endTime)}</span>}
  </button>{ev.isFixed&&<LockKeyhole size={12}/>}</div>;

  const HOURS = STUDY_HOURS;
  return <div className="space-y-5 pb-16">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays size={24}/> Thời khóa biểu</h1>
        <p className="text-sm text-muted-foreground">Ngày · Tuần · Tháng · Kéo thả trên máy tính · Chạm để sửa trên điện thoại</p></div>
      <Button onClick={()=>openNew()}><Plus size={16} className="mr-2"/> Thêm lịch</Button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3">
      <div className="flex items-center gap-1">
        <button aria-label="Trước" onClick={()=>jump(-1)} className="rounded-lg p-2 hover:bg-muted"><ChevronLeft size={18}/></button>
        <button onClick={()=>setAnchor(operationalDay())} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted">Hôm nay</button>
        <button aria-label="Tiếp" onClick={()=>jump(1)} className="rounded-lg p-2 hover:bg-muted"><ChevronRight size={18}/></button>
        <strong className="ml-2 text-sm">{formatDate(anchor)}</strong>
      </div>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1">
        {(['day','week','month','agenda'] as const).map(item=><button key={item} onClick={()=>setView(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view===item?'bg-primary text-primary-foreground':'hover:bg-background'}`}>
          {{day:'Ngày',week:'Tuần',month:'Tháng',agenda:'Danh sách'}[item]}
        </button>)}
      </div>
    </div>
    {collisions>0 && <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><AlertTriangle size={17}/> Có {collisions} cặp sự kiện bị trùng giờ.</div>}
    {view==='month'&&<div className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold">{['T2','T3','T4','T5','T6','T7','CN'].map(day=><span key={day} className="py-3">{day}</span>)}</div>
      <div className="grid grid-cols-7">
        {days.map(d=><div key={d} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,d,'08:00')}
          className={`min-h-[98px] border-b border-r p-1.5 sm:min-h-[140px] ${d===localDay()?'bg-primary/5':''} ${d.slice(0,7)!==anchor.slice(0,7)?'opacity-50':''}`}>
          <button onClick={()=>{setAnchor(d);setView('day')}} className="mb-1 rounded px-2 py-1 text-xs font-semibold hover:bg-muted">{Number(d.slice(-2))}</button>
          <div className="space-y-1">{(grouped[d]||[]).slice(0,3).map(ev=><EventChip key={ev.id} ev={ev} compact/>)}</div>
          {(grouped[d]||[]).length>3&&<button onClick={()=>{setAnchor(d);setView('day')}} className="text-[10px] text-primary">+{grouped[d]!.length-3} lịch nữa</button>}
        </div>)}
      </div>
    </div>}
    {(view==='week'||view==='day')&&<div className="overflow-x-auto rounded-2xl border bg-card">
      <div className={`grid ${view==='day'?'min-w-0':'min-w-[720px]'} ${view==='day'?'grid-cols-[68px_1fr]':'grid-cols-[68px_repeat(7,minmax(80px,1fr))]'} border-b bg-muted/40 text-center text-xs font-semibold`}>
        <span className="border-r p-3">Giờ</span>{days.map(d=><button key={d} onClick={()=>{setAnchor(d);setView('day')}} className={`border-r p-3 ${d===localDay()?'text-primary':''}`}>{['CN','T2','T3','T4','T5','T6','T7'][parseSlot(d,'12:00').getUTCDay()]} {d.slice(-2)}</button>)}
      </div>
      <div className="vt-study-day-note border-b px-3 py-2">Ngày học: 03:00 → 01:59 hôm sau. Các ô 00:00 và 01:00 được lưu đúng ngày dương lịch tiếp theo.</div><div className="max-h-[630px] overflow-y-auto overscroll-contain">
        {HOURS.map(hour=><div key={hour} className={`grid ${view==='day'?'min-w-0':'min-w-[720px]'} ${view==='day'?'grid-cols-[68px_1fr]':'grid-cols-[68px_repeat(7,minmax(80px,1fr))]'} min-h-[62px] sm:min-h-[70px] border-b`}>
          <div className="border-r p-2 text-right font-mono text-[11px] text-muted-foreground">{hour}</div>
          {days.map(d=><div key={`${d}-${hour}`} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,studySlotDate(d,hour),hour)} onDoubleClick={()=>openNew(studySlotDate(d,hour),hour)}
              className="cursor-pointer space-y-1 border-r p-1 transition-colors hover:bg-muted/40" title="Nhấp đúp để thêm lịch; kéo sự kiện vào đây để đổi giờ">
            {(studyEvents[`${d}|${hour.slice(0,2)}`]||[]).map(ev=><EventChip key={ev.id} ev={ev}/>)}
          </div>)}
        </div>)}
      </div>
    </div>}
    {view==='agenda'&&<div className="space-y-2">{relevant.length===0?<div className="rounded-xl border p-8 text-center text-muted-foreground">Chưa có lịch. Nhấn “Thêm lịch” để bắt đầu.</div>:relevant.map(ev=><div key={ev.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{localDay(ev.startTime.toDate())}<br/>{time(ev.startTime)}–{time(ev.endTime)}</span>
      <div className="min-w-0 flex-1"><EventChip ev={ev} /></div>
      {!ev.taskId&&<><button onClick={()=>openEdit(ev)} aria-label="Sửa"><Pencil size={16}/></button><button onClick={()=>void remove(ev)} aria-label="Xóa"><Trash2 size={16}/></button></>}
    </div>)}</div>}
    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent>
      <DialogHeader><DialogTitle className="flex gap-2 items-center"><CalendarClock size={20}/>{editId?'Sửa lịch':'Thêm lịch mới'}</DialogTitle></DialogHeader>
      <form onSubmit={e=>void save(e)} className="space-y-3 py-2">
        <label className="block text-xs font-semibold">Tên lịch</label><Input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ví dụ: Học Excel Pivot Table"/>
        <label className="block text-xs font-semibold">Lĩnh vực</label><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-lg border bg-background p-2 text-sm">{categories.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold">Ngày</label><Input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></div>
        <div><label className="text-xs font-semibold">Lặp theo tuần</label><select disabled={Boolean(editId)} value={repeat} onChange={e=>setRepeat(Number(e.target.value))} className="w-full rounded-lg border bg-background p-2 text-sm"><option value="0">Không lặp</option><option value="3">4 tuần</option><option value="7">8 tuần</option><option value="11">12 tuần</option></select></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold">Bắt đầu</label><Input type="time" required value={start} onChange={e=>setStart(e.target.value)}/></div><div><label className="text-xs font-semibold">Kết thúc</label><Input type="time" required value={end} onChange={e=>setEnd(e.target.value)}/></div></div>
        <p className="text-xs text-muted-foreground">Lặp theo tuần tạo các buổi riêng biệt (tối đa 12 tuần); chưa hỗ trợ sửa toàn bộ chuỗi.</p>
        <DialogFooter><Button type="button" variant="secondary" onClick={()=>setDialog(false)}>Hủy</Button><Button type="submit" disabled={saving}>{saving?'Đang lưu':'Lưu lịch'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </div>;
}
