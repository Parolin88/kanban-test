export const uid = () => Math.random().toString(36).slice(2,9)
export const nowIso = () => new Date().toISOString()
export const fmt = (iso?:string)=> iso? new Date(iso).toLocaleString():'—'
export const get = <T,>(k:string,f:T):T=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}}
export const set = (k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
export const daysBetween=(a:string,b:string)=>(new Date(b).getTime()-new Date(a).getTime())/(1000*60*60*24)
export const addHours = (iso:string,hours:number)=> new Date(new Date(iso).getTime()+hours*3600000).toISOString()
export const addDays = (iso:string,days:number)=> addHours(iso,days*24)
export const lastIdx=(arr:any[],p:(x:any)=>boolean)=>{for(let i=arr.length-1;i>=0;i--)if(p(arr[i]))return i;return -1}
export function timeInCurrentStatus(history:{status:string;at:string}[], status:string){ const i=lastIdx(history,h=>h.status===status); if(i<0) return 0; const start=history[i].at; const end=history[i+1]?.at||nowIso(); return daysBetween(start,end) }
export function genOppCode(intercompany:boolean){ const now=new Date(); const yy=String(now.getFullYear()%100).padStart(2,'0'); const k='seq-'+yy; let seq=0; try{ seq=Number(localStorage.getItem(k)||'0') }catch{}; seq+=1; try{ localStorage.setItem(k,String(seq)) }catch{}; const prefix=intercompany?'I':'T'; return `${prefix}-${yy}${String(seq).padStart(3,'0')}` }

export function toCSV(rows:any[], cols:string[]){
  const esc=(v:any)=>{ const s=String(v??''); return s.includes(',')||s.includes('"')||s.includes('\n')? '"'+s.replace(/"/g,'""')+'"' : s }
  const head = cols.join(',')
  const body = rows.map(r=> cols.map(c=>esc(r[c])).join(',')).join('\n')
  return head+'\n'+body
}
export function download(filename:string, content:string, type='text/csv'){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000)
}
export function fmtMonth(d:Date){ return String(d.getFullYear())+'-'+String(d.getMonth()+1).padStart(2,'0') }
export function fmtWeek(d:Date){ const a=new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dayNum = a.getUTCDay() || 7; a.setUTCDate(a.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(a.getUTCFullYear(),0,1)); const weekNo = Math.ceil(((a.getTime()-yearStart.getTime())/86400000 + 1)/7); return a.getUTCFullYear()+'-W'+String(weekNo).padStart(2,'0') }
