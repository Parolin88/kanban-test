import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COLS, L1, L2, PRODUCT_FAMILIES, DEFAULT_L2_HOURS, DEFAULT_GANTT, STATUS_TO_PHASE, Status } from './lib/constants'
import type { Member, Opportunity, AuditEvent, Sales, Archives } from './lib/types'
import { get, set, uid, nowIso, timeInCurrentStatus, addDays } from './lib/utils'
import KanbanColumn from './components/KanbanColumn'
import KanbanCard from './components/KanbanCard'
import SettingsDialog from './components/SettingsDialog'
import Dashboards from './components/Dashboards'
import InsightsPie from './components/InsightsPie'
type StatusOrNew = Status | 'new_opportunities'

export default function App(){
  const [team,setTeam]=useState<Member[]>(()=>get('team',[
    {id:'t1',name:'Alberto Frascari',email:''},
    {id:'t2',name:'Matteo Securo',email:''},
    {id:'t3',name:'Mikkel Lindhardt',email:''},
    {id:'t4',name:'Valentina Menapace',email:''},
    {id:'t5',name:'Roberto Simeoni',email:''},
  ]))
  const [techLeads,setTechLeads]=useState<Member[]>(()=>get('techLeads',[
    {id:'tl1',name:'Tech Lead A',email:'',specialties:['Glass Converting','Sterile']},
    {id:'tl2',name:'Tech Lead B',email:'',specialties:['Vision Inspection']},
  ]))
  const [procLeads,setProcLeads]=useState<Member[]>(()=>get('procLeads',[{id:'pl1',name:'Proc Lead A',email:''}]))
  const [opsLeads,setOpsLeads]=useState<Member[]>(()=>get('opsLeads',[{id:'ol1',name:'Ops Lead A',email:''}]))
  const [stratLeads,setStratLeads]=useState<Member[]>(()=>get('stratLeads',[{id:'sl1',name:'Strat Lead A',email:''}]))
  const [sales,setSales]=useState<Sales[]>(()=>get('sales',[{id:'s1',name:'John Sales',email:''},{id:'s2',name:'Mary Sales',email:''}]))
  const [l2Hours,setL2Hours]=useState<Record<string,number>>(()=>get('l2hours',DEFAULT_L2_HOURS as any))
  const [gantt,setGantt]=useState<any>(()=>get('gantt',DEFAULT_GANTT as any))
  const [notify,setNotify]=useState<{mode:'mailto'|'webhook';url?:string;sender?:string}>(()=>get('notify',{mode:'mailto',sender:'Head of Quotation'}))
  const [audit,setAudit]=useState<AuditEvent[]>(()=>get('audit',[]))
  const [archives,setArchives]=useState<Archives>(()=>{ const a = get('archives',{sent:[],won:[],lost:[],deleted:[]}); return {sent:a.sent||[], won:a.won||[], lost:a.lost||[], deleted:a.deleted||[]} })

  const demoItems = (()=>{
    const regions = ['EMEA','AMER','APAC']
    const l1s = L1 as unknown as string[]
    const l2s = L2 as unknown as string[]
    const fams = PRODUCT_FAMILIES as unknown as string[]
    const arr: Opportunity[] = []
    const now = new Date()
    for(let i=0;i<16;i++){
      const created = new Date(now.getTime() - (i*3+1)*86400000).toISOString()
      const l1 = l1s[i%l1s.length] as any
      const l2 = l2s[(i+1)%l2s.length] as any
      const fam = fams[i%fams.length] as any
      const title = `Opportunity #${200+i}`
      const status: StatusOrNew = i%5===0? 'done' : (i%4===0?'in_charge_procurement' : i%3===0?'in_charge_technical' : i%2===0?'on_going':'to_do')
      const history: any[] = [{status:'new_opportunities',at:created}]
      if(status!=='new_opportunities'){ history.push({status:'to_do',at:addDays(created,0.5)}) }
      if(['on_going','in_charge_technical','in_charge_procurement','in_charge_operations','in_charge_strategic','done'].includes(status)){ history.push({status:'on_going',at:addDays(created,1)}) }
      if(['in_charge_technical','in_charge_procurement','in_charge_operations','in_charge_strategic','done'].includes(status)){ history.push({status:'in_charge_technical',at:addDays(created,2)}) }
      if(['in_charge_procurement','in_charge_operations','in_charge_strategic','done'].includes(status)){ history.push({status:'in_charge_procurement',at:addDays(created,3)}) }
      if(['in_charge_operations','in_charge_strategic','done'].includes(status)){ history.push({status:'in_charge_operations',at:addDays(created,4)}) }
      if(['in_charge_strategic','done'].includes(status)){ history.push({status:'in_charge_strategic',at:addDays(created,5)}) }
      if(['done'].includes(status)){ history.push({status:'done',at:addDays(created,6)}) }
      arr.push({
        id:Math.random().toString(36).slice(2,9), title, customer:'ACME', region:regions[i%3] as any, requesterId: (i%2? 's1':'s2'),
        createdAt: created, status: status as any, statusHistory: history as any,
        firstLevel:l1, secondLevel:l2, productFamily:fam, keyAccount: i%7===0,
        assigneeId: (i%5? 't1':'t2'),
        functionalOwnerIds:{technical:'tl1', procurement: i%2?'pl1':undefined},
        functionalDone:{},
        revision: i%6===0 ? 1 : 0,
        clientRequestedDueAt: i%7===0? addDays(created,2): undefined,
        state: (i%8===0?'waiting_customer': i%7===0?'waiting_sales':'open'),
        valueOffered: 20000+i*500, deliveryTimeMonths: 2 + (i%4)
      })
    }
    return arr
  })()

  const [items,setItems]=useState<Opportunity[]>(()=>get('items', demoItems))
  const [q,setQ]=useState('')
  const [searchScope,setSearchScope]=useState<'board'|'sent'|'won'|'lost'|'deleted'|'all'>('board')
  const [assigneeFilter,setAssigneeFilter]=useState<string>('')
  const [tab,setTab]=useState<'board'|'dash'|'archive'|'insights'>('board')
  const [archTab,setArchTab]=useState<'sent'|'won'|'lost'|'deleted'>('sent')

  useEffect(()=>set('team',team),[team]); useEffect(()=>set('sales',sales),[sales])
  useEffect(()=>set('l2hours',l2Hours),[l2Hours]); useEffect(()=>set('gantt',gantt),[gantt])
  useEffect(()=>set('notify',notify),[notify]); useEffect(()=>set('audit',audit),[audit]); useEffect(()=>set('items',items),[items])
  useEffect(()=>set('techLeads',techLeads),[techLeads]); useEffect(()=>set('procLeads',procLeads),[procLeads]); useEffect(()=>set('opsLeads',opsLeads),[opsLeads]); useEffect(()=>set('stratLeads',stratLeads),[stratLeads])
  useEffect(()=>set('archives',archives),[archives])

  const membersById=useMemo(()=>Object.fromEntries([...team,...techLeads,...procLeads,...opsLeads,...stratLeads].map(m=>[m.id,m])),[team,techLeads,procLeads,opsLeads,stratLeads])
  const salesById=useMemo(()=>Object.fromEntries(sales.map(m=>[m.id,m])),[sales])

  // --- Handlers for card actions ---
  function onSave(id:string, patch: Opportunity){
    setItems(list=>{
      const next = list.map(it=> it.id===id ? ({...it, ...patch}) : it)
      return next
    })
    // Audit
    setAudit(log=>[...log, {id:Math.random().toString(36).slice(2,9), at: nowIso(), type:'status_change', opp: patch.title, from: '', to: patch.status as any, by:'', note:'' }])
  }

  function onDel(id:string, reason: 'price'|'technology'|'lead_time'|'other'){
    const victim = items.find(x=>x.id===id);
    if(!victim) return
    setItems(list=> list.filter(it=> it.id!==id))
    setArchives(arc=> ({...arc, deleted: [{...victim, deletedReason: reason, archivedAt: new Date().toISOString()}, ... (arc.deleted||[])]}))
    setAudit(log=>[...log, {id:Math.random().toString(36).slice(2,9), at: nowIso(), type:'deleted', opp: victim.title, note: `reason: ${reason}` }])
  }

  function onNotify(id:string){
    // no-op placeholder; existing export/notify flow remains as-is
  }

  // Sweep once: auto-archive
  useEffect(()=>{
    const now = Date.now()
    const seven = 7*86400000
    let changed=false
    const remain = [] as Opportunity[]
    const sent = [...archives.sent]
    const won = [...archives.won]
    const lost = [...archives.lost]
    for(const it of items){
      const last = it.statusHistory[it.statusHistory.length-1]?.at || it.createdAt
      if(it.status==='done' && (now - new Date(last).getTime()) > seven){
        sent.unshift({...it, archivedAt: new Date().toISOString()})
        changed=true
      } else if(it.state==='won'){
        won.unshift({...it, archivedAt: new Date().toISOString()})
        changed=true
      } else if(it.state==='lost'){
        lost.unshift({...it, archivedAt: new Date().toISOString()})
        changed=true
      } else {
        remain.push(it)
      }
    }
    if(changed){
      setItems(remain)
      setArchives({ sent, won, lost, deleted: archives.deleted })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const searchResults = useMemo(()=>{
    if(searchScope==='board') return [] as Opportunity[]
    const pool: Opportunity[] = []
    if(searchScope==='sent' || searchScope==='all') pool.push(...archives.sent)
    if(searchScope==='won'  || searchScope==='all') pool.push(...archives.won)
    if(searchScope==='lost' || searchScope==='all') pool.push(...archives.lost)
    if(searchScope==='deleted' || searchScope==='all') pool.push(...(archives.deleted||[]))
    const ql = q.trim().toLowerCase()
    if(!ql) return [] as Opportunity[]
    return pool.filter(i=>{
      const hay = `${i.title} ${i.customer??''} ${i.code??''} ${(i.requesterId?membersById[i.requesterId]?.name:'')??''} ${(i.assigneeId?membersById[i.assigneeId]?.name:'')??''} ${(i.salesId?salesById[i.salesId]?.name:'')??''}`.toLowerCase()
      return hay.includes(ql)
    })
  },[archives,searchScope,q,membersById,salesById])


  const boardFiltered = useMemo(()=> items.filter(i=>{
    const hay = `${i.title} ${i.customer??''} ${i.code??''} ${(i.requesterId?membersById[i.requesterId]?.name:'')??''} ${(i.assigneeId?membersById[i.assigneeId]?.name:'')??''} ${(i.salesId?salesById[i.salesId]?.name:'')??''}`.toLowerCase()
    const matchQ = q.trim()==='' ? true : hay.includes(q.toLowerCase())
    const matchAssignee = !assigneeFilter || assigneeFilter==='' ? true : (i.assigneeId===assigneeFilter)
    return matchQ && matchAssignee
  }),[items,q,assigneeFilter,membersById,salesById])
  const byCol=useMemo(()=>{const m:any = Object.fromEntries(COLS.map((c:any)=>[c.k,[]])); boardFiltered.forEach(i=>m[i.status].push(i)); return m},[boardFiltered])

  const log=(e:AuditEvent)=>setAudit(a=>[e,...a])

  const drag=useRef<string|undefined>()
  const onDragStart=(id:string)=>{drag.current=id}
  const onDrop=(status:Status)=>{ if(!drag.current) return; setItems(list=>list.map(x=> x.id===drag.current && x.status!==status ? ({...x,status, statusHistory:[...x.statusHistory,{status,at:nowIso()}]}) : x)); const o=items.find(i=>i.id===drag.current); if(o){ 
      if(status==='done'){ const v=Number(window.prompt('Offer value (EUR)?', String(o.valueOffered||''))||'0'); const m=Number(window.prompt('Delivery time (months)?', String(o.deliveryTimeMonths||''))||'0'); setItems(list=>list.map(x=> x.id===o.id? {...x,valueOffered:Math.max(0,v), deliveryTimeMonths:Math.max(0,m)}:x)) }
      log({id:Math.random().toString(36).slice(2,9),at:nowIso(),type:'status_change',opp:o.title,from:o.status,to:status,by:o.assigneeId}) } drag.current=undefined; }

  const add=()=>{const o:Opportunity={id:Math.random().toString(36).slice(2,9),title:'New opportunity',createdAt:nowIso(),status:'new_opportunities',statusHistory:[{status:'new_opportunities',at:nowIso()}],revision:0,state:'open',functionalDone:{}}; setItems([o,...items]); log({id:Math.random().toString(36).slice(2,9),at:nowIso(),type:'created',opp:o.title})}
  const save=(id:string,next:Opportunity)=>setItems(list=>list.map(x=> x.id===id? next: x))
  const del=(id:string)=>{ const victim = items.find(x=>x.id===id); setItems(list=>list.filter(x=>x.id!==id)); if(victim) log({id:Math.random().toString(36).slice(2,9),at:nowIso(),type:'deleted',opp:victim.title}) }

  function restoreFromArchive(kind:'sent'|'won'|'lost'|'deleted', idx:number){
    const arr = [...archives[kind]]
    const rec = arr.splice(idx,1)[0]
    let newOpp = {...rec}
    if(kind==='sent'){
      newOpp = {...newOpp, status:'on_going', statusHistory:[...newOpp.statusHistory, {status:'on_going',at:nowIso()}], revision:(newOpp.revision||0)+1, archivedAt:undefined, state:'open'}
      setItems([newOpp, ...items])
    } else {
      newOpp = {...newOpp, status:'to_do', statusHistory:[...newOpp.statusHistory, {status:'to_do',at:nowIso()}], archivedAt:undefined}
      setItems([newOpp, ...items])
    }
    setArchives({...archives, [kind]:arr})
  }

  const done = items.filter(i=>i.status==='done')

  return (<div>
    <div className='appbar'>
      <h1>SG Quotation & Proposal Management Kanban</h1>
      <div className='right'>
        <div className='tabs'>
          <button className={`tab ${tab==='board'?'active':''}`} onClick={()=>setTab('board')}>Board</button>
          <button className={`tab ${tab==='dash'?'active':''}`} onClick={()=>setTab('dash')}>Dashboards</button>
          <button className={`tab ${tab==='insights'?'active':''}`} onClick={()=>setTab('insights')}>Charts</button>
          <button className={`tab ${tab==='archive'?'active':''}`} onClick={()=>setTab('archive')}>Archive</button>
        </div>
        <button className='btn primary' onClick={add}>New</button>
        <SettingsDialog team={team} setTeam={setTeam} sales={sales} setSales={setSales} notify={notify} setNotify={setNotify} l2Hours={l2Hours} setL2Hours={setL2Hours} gantt={gantt} setGantt={setGantt} techLeads={techLeads} setTechLeads={setTechLeads} procLeads={procLeads} setProcLeads={setProcLeads} opsLeads={opsLeads} setOpsLeads={setOpsLeads} stratLeads={stratLeads} setStratLeads={setStratLeads}/>
    </div>
    </div>

    <div className='container'>
    {(tab==='board' || tab==='archive') && (<div className='toolbar' style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',margin:'8px 0'}}>
      <input className='input' placeholder='Cerca (titolo, cliente, sales)…' value={q} onChange={e=>setQ(e.target.value)} />
      <select className='input' value={searchScope} onChange={e=>setSearchScope(e.target.value as any)}>
        <option value='board'>Board</option>
        <option value='sent'>Archiviate (inviate)</option>
        <option value='won'>Vinte</option>
        <option value='lost'>Perse</option>
        <option value='deleted'>Cancellate</option>
        <option value='all'>Tutte</option>
      </select>
      <select className='input' value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)}>
        <option value=''>Assegnatario: tutti</option>
        {team.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>)}

    {tab==='archive' && q && searchScope!=='board' && (
      <div className='card' style={{marginTop:12}}>
        <div className='title'>Risultati ricerca ({searchScope})</div>
        <div className='meta'>{searchResults.length} risultati</div>
        <div style={{marginTop:8,display:'grid',gap:6}}>
          {searchResults.map(r=> (
            <div key={r.id} className='row' style={{gridTemplateColumns:"2fr 1fr 1fr"}}>
              <div><strong>{r.title}</strong> – <span className={`customer ${r.keyAccount?'key':''} ${r.intercompany?'inter':''}`}>{r.customer||'—'}</span></div>
              <div className='meta'>{r.code??'—'} · {r.region??'—'}</div>
              <div className='meta'>stato: {r.status}{r.archivedAt?` · archiviata ${new Date(r.archivedAt).toLocaleDateString()}`:''}</div>
            </div>
          ))}
          {searchResults.length===0 && <div className='meta'>Nessun risultato</div>}
        </div>
      </div>
    )}

      {tab==='board' ? (<>
        <div className='kpi'>
          <div className='k'><div className='meta'>Total opportunities</div><div className='n'>{items.length}</div></div>
          <div className='k'><div className='meta'>Offers sent (Done)</div><div className='n'>{done.length}</div></div>
          <div className='k'><div className='meta'>Archives</div><div className='n'>{archives.sent.length+archives.won.length+archives.lost.length}</div></div>
          <div className='k'><div className='meta'>Live</div><div className='n'>—</div></div>
        </div>

        <div className='board' style={{marginTop:12}}>
          {COLS.slice(0,4).map((c:any)=> (<KanbanColumn key={c.k} title={c.label}>
            {byCol[c.k].map((o:Opportunity)=>{ const g=(o.firstLevel && o.secondLevel ? gantt?.[o.firstLevel]?.[o.secondLevel] || {} : {}); const baseDays=(g.internal||0)+(g.technical||0)+(g.procurement||0)+(g.strategic_ops||0)+(g.offer||0)+(o.urs?(o.ursExtraDays||0):0); const planned = o.plannedDueAt || (baseDays ? new Date(new Date(o.createdAt).getTime()+baseDays*86400000).toISOString() : undefined); const badge = <div className='chips'><span className='chip outline'>{planned?`Planned: ${new Date(planned).toLocaleDateString()}`:'—'}</span>{o.rush && <span className='chip' style={{borderColor:'#D32F2F',color:'#D32F2F'}}>Rush</span>}</div>; return <KanbanCard key={o.id} o={o} onDragStart={()=>onDragStart(o.id)} onSave={(patch)=>onSave(o.id,patch)} onDel={(reason)=>onDel(o.id, reason)} onNotify={()=>onNotify(o.id)} teamOptions={team} membersById={membersById} salesById={salesById} gantt={gantt} badge={badge} techOptions={techLeads} procOptions={procLeads} opsOptions={opsLeads} stratOptions={stratLeads} /> })}
          </KanbanColumn>))}
        </div>

        <div className='board' style={{marginTop:12}}>
          {COLS.slice(4).map((c:any)=> (<KanbanColumn key={c.k} title={c.label} support>
            {byCol[c.k].map((o:Opportunity)=>{ const g=(o.firstLevel && o.secondLevel ? gantt?.[o.firstLevel]?.[o.secondLevel] || {} : {}); const baseDays=(g.internal||0)+(g.technical||0)+(g.procurement||0)+(g.strategic_ops||0)+(g.offer||0)+(o.urs?(o.ursExtraDays||0):0); const planned = o.plannedDueAt || (baseDays ? new Date(new Date(o.createdAt).getTime()+baseDays*86400000).toISOString() : undefined); const badge = <div className='chips'><span className='chip outline'>{planned?`Planned: ${new Date(planned).toLocaleDateString()}`:'—'}</span>{o.rush && <span className='chip' style={{borderColor:'#D32F2F',color:'#D32F2F'}}>Rush</span>}</div>; return <KanbanCard key={o.id} o={o} onDragStart={()=>onDragStart(o.id)} onSave={(patch)=>onSave(o.id,patch)} onDel={(reason)=>onDel(o.id, reason)} onNotify={()=>onNotify(o.id)} teamOptions={team} membersById={membersById} salesById={salesById} gantt={gantt} badge={badge} techOptions={techLeads} procOptions={procLeads} opsOptions={opsLeads} stratOptions={stratLeads} /> })}
          </KanbanColumn>))}
        </div>
      </>) : tab==='dash' ? (
        <Dashboards items={items} archives={archives} team={team} sales={sales} l2Hours={l2Hours} gantt={gantt} />
      ) : tab==='insights' ? (
        <InsightsPie items={items} archives={archives} membersById={membersById} salesById={salesById} />
      ) : (
        <div className='card'>
          <div className='title'>Archive</div>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button className='btn-sm' onClick={()=>setArchTab('sent')}>Sent (auto 7d)</button>
            <button className='btn-sm' onClick={()=>setArchTab('won')}>Won</button>
            <button className='btn-sm' onClick={()=>setArchTab('lost')}>Lost</button>
            <button className='btn-sm' onClick={()=>setArchTab('deleted')}>Deleted</button>
          </div>
          <div style={{marginTop:12,display:'grid',gap:8}}>
            {(archives[archTab]||[]).map((r,i)=> (<div key={r.id} className='card'>
              <div className='title' style={{display:'flex',justifyContent:'space-between',gap:8}}>
                <span>{r.title} {r.customer?` – ${r.customer}`:''}</span>
                <span className='chips'>
                  {r.firstLevel && <span className='chip'>{r.firstLevel}</span>}
                  {r.secondLevel && <span className='chip outline'>{r.secondLevel}</span>}
                  {r.productFamily && <span className='chip'>{r.productFamily}</span>}
                </span>
              </div>
              <div className='meta'>{r.code??'—'} · {r.region??'—'} · status: {archTab==='deleted'?'deleted':r.status}{archTab==='lost' && r.lostReason?` · reason: ${r.lostReason}`:''}{archTab==='deleted' && r.deletedReason?` · reason: ${r.deletedReason}`:''} · archiviata {r.archivedAt?new Date(r.archivedAt).toLocaleDateString():''}</div>
              <div className='actions'>{archTab!=='won' && <button className='btn-sm' onClick={()=>restoreFromArchive(archTab,i)}>Restore</button>}</div>
            </div>))}
            {archives[archTab].length===0 && <div className='meta'>No records in this archive</div>}
          </div>
        </div>
      )}


      <details style={{marginTop:16}} className='card'>
        <summary className='title'>Audit log</summary>
        <div className='meta'>{audit.map(e=> <div key={e.id} style={{borderTop:'1px solid var(--border)',padding:'6px 0'}}><b>{new Date(e.at).toLocaleString()}</b> – {e.type} – {e.opp}{e.from?` (${e.from}→${e.to})`:''} {e.note?` – ${e.note}`:''}</div>)}</div>
      </details>

      <div className='footer'>SG Quotation & Proposal Management Kanban</div>
    </div>
  </div>)
}