import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { dayPlus, localDay, parseSlot, slotEnd, hasOverlap, nextFreeSlot } from '../lib/schedule';
import { elapsedFocusMs } from '../lib/focus-time';
import { formatTime } from '../lib/utils';
import { useDataStore } from '../stores/data-store';

export async function runProductionIntegrityTests(): Promise<void> {
  const check=(title:string,fn:()=>unknown)=>{
    fn();console.log(`PASS ${title}`);
  };
  check('Civil date UTC+7 at UTC day boundary',()=>{
    assert.equal(localDay(new Date('2026-10-21T18:30:00Z')),'2026-10-22');
    assert.equal(dayPlus('2026-12-31',1),'2027-01-01');
  });
  check('Full overlap and adjacent slots',()=>{
    assert.equal(hasOverlap(100,200,[{start:150,end:230}]),true);
    assert.equal(hasOverlap(100,200,[{start:200,end:300}]),false);
    const nine=parseSlot('2026-10-23','09:00').getTime();
    assert.equal(slotEnd(new Date(nine),90).getTime()-nine,5400000);
    assert.equal(nextFreeSlot('2026-10-23',60,[{start:nine,end:nine+3600000}]),'08:00');
  });
  check('Timer excludes live pause even after reload',()=>{
    assert.equal(elapsedFocusMs({startedAtMs:100000,pausedMs:30000,pauseSinceMs:220000},300000),90000);
    assert.equal(elapsedFocusMs({startedAtMs:100000,pausedMs:30000,pauseSinceMs:null},300000),170000);
    assert.equal(formatTime(3661),'01:01:01');
  });

  const uid=`ci_guest_${Date.now()}`;
  const store=useDataStore.getState();
  await store.initializeUserData(uid);
  assert.equal(useDataStore.getState().tasks.length,0,'Tài khoản mới không được có nhiệm vụ giả');
  assert.equal(useDataStore.getState().focusSessions.length,0,'Tài khoản mới không được có phiên học giả');
  console.log('PASS Blank account has zero invented activity');
  const tomorrow=dayPlus(localDay(),1);
  const tasks=[];
  for(let i=0;i<5;i++) {
    tasks.push(await useDataStore.getState().addTask({
      title:`Kiểm thử việc số ${i+1}`, categoryId:'engineer', priority:'medium',status:'planned',
      plannedMinutes:45,date:tomorrow,
      timeSlot:`${String(8+i).padStart(2,'0')}:00–${String(8+i).padStart(2,'0')}:45`,
    }));
  }
  assert.equal(useDataStore.getState().tasks.length,5);
  assert.equal(useDataStore.getState().events.length,5);
  console.log('PASS Five linked tasks/calendar events');
  for(const task of tasks.slice(0,4)) await useDataStore.getState().toggleTaskComplete(task.id);
  assert.equal(useDataStore.getState().tasks.filter(t=>t.status==='completed').length,4);
  console.log('PASS Four of five completed');
  const fifth=tasks[4]!;
  const deadline=fifth.deadline;
  const newDate=dayPlus(tomorrow,2);
  await useDataStore.getState().rescheduleTask(fifth.id,newDate,'09:00','Điều chỉnh kế hoạch');
  const changed=useDataStore.getState().tasks.find(t=>t.id===fifth.id)!;
  assert.equal(changed.scheduledSessions[0]?.date,newDate);
  assert.equal(changed.rescheduleHistory[changed.rescheduleHistory.length-1]?.from,tomorrow);
  assert.equal(changed.deadline,deadline);
  assert.equal(useDataStore.getState().events.find(e=>e.taskId===fifth.id)?.startTime.toDate().getTime(),parseSlot(newDate,'09:00').getTime());
  console.log('PASS Reschedule preserved original deadline and old scheduled date');
  await assert.rejects(()=>useDataStore.getState().rescheduleTask(fifth.id,tomorrow,'08:30','Trùng giờ'));
  console.log('PASS Reschedule rejects overlapping interval');
  const beginning=Date.now()-93000;
  const session={
    id:'focus_integrity_test_1',taskId:fifth.id,categoryId:'engineer',mode:'stopwatch' as const,
    startedAt:Timestamp.fromMillis(beginning),endedAt:Timestamp.now(),actualFocusMs:93000,
    totalPausedMs:0,segments:[{start:beginning,end:Date.now(),type:'focus' as const}],status:'completed' as const,
  };
  await useDataStore.getState().recordFocusSession(session);
  await useDataStore.getState().recordFocusSession(session);
  assert.equal(useDataStore.getState().focusSessions.length,1);
  assert.equal(useDataStore.getState().tasks.find(t=>t.id===fifth.id)?.actualFocusSeconds,93);
  console.log('PASS Focus persisted with stable ID; duplicate request is idempotent');
  useDataStore.getState().clearData();
  await useDataStore.getState().initializeUserData(uid);
  assert.equal(useDataStore.getState().tasks.length,5);
  assert.equal(useDataStore.getState().events.length,5);
  assert.equal(useDataStore.getState().focusSessions.length,1);
  assert.equal(useDataStore.getState().tasks.find(t=>t.id===fifth.id)?.actualFocusSeconds,93);
  console.log('PASS Persistence/reload in guest local store');
  useDataStore.getState().clearData();
}
