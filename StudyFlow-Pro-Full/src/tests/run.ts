// Integration tests run against real Zustand action implementations in local/guest mode.
// Firebase production and browser push need separate emulator/device verification.
if (typeof globalThis.localStorage === 'undefined') {
  const data = new Map<string,string>();
  (globalThis as unknown as {localStorage:Storage}).localStorage={
    getItem:(key:string)=>data.get(key)||null,
    setItem:(key:string,value:string)=>{data.set(key,String(value))},
    removeItem:(key:string)=>{data.delete(key)},
    clear:()=>data.clear(),
    key:(i:number)=>Array.from(data.keys())[i]||null,
    get length(){return data.size},
  };
}

import {runProductionIntegrityTests} from './production-integrity.test';
runProductionIntegrityTests().then(()=>{
  console.log('\nVanTien Studycore integrity tests PASSED (local mode)');
}).catch(error=>{
  console.error('\nVanTien Studycore integrity tests FAILED:',error);
  process.exitCode=1;
});
