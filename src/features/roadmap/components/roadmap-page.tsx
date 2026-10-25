import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { ArrowRight,CalendarDays,CheckCircle2,ChevronDown,ChevronRight,Circle,FolderPlus,Layers3,ListChecks,Plus,Trash2,Pencil,Target,BookOpen,Loader2 } from 'lucide-react';
import { useDataStore } from '@/stores';
import { useAuthStore } from '@/stores/auth-store';
import { LEARNING_WEEKS } from '@/data/learning-plan';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { roadmapPlanService } from '@/services/firebase/roadmap-plan-service';
import { useRoadmapPlans } from '../use-roadmap-plans';
import { countSteps,percent,projectSteps,PRESET_PLAN_IDS,type RoadmapPlan,type RoadmapProject,type RoadmapModule } from '../roadmap-model';

type Entry = {key:string;type:'goal'|'project'|'module'|'step';planId:string;projectId?:string;moduleId?:string};
const safeId=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;
const PRESET=new Set<string>(PRESET_PLAN_IDS);

export function RoadmapPage(){
  const {uid,plans,loaded,error}=useRoadmapPlans();
  const tasks=useDataStore(s=>s.tasks);
  const {addTask,toggleTaskComplete}=useDataStore();
  const categories=useAuthStore(s=>s.profile?.categories);
  const [planId,setPlanId]=useState<string>('roadmap_osat_v2');
  const [expanded,setExpanded]=useState<Record<string,boolean>>({p1:true});
  const [showWeeks,setShowWeeks]=useState(false);
  const [form,setForm]=useState<Entry|null>(null);
  const [title,setTitle]=useState('');
  const [details,setDetails]=useState('');
  const [deadline,setDeadline]=useState('');
  const [category,setCategory]=useState('personal');
  const [busy,setBusy]=useState(false);

  const selected=plans.find(p=>p.id===planId)??plans[0];
  const selectedCount=selected?countSteps(selected):{done:0,total:0};
  const start=(entry:Entry)=>{setForm(entry);setTitle('');setDetails('');setDeadline('');setCategory('personal');};
  const close=()=>{setForm(null);setTitle('');setDetails('');setDeadline('');};
  async function save(plan:RoadmapPlan){
    if(!uid)throw new Error('Bạn cần đăng nhập để lưu lộ trình.');
    if(!loaded||error)throw new Error('Chưa tải được dữ liệu mới nhất. Hãy kiểm tra kết nối Firebase.');
    const size=new TextEncoder().encode(JSON.stringify(plan)).length;
    if(size>750_000)throw new Error('Lộ trình quá lớn. Hãy tạo mục tiêu mới để chia nhỏ dữ liệu.');
    await roadmapPlanService.save(uid,plan);
  }
  async function apply(plan:RoadmapPlan,modify:(plan:RoadmapPlan)=>RoadmapPlan,notice='Đã lưu tiến độ'){
    if(busy)return;
    setBusy(true);
    try{await save(modify(plan));toast.success(notice);}catch(e){toast.error(e instanceof Error?e.message:'Không thể lưu dữ liệu');}
    finally{setBusy(false);}
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const name=title.trim();
    if(!form||!name||busy)return;
    if(name.length>160){toast.error('Tên tối đa 160 ký tự');return;}
    const current=plans.find(p=>p.id===form.planId);
    setBusy(true);
    try{
      if(form.type==='goal'){
        if(plans.length>=30)throw new Error('Tối đa 30 lộ trình.');
        const now=Timestamp.now();
        const created:RoadmapPlan={id:safeId('roadmap'),kind:'vantien-roadmap-v2',title:name,description:details.trim().slice(0,500),categoryId:category,projects:[],createdAt:now,updatedAt:now};
        await save(created);setPlanId(created.id);
      }else{
        if(!current)throw new Error('Không tìm thấy lộ trình');
        let next:RoadmapPlan=current;
        if(form.type==='project'){
          if(current.projects.length>=50)throw new Error('Một lộ trình tối đa 50 dự án');
          next={...current,projects:[...current.projects,{id:safeId('project'),title:name,description:details.trim().slice(0,500),deadline,skills:[],modules:[]}]};
        }else if(form.type==='module'){
          next={...current,projects:current.projects.map(p=>{
            if(p.id!==form.projectId)return p;
            if(p.modules.length>=80)throw new Error('Một dự án tối đa 80 module');
            return {...p,modules:[...p.modules,{id:safeId('module'),title:name,steps:[]}]};
          })};
        }else if(form.type==='step'){
          next={...current,projects:current.projects.map(p=>({...p,modules:p.modules.map(m=>{
            if(p.id!==form.projectId||m.id!==form.moduleId)return m;
            if(m.steps.length>=200)throw new Error('Một module tối đa 200 bước');
            return {...m,steps:[...m.steps,{id:safeId('step'),title:name,completed:false}]};
          })}))};
        }
        await save(next);
        if(form.projectId)setExpanded(x=>({...x,[form.projectId!]:true}));
      }
      toast.success('Đã thêm mục mới vào lộ trình');close();
    }catch(e){toast.error(e instanceof Error?e.message:'Không thể thêm mục');}
    finally{setBusy(false);}
  }
  function editName(plan:RoadmapPlan,type:'plan'|'project'|'module'|'step',id:string,projectId?:string,moduleId?:string){
    const p=plan.projects.find(x=>x.id===projectId);
    const m=p?.modules.find(x=>x.id===moduleId);
    const old=type==='plan'?plan.title:type==='project'?p?.title:type==='module'?m?.title:m?.steps.find(s=>s.id===id)?.title;
    if(!old)return;
    const input=window.prompt('Đổi tên (không thay đổi tiến độ):',old);
    if(input===null||!input.trim()||input.trim()===old)return;
    const renamed=input.trim().slice(0,160);
    void apply(plan,x=>type==='plan'?{...x,title:renamed}:{...x,projects:x.projects.map(pr=>({
      ...pr,title:type==='project'&&pr.id===id?renamed:pr.title,
      modules:pr.modules.map(mo=>({...mo,title:type==='module'&&mo.id===id?renamed:mo.title,
        steps:mo.steps.map(s=>({...s,title:type==='step'&&s.id===id?s.title===old?renamed:s.title:s.title}))
      }))
    }))},'Đã đổi tên');
  }
  function removeItem(plan:RoadmapPlan,type:'plan'|'project'|'module'|'step',id:string){
    if(type==='plan'&&PRESET.has(id)){toast.warning('Không xóa lộ trình mẫu; có thể sửa tên và nội dung bên trong.');return;}
    if(!window.confirm('Xóa mục này và các mục con bên trong? Thao tác không thể hoàn tác.'))return;
    if(type==='plan'){
      if(!uid)return;
      setBusy(true);
      void roadmapPlanService.remove(uid,id).then(()=>{setPlanId('roadmap_osat_v2');toast.success('Đã xóa lộ trình');}).catch(e=>toast.error(String(e))).finally(()=>setBusy(false));
      return;
    }
    void apply(plan,x=>({...x,projects:x.projects.filter(p=>!(type==='project'&&p.id===id)).map(p=>({
      ...p,modules:p.modules.filter(m=>!(type==='module'&&m.id===id)).map(m=>({
        ...m,steps:m.steps.filter(s=>!(type==='step'&&s.id===id)),
      })),
    }))}),'Đã xóa mục');
  }
  function toggleStep(plan:RoadmapPlan,pid:string,mid:string,sid:string){
    void apply(plan,x=>({...x,projects:x.projects.map(p=>({...p,modules:p.modules.map(m=>({...m,steps:m.steps.map(s=>{
      if(p.id!==pid||m.id!==mid||s.id!==sid)return s;
      return {...s,completed:!s.completed,completedAt:!s.completed?Timestamp.now():undefined};
    })}))}))}),'Đã lưu checklist');
  }
  const weekTitle=(index:number,text:string)=>`Tuần ${String(index+1).padStart(2,'0')} — ${text}`;
  const doneWeeks=LEARNING_WEEKS.filter(([t],i)=>tasks.some(x=>x.projectId==='course-36-weeks'&&x.title===weekTitle(i,t)&&x.status==='completed')).length;
  async function toggleWeek(index:number,label:string){
    if(busy)return;
    setBusy(true);
    try{
      const name=weekTitle(index,label);
      const t=tasks.find(x=>x.projectId==='course-36-weeks'&&x.title===name);
      if(t)await toggleTaskComplete(t.id);
      else{const created=await addTask({title:name,projectId:'course-36-weeks',categoryId:'engineer',priority:'medium',status:'inbox',estimatedMinutes:60});await toggleTaskComplete(created.id);}
      toast.success('Đã lưu tiến độ tuần');
    }catch(e){toast.error(e instanceof Error?e.message:'Không lưu được tuần học');}
    finally{setBusy(false);}
  }
  function stepControls(plan:RoadmapPlan,project:RoadmapProject,module:RoadmapModule){
    const finished=module.steps.filter(s=>s.completed).length;
    return <div key={module.id} className="rounded-xl border border-border/80 bg-surface/40 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground break-words">{module.title}</p>
          <div className="flex items-center gap-2 mt-2"><Progress value={percent(finished,module.steps.length)} className="h-1.5 flex-1 max-w-44"/><span className="text-[11px] font-mono text-muted-foreground">{finished}/{module.steps.length} bước · {percent(finished,module.steps.length)}%</span></div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Đổi tên ${module.title}`} title="Đổi tên" disabled={busy} onClick={()=>editName(plan,'module',module.id,project.id,module.id)} className="p-2 rounded-lg hover:bg-primary/10"><Pencil className="w-3.5 h-3.5"/></button>
          <button type="button" aria-label={`Xóa ${module.title}`} title="Xóa module" disabled={busy} onClick={()=>removeItem(plan,'module',module.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>
      <div className="space-y-1.5">
        {module.steps.map(s=><div key={s.id} className="flex items-start gap-2 rounded-lg py-1.5 px-2 hover:bg-surface-elevated/60 group">
          <button type="button" title={s.completed?'Bỏ hoàn thành':'Đánh dấu hoàn thành'} aria-label={`${s.completed?'Bỏ tích':'Tích'} ${s.title}`} disabled={busy} onClick={()=>toggleStep(plan,project.id,module.id,s.id)} className="shrink-0 mt-0.5 p-0.5 rounded focus-visible:ring-2 focus-visible:ring-primary">
            {s.completed?<CheckCircle2 className="w-4 h-4 text-emerald-400"/>:<Circle className="w-4 h-4 text-muted-foreground"/>}
          </button>
          <span className={`flex-1 min-w-0 text-xs sm:text-sm break-words ${s.completed?'line-through text-muted-foreground':'text-foreground'}`}>{s.title}</span>
          <button type="button" title="Sửa bước" aria-label={`Sửa ${s.title}`} disabled={busy} onClick={()=>editName(plan,'step',s.id,project.id,module.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3"/></button>
          <button type="button" title="Xóa bước" aria-label={`Xóa ${s.title}`} disabled={busy} onClick={()=>removeItem(plan,'step',s.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3"/></button>
        </div>)}
        {module.steps.length===0&&<p className="text-xs text-muted-foreground py-2">Chưa có bước nhỏ. Hãy thêm checklist để ghi nhận tiến độ.</p>}
      </div>
      {form?.key===`step-${module.id}`?
        <form onSubmit={e=>void submit(e)} className="flex flex-wrap gap-2"><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} required placeholder="Tên bước nhỏ cần hoàn thành" className="flex-1 min-w-[170px] rounded-lg border bg-background px-3 py-2 text-sm"/><Button disabled={busy} size="sm" type="submit">Lưu</Button><Button type="button" size="sm" variant="outline" onClick={close}>Hủy</Button></form>
        :<Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>start({key:`step-${module.id}`,type:'step',planId:plan.id,projectId:project.id,moduleId:module.id})}><Plus className="w-3.5 h-3.5 mr-1"/> Thêm bước nhỏ</Button>}
    </div>;
  }

  return <div className="space-y-5 pb-12 animate-fade-in">
    <header className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight text-foreground">Lộ trình học tập & Mục tiêu dài hạn</h1><p className="text-xs text-muted-foreground mt-1">Mục tiêu → Dự án → Module → Bước nhỏ · Tích từng bước để cập nhật tiến độ thực</p></div>
        <Button disabled={!uid||busy||!loaded||!!error} onClick={()=>start({key:'new-goal',type:'goal',planId:''})}><FolderPlus className="h-4 w-4 mr-2"/> Thêm lộ trình</Button>
      </div>
      {!loaded&&<p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin w-4"/> Đang tải lộ trình...</p>}
      {error&&<div role="alert" className="text-sm rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-red-300">Không tải được lộ trình từ tài khoản: {error}. Không chỉnh sửa cho đến khi kết nối được.</div>}
    </header>
    {form?.key==='new-goal'&&<form onSubmit={e=>void submit(e)} className="grid gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Tên lộ trình<input autoFocus value={title} required maxLength={160} onChange={e=>setTitle(e.target.value)} placeholder="Ví dụ: Toán cao cấp, IELTS, Gym..." className="block w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm"/></label>
      <label className="text-xs font-semibold">Nhóm học tập<select value={category} onChange={e=>setCategory(e.target.value)} className="block w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm"><option value="personal">Cá nhân</option>{categories?.filter(c=>c.id!=='personal').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="text-xs font-semibold sm:col-span-2">Mô tả (không bắt buộc)<input value={details} maxLength={500} onChange={e=>setDetails(e.target.value)} placeholder="Mục tiêu và định hướng" className="block w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm"/></label>
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>Tạo lộ trình</Button><Button type="button" variant="outline" onClick={close}>Hủy</Button></div>
    </form>}
    <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Chọn lộ trình">
      {plans.map(p=><button key={p.id} type="button" onClick={()=>{setPlanId(p.id);close();}} className={`shrink-0 rounded-xl px-4 py-2 border text-xs sm:text-sm font-semibold transition-colors ${selected?.id===p.id?'bg-primary border-primary text-primary-foreground':'bg-surface border-border text-muted-foreground hover:text-foreground'}`}>{p.title}</button>)}
    </nav>
    {selected&&<>
      <section className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-surface-elevated to-surface px-4 py-5 sm:p-6 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold tracking-wide text-purple-400">LỘ TRÌNH CÁ NHÂN · DỮ LIỆU THỰC</p>
            <h2 className="text-xl font-bold text-foreground break-words">{selected.title}</h2>
            <p className="text-xs text-muted-foreground">{selected.description||'Tự xây dựng kế hoạch và kiểm tra tiến độ từng bước.'}</p>
          </div>
          <div className="min-w-[165px] space-y-2"><p className="font-mono text-lg font-bold text-purple-400">{selectedCount.done}/{selectedCount.total} bước · {percent(selectedCount.done,selectedCount.total)}%</p><Progress value={percent(selectedCount.done,selectedCount.total)} className="h-2"/></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={()=>editName(selected,'plan',selected.id)}><Pencil className="h-3.5 w-3.5 mr-1"/> Đổi tên</Button>
          {!PRESET.has(selected.id)&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>removeItem(selected,'plan',selected.id)}><Trash2 className="h-3.5 w-3.5 mr-1"/> Xóa lộ trình</Button>}
        </div>
      </section>
      {selected.id==='roadmap_osat_v2'&&<section className="rounded-2xl border bg-card p-4 space-y-3">
        <button className="w-full flex items-center justify-between gap-3 text-left" onClick={()=>setShowWeeks(x=>!x)}><span><strong className="block text-sm">Giáo trình 36 tuần · Checklist</strong><span className="text-xs text-muted-foreground">Giữ nguyên trạng thái các tuần đã tích trước đây, lưu ở Tasks.</span></span><span className="text-primary font-mono font-bold shrink-0">{doneWeeks}/36 {showWeeks?'▲':'▼'}</span></button>
        {showWeeks&&<div className="grid sm:grid-cols-2 gap-2 max-h-96 overflow-auto">{LEARNING_WEEKS.map(([w,period],i)=>{
          const done=tasks.some(t=>t.projectId==='course-36-weeks'&&t.title===weekTitle(i,w)&&t.status==='completed');
          return <button type="button" disabled={busy} key={i} onClick={()=>void toggleWeek(i,w)} className="rounded-xl border p-2.5 text-left flex gap-2 text-xs hover:border-primary/40">{done?<CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400"/>:<Circle className="w-4 h-4 shrink-0"/>}<span><span className={done?'line-through text-muted-foreground':''}>{weekTitle(i,w)}</span><span className="block text-muted-foreground text-[10px]">{period}</span></span></button>;
        })}</div>}
      </section>}
      <div className="space-y-4">
        {selected.projects.map((p,i)=>{
          const value=projectSteps(p);const opened=expanded[p.id]??i===0;
          return <section key={p.id} className="rounded-2xl overflow-hidden border border-border/80 bg-card">
            <div className="flex items-start gap-2 p-4 sm:p-5">
              <button onClick={()=>setExpanded(prev=>({...prev,[p.id]:!opened}))} className="flex-1 min-w-0 text-left flex items-start gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary" aria-expanded={opened}>
                <span className="font-mono font-bold text-lg text-muted-foreground/60">{String(i+1).padStart(2,'0')}</span>
                <span className="min-w-0 space-y-1 flex-1"><strong className="block text-sm sm:text-base text-foreground break-words">{p.title}</strong>{p.description&&<span className="text-xs text-muted-foreground block">{p.description}</span>}{p.deadline&&<span className="text-xs inline-flex gap-1 items-center text-amber-400"><CalendarDays className="w-3 h-3"/> Hạn: {p.deadline.split('-').reverse().join('/')}</span>}
                <span className="flex flex-wrap gap-1">{p.skills.map(skill=><Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>)}</span></span>
              </button>
              <div className="flex items-center gap-1 shrink-0"><div className="hidden sm:block text-right mr-2"><p className="text-sm font-mono font-bold">{percent(value.done,value.total)}%</p><p className="text-[10px] text-muted-foreground">{value.done}/{value.total} bước</p></div><button type="button" title="Đổi tên dự án" disabled={busy} className="p-2 rounded hover:bg-primary/10" onClick={()=>editName(selected,'project',p.id,p.id)}><Pencil className="w-3.5 h-3.5"/></button><button type="button" title="Xóa dự án" disabled={busy} className="p-2 rounded hover:text-destructive" onClick={()=>removeItem(selected,'project',p.id)}><Trash2 className="w-3.5 h-3.5"/></button><button type="button" aria-label={opened?'Thu gọn':'Mở rộng'} onClick={()=>setExpanded(prev=>({...prev,[p.id]:!opened}))} className="p-2">{opened?<ChevronDown className="w-4"/>:<ChevronRight className="w-4"/>}</button></div>
            </div>
            <Progress value={percent(value.done,value.total)} className="h-1 rounded-none"/>
            {opened&&<div className="p-3 sm:p-5 border-t border-border/70 space-y-3 bg-surface/20">
              <div className="flex flex-wrap justify-between items-center gap-2"><p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground flex gap-2"><ListChecks className="h-4 w-4"/> Modules và checklist chi tiết</p><Badge variant="secondary">{p.modules.length} module</Badge></div>
              {p.modules.map(m=>stepControls(selected,p,m))}
              {form?.key===`module-${p.id}`?
                <form onSubmit={e=>void submit(e)} className="flex flex-wrap gap-2"><input autoFocus className="flex-1 min-w-[170px] rounded-lg border bg-background px-3 py-2 text-sm" required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tên module mới"/><Button type="submit" size="sm" disabled={busy}>Lưu</Button><Button variant="outline" size="sm" type="button" onClick={close}>Hủy</Button></form>
                :<Button size="sm" variant="outline" disabled={busy} onClick={()=>start({key:`module-${p.id}`,type:'module',planId:selected.id,projectId:p.id})}><Layers3 className="w-3.5 h-3.5 mr-1"/> Thêm module</Button>}
            </div>}
          </section>;
        })}
        {selected.projects.length===0&&<p className="p-8 text-center text-sm text-muted-foreground rounded-2xl border border-dashed">Chưa có dự án. Tạo dự án đầu tiên để xây dựng lộ trình của bạn.</p>}
      </div>
      {form?.key==='new-project'&&<form className="rounded-xl border border-primary/40 bg-primary/5 p-4 grid gap-3 sm:grid-cols-2" onSubmit={e=>void submit(e)}>
        <label className="text-xs font-semibold">Tên dự án<input autoFocus required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ví dụ: Thiết kế CV" className="block mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"/></label>
        <label className="text-xs font-semibold">Hạn hoàn thành (tùy chọn)<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="block mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"/></label>
        <label className="text-xs font-semibold sm:col-span-2">Mô tả<input maxLength={500} value={details} onChange={e=>setDetails(e.target.value)} className="block mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Kết quả cần đạt"/></label>
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>Thêm dự án</Button><Button type="button" variant="outline" onClick={close}>Hủy</Button></div>
      </form>}
      {form?.key!=='new-project'&&<Button size="sm" disabled={busy} onClick={()=>start({key:'new-project',type:'project',planId:selected.id})}><Plus className="h-4 w-4 mr-2"/> Thêm dự án vào lộ trình này</Button>}
    </>}
    <p className="text-[11px] text-muted-foreground flex gap-2"><Target className="w-3.5 h-3.5 shrink-0"/> Tiến độ tính từ checklist đã tích, không tự cộng giờ Focus hoặc thay đổi trạng thái công việc. Dữ liệu chỉ lưu sau khi Firebase xác nhận thành công.</p>
  </div>;
}
