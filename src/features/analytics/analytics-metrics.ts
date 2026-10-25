import type { Task,FocusSession,Category } from '@/types';
import { APP_TIMEZONE,dayPlus,localDay } from '@/lib/schedule';

export type TimeFilter='today'|'week'|'month';
const asDate=(v:{toDate:()=>Date}|undefined):Date|null=>{
  try{return v?.toDate?.()??null;}catch{return null;}
};
const ms=(v:{toDate:()=>Date}|undefined)=>asDate(v)?.getTime()??0;
export const duration=(millis:number):string=>{
  const seconds=Math.floor(Math.max(0,millis)/1000);
  return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
};
export function computeMetrics(
  tasks:Task[],sessions:FocusSession[],period:TimeFilter,categoryList:Category[],weeklyGoals:Record<string,number>,reference:Date=new Date()
){
  const today=localDay(reference);
  const days=period==='today'?1:period==='week'?7:30;
  const startDay=dayPlus(today,1-days);
  const start=new Date(`${startDay}T00:00:00+07:00`).getTime();
  const end=reference.getTime();
  const prevStart=new Date(`${dayPlus(startDay,-days)}T00:00:00+07:00`).getTime();
  const seen=new Set<string>();
  const validSessions=sessions.filter(s=>{
    if(s.status!=='completed'||!Number.isFinite(s.actualFocusMs)||s.actualFocusMs<=0||seen.has(s.id))return false;
    seen.add(s.id);return ms(s.startedAt)>0;
  });
  const selected=validSessions.filter(s=>ms(s.startedAt)>=start&&ms(s.startedAt)<=end);
  const previous=validSessions.filter(s=>ms(s.startedAt)>=prevStart&&ms(s.startedAt)<start);
  const totalMs=selected.reduce((sum,s)=>sum+s.actualFocusMs,0);
  const previousMs=previous.reduce((sum,s)=>sum+s.actualFocusMs,0);
  const longest=Math.max(0,...selected.map(s=>s.actualFocusMs));
  const average=selected.length?totalMs/selected.length:0;
  const sorted=selected.map(s=>s.actualFocusMs).sort((a,b)=>a-b);
  const median=sorted.length?(sorted[Math.floor((sorted.length-1)/2)]!+sorted[Math.floor(sorted.length/2)]!)/2:0;
  const recordedDays=new Set(validSessions.map(s=>localDay(asDate(s.startedAt)!)));
  let streak=0, cursor=recordedDays.has(today)?today:dayPlus(today,-1);
  while(recordedDays.has(cursor)&&streak<3660){streak++;cursor=dayPlus(cursor,-1);}
  const daily=Array.from({length:days},(_,i)=>{
    const day=dayPlus(startDay,i);
    const daySessions=selected.filter(s=>localDay(asDate(s.startedAt)!)===day);
    return {day,ms:daySessions.reduce((a,s)=>a+s.actualFocusMs,0),sessions:daySessions.length};
  });
  const hours=Array.from({length:24},(_,hour)=>({hour,ms:selected.filter(s=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:APP_TIMEZONE,hour:'2-digit',hourCycle:'h23'}).format(asDate(s.startedAt)!))===hour).reduce((a,s)=>a+s.actualFocusMs,0)}));
  const byCategory=new Map<string,{id:string;name:string;color:string;ms:number;sessions:number;goalMs:number}>();
  for(const cat of categoryList){byCategory.set(cat.id,{id:cat.id,name:cat.name,color:cat.color,ms:0,sessions:0,goalMs:(weeklyGoals[cat.id]||0)*60000*days/7});}
  for(const s of selected){const existing=byCategory.get(s.categoryId)||{id:s.categoryId,name:s.categoryId||'Chưa phân loại',color:'#8b5cf6',ms:0,sessions:0,goalMs:0};existing.ms+=s.actualFocusMs;existing.sessions++;byCategory.set(s.categoryId,existing);}
  const subjects=[...byCategory.values()].filter(x=>x.ms>0||x.goalMs>0).sort((a,b)=>b.ms-a.ms);
  const modes=[...new Set(selected.map(s=>s.mode))].map(mode=>({mode,count:selected.filter(s=>s.mode===mode).length,ms:selected.filter(s=>s.mode===mode).reduce((a,s)=>a+s.actualFocusMs,0)})).sort((a,b)=>b.ms-a.ms);
  const completedInWindow=tasks.filter(t=>t.status==='completed'&&ms(t.completedAt)>=start&&ms(t.completedAt)<=end);
  const createdInWindow=tasks.filter(t=>ms(t.createdAt)>=start&&ms(t.createdAt)<=end);
  const active=tasks.filter(t=>t.status!=='archived');
  const completedOverall=active.filter(t=>t.status==='completed');
  const taskRate=active.length?Math.round(completedOverall.length*100/active.length):0;
  const overdue=active.filter(t=>t.status!=='completed'&&ms(t.deadline)>0&&ms(t.deadline)<end);
  const reschedules=tasks.flatMap(t=>(t.rescheduleHistory||[]).filter(r=>ms(r.timestamp)>=start&&ms(r.timestamp)<=end).map(r=>({...r,title:t.title,taskId:t.id})))
    .sort((a,b)=>ms(b.timestamp)-ms(a.timestamp));
  const taskByCategory=categoryList.map(cat=>{
    const own=active.filter(t=>t.categoryId===cat.id);
    return {id:cat.id,name:cat.name,total:own.length,completed:own.filter(t=>t.status==='completed').length};
  }).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const focusPercentChange=previousMs>0?Math.round((totalMs-previousMs)*100/previousMs):null;
  return {period,days,startDay,today,start,end,selected,totalMs,previousMs,focusPercentChange,longest,average,median,streak,
    daily,hours,subjects,modes,completedInWindow,createdInWindow,active,taskRate,overdue,reschedules,taskByCategory,
    uniqueFocusDays:new Set(selected.map(s=>localDay(asDate(s.startedAt)!))).size,
  };
}
