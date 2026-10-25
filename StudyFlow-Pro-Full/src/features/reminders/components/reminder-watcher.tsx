import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore, useDataStore } from '@/stores';
import { hourMinute, localDay } from '@/lib/schedule';

/** Foreground reminder: never claims to run after the browser or phone is closed. */
export function ReminderWatcher() {
  const user=useAuthStore(s=>s.user);
  const profile=useAuthStore(s=>s.profile);
  const events=useDataStore(s=>s.events);
  const tasks=useDataStore(s=>s.tasks);
  useEffect(()=>{
    if(!user)return;
    const quiet=()=>{
      if(!profile?.quietHours?.enabled)return false;
      const now=hourMinute(new Date());
      const {start,end}=profile.quietHours;
      return start<=end ? now>=start&&now<end : now>=start||now<end;
    };
    const warn=(id:string,title:string,body:string)=>{
      const key=`studyflow_notice_${user.uid}_${id}`;
      try{if(localStorage.getItem(key))return;localStorage.setItem(key,localDay());}catch{ /* display remains functional */ }
      toast.info(title,{description:body,duration:11000});
      if('Notification' in window&&Notification.permission==='granted') {
        try {new Notification(title,{body,icon:'/favicon.svg',tag:id});}catch{ /* page toast remains */ }
      }
    };
    const check=()=>{
      if(quiet())return;
      const now=Date.now();
      for(const e of events){
        if(e.status!=='scheduled')continue;
        const start=e.startTime.toMillis();
        if(now>=start-15*60000 && now<start-14*60000) warn(`${e.id}_before_${localDay(new Date(start))}`,`Sắp đến giờ: ${e.title}`,'Còn khoảng 15 phút để chuẩn bị.');
        if(now>=start && now<start+2*60000) warn(`${e.id}_start_${localDay(new Date(start))}`,`Đến giờ: ${e.title}`,'Mở Focus Studio để bắt đầu phiên học.');
      }
      const day=localDay();
      const pending=tasks.filter(t=>t.status!=='completed'&&t.status!=='archived'&&t.scheduledSessions?.some(s=>s.date===day));
      if(hourMinute(new Date())>='21:30'&&hourMinute(new Date())<='21:32'&&pending.length>0)
        warn(`review_${day}`,`Còn ${pending.length} việc chưa hoàn thành`,'Mở Tồn đọng để chọn ngày và giờ dời lịch.');
    };
    check();const interval=setInterval(check,20000);
    const visible=()=>{if(document.visibilityState==='visible')check();};
    document.addEventListener('visibilitychange',visible);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',visible);};
  },[user,profile,events,tasks]);
  return null;
}
