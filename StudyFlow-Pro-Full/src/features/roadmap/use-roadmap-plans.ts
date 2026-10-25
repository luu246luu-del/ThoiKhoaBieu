import { useEffect,useMemo,useState } from 'react';
import { useDataStore } from '@/stores';
import { roadmapPlanService } from '@/services/firebase/roadmap-plan-service';
import { getPresetRoadmaps,migrateLegacyModuleCompletion,type RoadmapPlan } from './roadmap-model';

/** Subscription realtime, khong thuc hien ghi database khi tai trang. */
export function useRoadmapPlans(){
  const uid=useDataStore(s=>s.activeUid);
  const tasks=useDataStore(s=>s.tasks);
  const [saved,setSaved]=useState<RoadmapPlan[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    setSaved([]);setLoaded(false);setError(null);
    if(!uid){setLoaded(true);return;}
    return roadmapPlanService.subscribe(uid,rows=>{
      setSaved(rows);setLoaded(true);setError(null);
    },err=>{setError(err.message);setLoaded(true);});
  },[uid]);
  const plans=useMemo(()=>{
    const byId=new Map(saved.map(p=>[p.id,p]));
    const defaults=getPresetRoadmaps().map(p=>byId.get(p.id)??migrateLegacyModuleCompletion(p,tasks));
    return [...defaults,...saved.filter(p=>!defaults.some(d=>d.id===p.id))];
  },[saved,tasks]);
  return {uid,plans,loaded,error};
}
