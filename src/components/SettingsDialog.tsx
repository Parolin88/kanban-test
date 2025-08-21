import React, { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Member, Sales } from '../lib/types'
import { L1, L2, PRODUCT_FAMILIES, DEFAULT_L2_HOURS, DEFAULT_GANTT } from '../lib/constants'
import { uid } from '../lib/utils'

export default function SettingsDialog({
  team, setTeam, sales, setSales, notify, setNotify, l2Hours, setL2Hours, gantt, setGantt,
  techLeads, setTechLeads, procLeads, setProcLeads, opsLeads, setOpsLeads, stratLeads, setStratLeads
}:{
  team:Member[]; setTeam: Dispatch<SetStateAction<Member[]>>; sales:Sales[]; setSales: Dispatch<SetStateAction<Sales[]>>;
  notify:{mode:'mailto'|'webhook'; url?:string; sender?:string}; setNotify: Dispatch<SetStateAction<{mode:'mailto'|'webhook'; url?:string; sender?:string}>>;
  l2Hours:Record<string,number>; setL2Hours: Dispatch<SetStateAction<Record<string,number>>>;
  gantt:any; setGantt: Dispatch<SetStateAction<any>>;
  techLeads:Member[]; setTechLeads: Dispatch<SetStateAction<Member[]>>;
  procLeads:Member[]; setProcLeads: Dispatch<SetStateAction<Member[]>>;
  opsLeads:Member[]; setOpsLeads: Dispatch<SetStateAction<Member[]>>;
  stratLeads:Member[]; setStratLeads: Dispatch<SetStateAction<Member[]>>;
}){

  const [open,setOpen]=useState(false)
  const [tab,setTab]=useState<'team'|'sales'|'functional'|'hours'|'gantt'|'notify'>('team')
  const [sub,setSub]=useState<'tech'|'proc'|'ops'|'strat'>('tech')
  const [localTeam,setLocalTeam]=useState<Member[]>(team)
  const [localSales,setLocalSales]=useState<Sales[]>(sales)
  const [localNotify,setLocalNotify]=useState(notify)
  const [localHours,setLocalHours]=useState<Record<string,number>>(l2Hours)
  const [selL1,setSelL1]=useState<typeof L1[number]>('Budget')
  const [selL2,setSelL2]=useState<typeof L2[number]>('Standard')
  const [localGantt,setLocalGantt]=useState<any>(gantt)
  const [localTech,setLocalTech]=useState<Member[]>(techLeads)
  const [localProc,setLocalProc]=useState<Member[]>(procLeads)
  const [localOps,setLocalOps]=useState<Member[]>(opsLeads)
  const [localStrat,setLocalStrat]=useState<Member[]>(stratLeads)

  useEffect(()=>{setLocalTeam(team)},[team]); useEffect(()=>{setLocalSales(sales)},[sales])
  useEffect(()=>{setLocalNotify(notify)},[notify]); useEffect(()=>{setLocalHours(l2Hours)},[l2Hours])
  useEffect(()=>{setLocalGantt(gantt)},[gantt])
  useEffect(()=>{setLocalTech(techLeads)},[techLeads]); useEffect(()=>{setLocalProc(procLeads)},[procLeads])
  useEffect(()=>{setLocalOps(opsLeads)},[opsLeads]); useEffect(()=>{setLocalStrat(stratLeads)},[stratLeads])

  const apply=()=>{ setTeam(localTeam); setSales(localSales); setNotify(localNotify); setL2Hours(localHours); setGantt(localGantt);
    setTechLeads(localTech); setProcLeads(localProc); setOpsLeads(localOps); setStratLeads(localStrat); setOpen(false) }

  const updatePhase=(phase:'internal'|'technical'|'procurement'|'strategic_ops'|'offer', value:number)=>{
    const g = {...localGantt}
    g[selL1] = g[selL1] || {}
    g[selL1][selL2] = g[selL1][selL2] || {internal:0,technical:0,procurement:0,strategic_ops:0,offer:0}
    g[selL1][selL2][phase] = Math.max(0, value)
    setLocalGantt(g)
  }

  const renderDir = (arr:Member[], setArr: Dispatch<SetStateAction<Member[]>>, withSpecialties:boolean)=> (<div>
    {arr.map(m=> (<div key={m.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,alignItems:'start',marginTop:8}}>
      <div><input className="select" value={m.name} onChange={e=>setArr(t=>t.map(x=>x.id===m.id?{...x,name:e.target.value}:x))}/></div>
      <div><input className="select" placeholder="email" value={m.email??''} onChange={e=>setArr(t=>t.map(x=>x.id===m.id?{...x,email:e.target.value}:x))}/></div>
      <button className="btn-sm btn-del" onClick={()=>setArr(t=>t.filter(x=>x.id!==m.id))}>Remove</button>
      {withSpecialties && (<div style={{gridColumn:'1 / span 3',display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
        {PRODUCT_FAMILIES.map(f=> (<label key={f} className="meta"><input type="checkbox" checked={(m.specialties||[]).includes(f)} onChange={e=>{
          setArr(t=>t.map(x=>x.id===m.id? {...x, specialties: e.target.checked ? Array.from(new Set([...(x.specialties||[]), f])) : (x.specialties||[]).filter(s=>s!==f) } : x))
        }}/> {f}</label>))}
      </div>)}
    </div>))}
    <div className="actions" style={{marginTop:8}}><button className="btn-sm" onClick={()=>setArr(t=>[...t,{id:uid(),name:'New member',email:'',specialties:withSpecialties?[]:undefined}])}>Add member</button></div>
  </div>)

  return (<>
    <button className="btn ghost" onClick={()=>setOpen(!open)}>Settings</button>
    {open && (<div className="modal" style={{marginTop:8}}>
      <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <button className="btn-sm" onClick={()=>setTab('team')}>Team</button>
        <button className="btn-sm" onClick={()=>setTab('sales')}>Sales</button>
        <button className="btn-sm" onClick={()=>setTab('functional')}>Functional Leads</button>
        <button className="btn-sm" onClick={()=>setTab('hours')}>L2 Hours</button>
        <button className="btn-sm" onClick={()=>setTab('gantt')}>Gantt (L1+L2)</button>
        <button className="btn-sm" onClick={()=>setTab('notify')}>Notifications</button>
      </div>

      {tab==='team' && (<div>
        <div className="title">Team directory</div>
        {renderDir(localTeam,setLocalTeam,false)}
      </div>)}

      {tab==='sales' && (<div>
        <div className="title">Sales directory</div>
        {localSales.map(m=> (<div key={m.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,alignItems:'center',marginTop:8}}>
          <input className="select" value={m.name} onChange={e=>setLocalSales(t=>t.map(x=>x.id===m.id?{...x,name:e.target.value}:x))}/>
          <input className="select" placeholder="email" value={m.email??''} onChange={e=>setLocalSales(t=>t.map(x=>x.id===m.id?{...x,email:e.target.value}:x))}/>
          <button className="btn-sm btn-del" onClick={()=>setLocalSales(t=>t.filter(x=>x.id!==m.id))}>Remove</button>
        </div>))}
        <div className="actions" style={{marginTop:8}}><button className="btn-sm" onClick={()=>setLocalSales(t=>[...t,{id:uid(), name:'New salesperson', email:''}])}>Add salesperson</button></div>
      </div>)}

      {tab==='functional' && (<div>
        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <button className="btn-sm" onClick={()=>setSub('tech')}>Technical</button>
          <button className="btn-sm" onClick={()=>setSub('proc')}>Procurement</button>
          <button className="btn-sm" onClick={()=>setSub('ops')}>Operations</button>
          <button className="btn-sm" onClick={()=>setSub('strat')}>Strategic Planning</button>
        </div>
        {sub==='tech' && (<div><div className="title">Technical Leads (with specialties)</div>{renderDir(localTech,setLocalTech,true)}</div>)}
        {sub==='proc' && (<div><div className="title">Procurement Leads</div>{renderDir(localProc,setLocalProc,false)}</div>)}
        {sub==='ops' && (<div><div className="title">Operations Leads</div>{renderDir(localOps,setLocalOps,false)}</div>)}
        {sub==='strat' && (<div><div className="title">Strategic Planning Leads</div>{renderDir(localStrat,setLocalStrat,false)}</div>)}
      </div>)}

      {tab==='hours' && (<div>
        <div className="title">Effort per L2 tag (hours)</div>
        {Object.entries(localHours).map(([k,v])=> (<div key={k} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
          <label className="label">{k}</label>
          <input type="number" min={0} className="select" value={v} onChange={e=>setLocalHours(h=>({...h,[k]:Math.max(0,Number(e.target.value))}))}/>
        </div>))}
        <div className="actions" style={{marginTop:8}}><button className="btn-sm" onClick={()=>setLocalHours(DEFAULT_L2_HOURS)}>Reset</button></div>
      </div>)}

      {tab==='gantt' && (<div>
        <div className="title">Gantt presets by L1 + L2 (days)</div>
        <div className="row">
          <span><label className="label">Tag L1</label>
            <select className="select" value={selL1} onChange={e=>setSelL1(e.target.value as any)}>{L1.map(x=> <option key={x} value={x}>{x}</option>)}</select>
          </span>
          <span><label className="label">Tag L2</label>
            <select className="select" value={selL2} onChange={e=>setSelL2(e.target.value as any)}>{L2.map(x=> <option key={x} value={x}>{x}</option>)}</select>
          </span>
        </div>
        {['internal','technical','procurement','strategic_ops','offer'].map((ph)=>{
          const v = localGantt?.[selL1]?.[selL2]?.[ph] ?? 0
          const label = ph==='strategic_ops' ? 'Strategic & Operations Planning' :
                        ph==='internal' ? 'Internal Analysis' :
                        ph==='technical' ? 'Technical Review' :
                        ph==='procurement' ? 'Procurement Review' : 'Offer Preparation'
          return (<div key={ph} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
            <label className="label">{label}</label>
            <input type="number" min={0} className="select" value={v} onChange={e=>{ const n=Math.max(0,Number(e.target.value)); const g={...localGantt}; g[selL1]=g[selL1]||{}; g[selL1][selL2]=g[selL1][selL2]||{internal:0,technical:0,procurement:0,strategic_ops:0,offer:0}; g[selL1][selL2][ph]=n; setLocalGantt(g) }}/>
          </div>)
        })}
        <div className="actions" style={{marginTop:8}}>
          <button className="btn-sm" onClick={()=>setLocalGantt(DEFAULT_GANTT)}>Reset presets</button>
        </div>
      </div>)}

      {tab==='notify' && (<div>
        <div className="title">Notifications</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <select className="select" value={localNotify.mode} onChange={e=>setLocalNotify({...localNotify,mode:e.target.value as any})}>
            <option value="mailto">Mailto</option><option value="webhook">Webhook</option>
          </select>
          <input className="select" placeholder="Webhook URL" value={localNotify.url??''} onChange={e=>setLocalNotify({...localNotify,url:e.target.value})}/>
          <input className="select" placeholder="Sender" value={localNotify.sender??''} onChange={e=>setLocalNotify({...localNotify,sender:e.target.value})}/>
        </div>
      </div>)}

      <div className="actions" style={{marginTop:8}}><button className="btn-sm" onClick={apply}>Save</button></div>
    </div>)}
  </>)
}