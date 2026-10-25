import { collection,deleteDoc,doc,onSnapshot,runTransaction,Timestamp,type Unsubscribe } from 'firebase/firestore';
import { db,isFirebaseConfigured } from './config';
import { isDemoSession } from './auth-service';
import { safeStorage } from '@/lib/storage';
import type { RoadmapPlan } from '@/features/roadmap/roadmap-model';

const key=(uid:string)=>`studyflow_${uid}_roadmap_plans_v2`;
function readLocal(uid:string):RoadmapPlan[] {
  try {
    const raw=safeStorage.getItem(key(uid));
    if(!raw)return [];
    const rows=JSON.parse(raw) as RoadmapPlan[];
    return Array.isArray(rows)?rows:[];
  }catch{return [];}
}
function writeLocal(uid:string,plans:RoadmapPlan[]):void {
  safeStorage.setItem(key(uid),JSON.stringify(plans));
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('vantien-roadmap-change',{detail:{uid}}));
}
function remote(uid:string):boolean{return isFirebaseConfigured&&!isDemoSession();}
export const roadmapPlanService={
  subscribe(uid:string,onData:(rows:RoadmapPlan[])=>void,onError:(error:Error)=>void):Unsubscribe {
    if(!remote(uid)){
      const receive=()=>onData(readLocal(uid));
      const storage=(event:StorageEvent)=>{if(event.key===key(uid))receive();};
      const local=(event:Event)=>{if((event as CustomEvent<{uid:string}>).detail?.uid===uid)receive();};
      receive();
      window.addEventListener('storage',storage);
      window.addEventListener('vantien-roadmap-change',local);
      return ()=>{window.removeEventListener('storage',storage);window.removeEventListener('vantien-roadmap-change',local);};
    }
    return onSnapshot(collection(db,'users',uid,'goals'),snapshot=>{
      const plans=snapshot.docs.map(d=>({...d.data(),id:d.id} as RoadmapPlan))
        .filter(row=>row.kind==='vantien-roadmap-v2' && Array.isArray(row.projects));
      onData(plans);
    },error=>onError(error));
  },
  async save(uid:string,plan:RoadmapPlan):Promise<void>{
    const next={...plan,updatedAt:Timestamp.now()};
    if(!remote(uid)){
      const plans=readLocal(uid).filter(p=>p.id!==next.id);
      writeLocal(uid,[...plans,next]);return;
    }
    const target=doc(db,'users',uid,'goals',next.id);
    await runTransaction(db,async tx=>{
      const snapshot=await tx.get(target);
      if(snapshot.exists()){
        const existing=snapshot.data() as RoadmapPlan;
        // Phat hien truong hop nguoi dung vua sua tren thiet bi khac.
        const stored=existing.updatedAt?.toMillis?.()??0;
        const source=plan.updatedAt?.toMillis?.()??0;
        if(stored>source)throw new Error('Lộ trình đã được sửa trên thiết bị khác. Hãy tải lại trang trước khi chỉnh sửa tiếp.');
      }
      tx.set(target,next);
    });
  },
  async remove(uid:string,id:string):Promise<void>{
    if(!remote(uid)){writeLocal(uid,readLocal(uid).filter(p=>p.id!==id));return;}
    await deleteDoc(doc(db,'users',uid,'goals',id));
  },
};
