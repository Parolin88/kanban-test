import React, { useMemo, useState } from 'react'
import type { Member, Opportunity, Sales } from '../lib/types'
import { fmt, nowIso } from '../lib/utils'
import { L1, L2, PRODUCT_FAMILIES, COLS, Status } from '../lib/constants'

export default function KanbanCard({ o, onDragStart, onSave, onDel, onNotify, teamOptions, membersById, salesById, gantt, badge, techOptions, procOptions, opsOptions, stratOptions }:{ 
  o:Opportunity; onDragStart:()=>void; onSave:(patch:Opportunity)=>void; onDel:(reason:'price'|'technology'|'lead_time'|'other')=>void; onNotify:()=>void;
  teamOptions: Member[]; membersById:Record<string,Member>; salesById:Record<string,Sales>;
  gantt:any; badge?:React.ReactNode;
  techOptions: Member[]; procOptions: Member[]; opsOptions: Member[]; stratOptions: Member[] }){

  const [open,setOpen]=useState(false)
  const [draft,setDraft]=useState<Opportunity>(o)
  const [delAsk,setDelAsk]=useState<{open:boolean; reason:'price'|'technology'|'lead_time'|'other'}>({open:false,reason:'other'})

  const plannedDueAt = useMemo(()=>{
    if(draft.plannedDueAt) return draft.plannedDueAt
    if(!draft.firstLevel || !draft.secondLevel) return undefined
    const g = gantt?.[draft.firstLevel]?.[draft.secondLevel]
    if(!g) return undefined
    const total = (g.internal||0)+(g.technical||0)+(g.procurement||0)+(g.strategic_ops||0)+(g.offer||0) + (draft.urs ? (draft.ursExtraDays||0) : 0)
    return total? new Date(new Date(draft.createdAt).getTime()+total*86400000).toISOString() : undefined
  },[draft.createdAt,draft.plannedDueAt,draft.firstLevel,draft.secondLevel,gantt,draft.urs,draft.ursExtraDays])

  const rush = useMemo(()=>{
    if(!draft.clientRequestedDueAt || !plannedDueAt) return false
    return new Date(draft.clientRequestedDueAt).getTime() < new Date(plannedDueAt).getTime()
  },[draft.clientRequestedDueAt, plannedDueAt])

  const bgClass = useMemo(()=>{
    if(o.status==='done') return 'green'
    if(o.state==='waiting_customer' || o.state==='waiting_sales') return 'waiting'
    const due = o.dueAt || plannedDueAt
    if(!due) return ''
    const start = new Date(o.createdAt).getTime()
    const end = new Date(due).getTime()
    const now = Date.now()
    if(now>=end) return 'urgent'
    const total = end-start
    const spent = now-start
    const ratio = total>0 ? spent/total : 0
    if(ratio>=0.75) return 'urgent'
    if(ratio>=0.5) return 'warn'
    return ''
  },[o.status,o.state,o.createdAt,o.dueAt,plannedDueAt])

  const ownerBadge=(id?:string,prefix?:string)=> id? <span className="chip">{prefix}{membersById[id]?.name}</span>:null
  const techFiltered = techOptions.filter(m=> !draft.productFamily || !m.specialties || m.specialties.includes(draft.productFamily!))

  function saveAndClose(){
    const patch: Opportunity = { ...draft }

    if(patch.state==='waiting_customer' || patch.state==='waiting_sales'){
      patch.status = 'to_do' as Status
    }

    const fd = patch.functionalDone||{}
    if((fd.technical||fd.procurement||fd.operations||fd.strategic) && patch.status!=='done'){
      patch.status = 'on_going' as Status
    }

    if(!patch.code){
      const inter = !!patch.intercompany
      const now = new Date()
      const yy = String(now.getFullYear()%100).padStart(2,'0')
      const key = 'seq-'+yy
      let seq=0
      try{ seq = Number(localStorage.getItem(key)||'0') }catch{ seq=0 }
      seq += 1
      try{ localStorage.setItem(key,String(seq)) }catch{}
      const prefix = inter ? 'I' : 'T'
      patch.code = `${prefix}-${yy}${String(seq).padStart(3,'0')}`
    }

    if(patch.status !== o.status){
      patch.statusHistory = [...o.statusHistory, {status: patch.status as Status, at: nowIso()}]
    }

    onSave(patch)
    setOpen(false)
  }

  return (<div draggable onDragStart={onDragStart} className={`card ${bgClass} ${rush?'rush':''}`}>
    <div className="title" style={{display:'flex',justifyContent:'space-between',gap:8}}>
      <span>{o.title}{o.revision?` (Rev ${o.revision})`:''}{o.keyAccount? ' ⭐':''} {o.code? <span className="chip">{o.code}</span>:null}</span>
      <span className="chips">
        {o.productFamily && <span className="chip">{o.productFamily}</span>}
        {o.firstLevel && <span className="chip">{o.firstLevel}</span>}
        {o.secondLevel && <span className="chip outline">{o.secondLevel}</span>}
        {rush && <span className="chip" style={{borderColor:'#D32F2F',color:'#D32F2F'}}>Rush</span>}
      </span>
    </div>
    {badge}
    <div className="meta">{/* Customer + requester, no created date in overview */}<span className={`customer ${o.keyAccount?'key':''} ${o.intercompany?'inter':''}`}>{o.customer||'—'}</span> · {o.region??'—'} · {(o.requesterId?membersById[o.requesterId]?.name||'—':'—')}</div>
    <div className="chips" style={{marginTop:6}}>
      {ownerBadge(o.functionalOwnerIds?.technical,'Tech: ')}
      {ownerBadge(o.functionalOwnerIds?.procurement,'Proc: ')}
      {ownerBadge(o.functionalOwnerIds?.operations,'Ops: ')}
      {ownerBadge(o.functionalOwnerIds?.strategic,'Strat: ')}
    </div>
    <div className="actions">
      <button className="btn-sm" onClick={()=>{ setDraft(o); setOpen(true) }}>Details</button>
      <button className="btn-sm btn-del" onClick={()=>setDelAsk(a=>({...a,open:true}))}>Delete</button>
      <button className="btn-sm" onClick={onNotify}>Export / Notify</button>
    
    {delAsk.open && (
      <div className="modal" style={{marginTop:8}}>
        <div className="title">Confirm delete</div>
        <div className="row">
          <span><label className="label">Reason</label>
            <select className="select" value={delAsk.reason} onChange={e=>setDelAsk({open:true, reason: e.target.value as any})}>
              <option value="price">Price</option>
              <option value="technology">Technology</option>
              <option value="lead_time">Lead time</option>
              <option value="other">Other</option>
            </select>
          </span>
        </div>
        <div className="actions">
          <button className="btn-sm btn-del" onClick={()=>{ onDel && onDel(delAsk.reason); setDelAsk({open:false,reason:'other'}); setOpen(false) }}>{/* placeholder */}Delete</button>
          <button className="btn-sm" onClick={()=>setDelAsk({open:false,reason:'other'})}>Cancel</button>
        </div>
      </div>
    )}
</div>

    {open && (<div className="modal" style={{marginTop:8}}>
      <div className="row"><span><label className="label">Created at</label><input className="select" value={fmt(o.createdAt)} readOnly/></span>
        <span><label className="label">Customer</label>
          <input className="select" value={draft.customer??''} onChange={e=>setDraft(d=>({...d,customer:e.target.value}))}/>
        </span>
        <span><label className="label">Title</label>
          <input className="select" value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/>
        </span>
      </div>
      <label className="label">Description</label><textarea className="textarea" value={draft.description??''} onChange={e=>setDraft(d=>({...d,description:e.target.value}))}/>

      <div className="row">
        <span><label className="label">Intercompany?</label>
          <select className="select" value={draft.intercompany? 'yes':'no'} onChange={e=>setDraft(d=>({...d,intercompany:e.target.value==='yes'}))}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select></span>
        <span><label className="label">Key Account</label>
          <select className="select" value={draft.keyAccount? 'yes':'no'} onChange={e=>setDraft(d=>({...d,keyAccount:e.target.value==='yes'}))}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select></span>
      </div>

      <div className="row">
        <span><label className="label">Product family</label>
          <select className="select" value={draft.productFamily??''} onChange={e=>setDraft(d=>({...d,productFamily:e.target.value as any}))}>
            <option value="">—</option>{PRODUCT_FAMILIES.map(x=> <option key={x} value={x}>{x}</option>)}
          </select></span>
        <span><label className="label">Requester (sales)</label>
          <select className="select" value={draft.requesterId??''} onChange={e=>setDraft(d=>({...d,requesterId:e.target.value||undefined}))}>
            <option value="">—</option>{Object.values(salesById).map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></span>
      </div>

      <div className="row">
        <span><label className="label">L1</label>
          <select className="select" value={draft.firstLevel??''} onChange={e=>setDraft(d=>({...d,firstLevel:e.target.value as any, plannedDueAt:undefined}))}>
            <option value="">—</option>{L1.map(x=> <option key={x} value={x}>{x}</option>)}
          </select></span>
        <span><label className="label">L2</label>
          <select className="select" value={draft.secondLevel??''} onChange={e=>setDraft(d=>({...d,secondLevel:e.target.value as any, plannedDueAt:undefined}))}>
            <option value="">—</option>{L2.map(x=> <option key={x} value={x}>{x}</option>)}
          </select></span>
      </div>

      <div className="row">
        <span><label className="label">URS present?</label>
          <select className="select" value={draft.urs? 'yes':'no'} onChange={e=>setDraft(d=>({...d,urs:e.target.value==='yes'}))}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select></span>
        <span><label className="label">URS extra days</label>
          <input type="number" min={0} className="select" value={draft.ursExtraDays??0} onChange={e=>setDraft(d=>({...d,ursExtraDays:Math.max(0,Number(e.target.value)), plannedDueAt:undefined}))}/>
        </span>
      </div>

      <div className="row">
        <span><label className="label">Assignee (Team only)</label>
          <select className="select" value={draft.assigneeId??''} onChange={e=>setDraft(d=>({...d,assigneeId:e.target.value||undefined}))}>
            <option value="">—</option>{teamOptions.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></span>
        <span><label className="label">Region</label>
          <select className="select" value={draft.region??'EMEA'} onChange={e=>setDraft(d=>({...d,region:e.target.value as any}))}>
            {['EMEA','AMER','APAC'].map(r=> <option key={r} value={r}>{r}</option>)}
          </select></span>
      </div>

      <div className="row">
        <span><label className="label">Client requested date</label>
          <input type="datetime-local" className="select" onChange={e=>setDraft(d=>({...d,clientRequestedDueAt:new Date(e.target.value).toISOString()}))}/>
        </span>
        <span><label className="label">Status (column)</label>
          <select className="select" value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value as Status}))}>
            {COLS.map(c=> <option key={c.k} value={c.k}>{c.label}</option>)}
          </select></span>
      </div>

      <div className="row">
        <span><label className="label">State</label>
          <select className="select" value={draft.state??'open'} onChange={e=>setDraft(d=>({...d,state:e.target.value as any}))}>
            <option value="open">Open</option>
            <option value="standby">Standby</option>
            <option value="waiting_customer">Waiting feedback (customer)</option>
            <option value="waiting_sales">Waiting feedback (sales)</option>
            <option value="lost">Lost</option>
            <option value="won">Won</option>
          </select></span>
        <span><label className="label">Offer value (€)</label>
          <input type="number" min={0} className="select" value={draft.valueOffered??0} onChange={e=>setDraft(d=>({...d,valueOffered:Math.max(0,Number(e.target.value))}))}/>
        </span>
      </div>

      {draft.state==='won' && (<div className="row">
        <span><label className="label">PO date</label>
          <input type="date" className="select" onChange={e=>setDraft(d=>({...d,poDate:new Date(e.target.value).toISOString()}))}/>
        </span>
        <span><label className="label">Contract value (€)</label>
          <input type="number" min={0} className="select" value={draft.contractValue??0} onChange={e=>setDraft(d=>({...d,contractValue:Math.max(0,Number(e.target.value))}))}/>
        </span>
      </div>)}

      <div className="row">
        <span><label className="label">Delivery time (months)</label>
          <input type="number" min={0} className="select" value={draft.deliveryTimeMonths??0} onChange={e=>setDraft(d=>({...d,deliveryTimeMonths:Math.max(0,Number(e.target.value))}))}/>
        </span>
      </div>

      <div className="row">
        <span><label className="label">Tech owner</label>
          <select className="select" value={(draft.functionalOwnerIds?.technical as string)??''} onChange={e=>setDraft(d=>({...d, functionalOwnerIds:{...d.functionalOwnerIds,technical:e.target.value||undefined} }))}>
            <option value="">—</option>{techOptions.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></span>
        <span><label className="label">Technical done?</label>
          <select className="select" value={draft.functionalDone?.technical?'yes':'no'} onChange={e=>setDraft(d=>({...d, functionalDone:{...d.functionalDone, technical:e.target.value==='yes'}}))}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select></span>
      </div>
      <div className="row">
        <span><label className="label">Procurement owner</label>
          <select className="select" value={(draft.functionalOwnerIds?.procurement as string)??''} onChange={e=>setDraft(d=>({...d, functionalOwnerIds:{...d.functionalOwnerIds,procurement:e.target.value||undefined} }))}>
            <option value="">—</option>{procOptions.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></span>
        <span><label className="label">Procurement done?</label>
          <select className="select" value={draft.functionalDone?.procurement?'yes':'no'} onChange={e=>setDraft(d=>({...d, functionalDone:{...d.functionalDone, procurement:e.target.value==='yes'}}))}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select></span>
      </div>
      <div className="row">
        <span><label className="label">Operations owner</label>
          <select className="select" value={(draft.functionalOwnerIds?.operations as string)??''} onChange={e=>setDraft(d=>({...d, functionalOwnerIds:{...d.functionalOwnerIds,operations:e.target.value||undefined} }))}>
            <option value="">—</option>{opsOptions.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></span>
        <span><label className="label">Operations done?</label>
          <select className="select" value={draft.functionalDone?.operations?'yes':'no'} onChange={e=>setDraft(d=>({...d, functionalDone:{...d.functionalDone, operations:e.target.value==='yes'}}))}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select></span>
      </div>
      <div className="row">
        <span><label className="label">Strategic Planning owner</label>
          <select className="select" value={(draft.functionalOwnerIds?.strategic as string)??''} onChange={e=>setDraft(d=>({...d, functionalOwnerIds:{...d.functionalOwnerIds,strategic:e.target.value||undefined} }))}>
            <option value="">—</option>{stratOptions.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></span>
        <span><label className="label">Strategic done?</label>
          <select className="select" value={draft.functionalDone?.strategic?'yes':'no'} onChange={e=>setDraft(d=>({...d, functionalDone:{...d.functionalDone, strategic:e.target.value==='yes'}}))}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select></span>
      </div>

      <div className="actions">
        <button className="btn-sm" onClick={saveAndClose}>Close / Save</button>
      </div>
    </div>)}
  </div>)
}