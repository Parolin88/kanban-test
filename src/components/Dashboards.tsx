import React, { useEffect, useMemo, useState } from 'react'
import type { Opportunity, Archives, Member, Sales } from '../lib/types'
import { toCSV, download, fmtMonth, fmtWeek, daysBetween } from '../lib/utils'
import { BarChart, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'

// --- Color palette for charts ---
const PALETTE = {
  // Stevanato-aligned palette (primary blue + cool accents)
  bars: ['#0055A5','#00A3AD','#7FB3D5','#00A651','#F5A623','#8E44AD','#7DCEA0','#5DADE2','#566573','#B3B6B7'],
  actual: '#0055A5',
  target: '#F5A623',
  line: '#00A3AD',
  ontimeByPhase: {
    internal: '#0055A5',
    technical: '#F5A623',
    procurement: '#00A651',
    strategic_ops: '#8E44AD',
    offer: '#00A3AD'
  },
  outcome: {
    Open: '#0055A5',
    Standby: '#8E44AD',
    'Waiting FB': '#F5A623',
    Lost: '#E45756',
    Won: '#00A651'
  }
}



type Gran = 'weekly'|'monthly'|'yearly'
type ProgGran = 'week'|'month'

function groupKey(gran:Gran, d:Date){
  if(gran==='yearly') return String(d.getFullYear())
  if(gran==='monthly') return fmtMonth(d)
  return fmtWeek(d)
}

const nf = new Intl.NumberFormat(undefined)
const nfCompact = new Intl.NumberFormat(undefined, { notation:'compact' })
const nfEUR = new Intl.NumberFormat(undefined, { style:'currency', currency:'EUR', maximumFractionDigits:0 })

function getYear(d:Date){ return d.getFullYear() }

function scaleSuffix(f:number){ return f===1? '' : (f===1e3? 'k' : (f===1e6? 'M' : '')) }
function fmtScaledCount(n:any, f:number){ const v=(Number(n)||0)/f; const s=scaleSuffix(f); return nf.format(v)+(s?(' '+s):'') }
function fmtScaledEUR(n:any, f:number){ const v=(Number(n)||0)/f; const s=scaleSuffix(f); return nf.format(v)+(s?' '+s:'')+'€' }

import { STATUS_TO_PHASE } from '../lib/constants'

export default function Dashboards({ items, archives, team, sales, l2Hours, gantt }:{ items:Opportunity[]; archives:Archives; team:Member[]; sales:Sales[]; l2Hours:Record<string,number>; gantt:any }){
  const [gran,setGran]=useState<Gran>('monthly')
  const [compact,setCompact]=useState(false)
  const [series,setSeries]=useState<{offers:boolean; wins:boolean; workload:boolean}>({offers:true,wins:true,workload:true})
  const [dim,setDim]=useState<'product'|'region'|'assignee'|'sales'>('product')
  const [progGran,setProgGran]=useState<ProgGran>('week')
  const [yearsSel,setYearsSel]=useState<number[]|null>(null) // null = auto latest 2

  // Scaling controls
  const [scaleCount,setScaleCount]=useState<number>(1)  // 1, 1e3, 1e6
  const [scaleValue,setScaleValue]=useState<number>(1)  // for EUR charts

  // Custom dashboards
  type WidgetType = 'offers_time'|'intake_time'|'workload'|'outcome'|'won_by_dim'|'prog_offers'|'prog_offers_val'|'prog_intake'
  type Widget = { id:string; title:string; type:WidgetType; w:1|2; h:240|320|420; dim?: 'product'|'region'|'assignee'|'sales' }

  const [custom,setCustom]=useState<Widget[]>(()=>{
    try{ const raw = localStorage.getItem('dash_custom'); return raw? JSON.parse(raw): [] }catch{return []}
  })
  useEffect(()=>{ try{ localStorage.setItem('dash_custom', JSON.stringify(custom)) }catch{} },[custom])

  const live = items
  const sent = archives.sent
  const won = archives.won
  const lost = archives.lost

  const byId = useMemo(()=>Object.fromEntries(team.map(m=>[m.id,m.name])),[team])
  const salesById = useMemo(()=>Object.fromEntries(sales.map(s=>[s.id,s.name])),[sales])

  // --- Helpers ---
  function getDoneDate(it:Opportunity): Date|undefined{
    const hit = it.statusHistory.find(s=>s.status==='done')
    return hit ? new Date(hit.at) : undefined
  }
  const allYears = useMemo(()=>{
    const ys = new Set<number>()
    for(const it of [...live, ...sent, ...won, ...lost]){
      const d = getDoneDate(it) || (it.poDate? new Date(it.poDate) : (it.createdAt? new Date(it.createdAt):undefined))
      if(d) ys.add(d.getFullYear())
    }
    return Array.from(ys).sort((a,b)=>a-b)
  },[live,sent,won,lost])

  const yearsToPlot = useMemo(()=>{
    if(yearsSel && yearsSel.length) return yearsSel
    if(allYears.length<=2) return allYears
    return allYears.slice(-2) // latest 2 by default
  },[allYears, yearsSel])

  // --- Workload per assignee (hours) using L2 hours ---
  const workload = useMemo(()=>{
    const m = new Map<string, number>()
    for(const it of live){
      const assignee = it.assigneeId
      if(!assignee) continue
      const h = l2Hours[it.secondLevel||'']||0
      m.set(assignee, (m.get(assignee)||0) + h)
    }
    return Array.from(m.entries()).map(([id,val])=>({ name: byId[id]||id, hours: Math.round(val) }))
  },[live,l2Hours,byId])

  // --- Offers sent timeline (count) ---
  const offersSeries = useMemo(()=>{
    const m = new Map<string, number>()
    const all = [...live.filter(i=>i.status==='done'), ...sent]
    for(const it of all){
      const d = getDoneDate(it); if(!d) continue
      const k = groupKey(gran,d)
      m.set(k, (m.get(k)||0)+1)
    }
    return Array.from(m.entries()).sort((a,b)=>a[0]<b[0]?-1:1).map(([k,v])=>({ period:k, offers:v }))
  },[live,sent,gran])

  // --- Wins (order intake value) timeline ---
  const winsSeries = useMemo(()=>{
    const m = new Map<string, number>()
    const all = [...won, ...live.filter(i=>i.state==='won')]
    for(const it of all){
      const d = it.poDate ? new Date(it.poDate) : (getDoneDate(it)|| new Date(it.createdAt))
      const k = groupKey(gran,d)
      m.set(k, (m.get(k)||0)+(it.contractValue||0))
    }
    return Array.from(m.entries()).sort((a,b)=>a[0]<b[0]?-1:1).map(([k,v])=>({ period:k, orderIntake:v }))
  },[won,live,gran])

  // --- Outcome snapshot ---
  const outcome = useMemo(()=>{
    return [
      { k:'Open', v: live.filter(i=>i.state==='open').length },
      { k:'Standby', v: live.filter(i=>i.state==='standby').length },
      { k:'Waiting FB', v: live.filter(i=>i.state==='waiting_customer'||i.state==='waiting_sales').length },
      { k:'Lost', v: lost.length + live.filter(i=>i.state==='lost').length },
      { k:'Won', v: won.length + live.filter(i=>i.state==='won').length },
    ]
  },[live,won,lost])

  // --- Won by dimension (value) ---
  const [dimLocal,setDimLocal]=useState<'product'|'region'|'assignee'|'sales'>('product')
  const dimWon = useMemo(()=>{
    const m = new Map<string, number>()
    const all = [...won, ...live.filter(i=>i.state==='won')]
    for(const it of all){
      let key='?'
      if(dimLocal==='product') key = it.productFamily||'?'
      if(dimLocal==='region') key = it.region||'?'
      if(dimLocal==='assignee') key = byId[it.assigneeId||'']||'?'
      if(dimLocal==='sales') key = salesById[it.requesterId||'']||'?'
      m.set(key, (m.get(key)||0) + (it.contractValue||0))
    }
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({ name:k, value:Math.round(v) }))
  },[won,live,dimLocal,byId,salesById])

  // ------------------ Comparative & Progressive ------------------
  type Reducer = (it:Opportunity)=>number
  const one = (it:Opportunity)=>1
  const valueOfferedRev0: Reducer = (it)=> (it.revision??0)===0 ? (it.valueOffered||0) : 0
  const orderIntakeVal: Reducer = (it)=> it.contractValue||0

  function buildProgressiveByYear({ list, dateOf, reducer, gran }:{ list:Opportunity[]; dateOf:(o:Opportunity)=>Date|undefined; reducer:Reducer; gran:ProgGran }){
    const data = new Map<number, Map<number, number>>() // year -> idx(week or month) -> cumulative
    const tmp = new Map<number, Map<number, number>>() // year -> idx -> sum for that period

    for(const it of list){
      const d = dateOf(it); if(!d) continue
      const y = d.getFullYear()
      const idx = gran==='week' ? Number((fmtWeek(d)).slice(-2)) : (d.getMonth()+1) // 1..52 or 1..12
      const val = reducer(it)
      if(!tmp.has(y)) tmp.set(y, new Map())
      tmp.get(y)!.set(idx, (tmp.get(y)!.get(idx)||0) + val)
    }
    // sort and cumulate
    for(const [y,map] of tmp){
      const keys = Array.from(map.keys()).sort((a,b)=>a-b)
      let acc = 0
      const out = new Map<number, number>()
      for(const k of keys){
        acc += map.get(k)!
        out.set(k, acc)
      }
      data.set(y,out)
    }
    return data
  }

  // Offers progressive count (doneAt)
  const progOffers = useMemo(()=> buildProgressiveByYear({
      list:[...live.filter(i=>i.status==='done'), ...sent],
      dateOf:(it)=> getDoneDate(it),
      reducer:one,
      gran:progGran
  }),[live,sent,progGran])

  // Offers progressive value (rev 0) (doneAt)
  const progOffersVal = useMemo(()=> buildProgressiveByYear({
      list:[...live.filter(i=>i.status==='done'), ...sent],
      dateOf:(it)=> getDoneDate(it),
      reducer:valueOfferedRev0,
      gran:progGran
  }),[live,sent,progGran])

  // Order intake progressive (PO date or doneAt)
  const progIntake = useMemo(()=> buildProgressiveByYear({
      list:[...won, ...live.filter(i=>i.state==='won')],
      dateOf:(it)=> it.poDate? new Date(it.poDate) : getDoneDate(it),
      reducer:orderIntakeVal,
      gran:progGran
  }),[won,live,progGran])

  function toOverlayDataset(m:Map<number, Map<number, number>>, ys:number[]){
    const maxIdx = progGran==='week'? 52 : 12
    const rows: any[] = []
    for(let i=1;i<=maxIdx;i++){
      const row: any = { idx: i }
      for(const y of ys){
        row[y] = m.get(y)?.get(i) ?? null
      }
      rows.push(row)
    }
    return rows
  }

  const yearsAvailable = allYears
  const overlayOffers = useMemo(()=> toOverlayDataset(progOffers, yearsToPlot), [progOffers, yearsToPlot, progGran])
  const overlayOffersVal = useMemo(()=> toOverlayDataset(progOffersVal, yearsToPlot), [progOffersVal, yearsToPlot, progGran])
  const overlayIntake = useMemo(()=> toOverlayDataset(progIntake, yearsToPlot), [progIntake, yearsToPlot, progGran])

  
  // ----- SLA Calculations -----
  type PhaseKey = 'internal'|'technical'|'procurement'|'strategic_ops'|'offer'
  function durationsByPhase(it:Opportunity){
    const out: Record<PhaseKey, number> = { internal:0, technical:0, procurement:0, strategic_ops:0, offer:0 }
    const h = (it.statusHistory||[]).slice().sort((a,b)=> new Date(a.at).getTime()-new Date(b.at).getTime())
    for(let i=0;i<h.length-1;i++){
      const cur = h[i], nxt = h[i+1]
      const curPhase = (STATUS_TO_PHASE as any)[cur.status] as PhaseKey|undefined
      const nxtPhase = (STATUS_TO_PHASE as any)[nxt.status] as PhaseKey|undefined
      // If next is 'done' → attribute the interval to 'offer' (finalization)
      if(nxt.status==='done'){
        const days = daysBetween(cur.at, nxt.at)
        out.offer += Math.max(0, days)
      } else if(curPhase){
        const days = daysBetween(cur.at, nxt.at)
        out[curPhase] += Math.max(0, days)
      }
    }
    // Tail (if still in progress)
    const last = h[h.length-1]
    if(last && last.status!=='done'){
      const curPhase = (STATUS_TO_PHASE as any)[last.status] as PhaseKey|undefined
      if(curPhase){
        const days = daysBetween(last.at, new Date().toISOString())
        out[curPhase] += Math.max(0, days)
      }
    }
    return out
  }

  function targetByPhase(it:Opportunity){
    const g = (it.firstLevel && it.secondLevel) ? (gantt?.[it.firstLevel]?.[it.secondLevel] || {}) : {}
    const out: Record<PhaseKey, number> = { internal:g.internal||0, technical:g.technical||0, procurement:g.procurement||0, strategic_ops:g.strategic_ops||0, offer:g.offer||0 }
    if(it.urs){ out.technical += Math.max(0, it.ursExtraDays||0) }
    return out
  }

  const slaAgg = useMemo(()=>{
    const acc = {
      internal:{sumA:0,sumT:0,on:0,n:0},
      technical:{sumA:0,sumT:0,on:0,n:0},
      procurement:{sumA:0,sumT:0,on:0,n:0},
      strategic_ops:{sumA:0,sumT:0,on:0,n:0},
      offer:{sumA:0,sumT:0,on:0,n:0},
    } as any

    const leaders: Record<string,{sumOver:number,nLate:number}> = {}

    const consider = [...live, ...sent] // opportunities with enough history
    for(const it of consider){
      const d = durationsByPhase(it)
      const t = targetByPhase(it)
      ;(Object.keys(d) as PhaseKey[]).forEach(ph=>{
        const actual = d[ph]
        const target = t[ph]||0
        if(target===0 && actual===0) return
        acc[ph].sumA += actual
        acc[ph].sumT += target
        acc[ph].n += 1
        if(actual <= target) acc[ph].on += 1

        // Per leader overrun (only for functional phases)
        const over = Math.max(0, actual - target)
        let key: string | null = null
        if(ph==='technical' && it.functionalOwnerIds?.technical) key = (byId[it.functionalOwnerIds.technical]||'') + ' (Tech)'
        if(ph==='procurement' && it.functionalOwnerIds?.procurement) key = (byId[it.functionalOwnerIds.procurement]||'') + ' (Proc)'
        if(ph==='strategic_ops'){
          const keys = []
          if(it.functionalOwnerIds?.operations) keys.push((byId[it.functionalOwnerIds.operations]||'') + ' (Ops)')
          if(it.functionalOwnerIds?.strategic) keys.push((byId[it.functionalOwnerIds.strategic]||'') + ' (Strat)')
          for(const k of keys){
            leaders[k] = leaders[k] || {sumOver:0,nLate:0}
            if(over>0){ leaders[k].sumOver += over; leaders[k].nLate += 1 }
          }
          key = null
        } else if(key){
          leaders[key] = leaders[key] || {sumOver:0,nLate:0}
          if(over>0){ leaders[key].sumOver += over; leaders[key].nLate += 1 }
        }
      })
    }

    const bars = (['internal','technical','procurement','strategic_ops','offer'] as PhaseKey[]).map(ph=>{
      const a = acc[ph]
      return { phase: ph==='strategic_ops'?'Strategic & Ops': ph[0].toUpperCase()+ph.slice(1), target: a.n? a.sumT/a.n : 0, actual: a.n? a.sumA/a.n : 0 }
    })

    const onTime = (['internal','technical','procurement','strategic_ops','offer'] as PhaseKey[]).map(ph=>{
      const a = acc[ph]
      return { phase: ph==='strategic_ops'?'Strategic & Ops': ph[0].toUpperCase()+ph.slice(1), onTimePct: a.n? (a.on/a.n*100) : 0 }
    })

    const bottlenecks = Object.entries(leaders).map(([name,v])=>({ name, overrun: v.nLate? v.sumOver/v.nLate : 0 })).sort((a,b)=> b.overrun - a.overrun).slice(0,10)

    return { bars, onTime, bottlenecks }
  },[live,sent,gantt,byId])

  const slaBars = slaAgg.bars
  const slaOnTime = slaAgg.onTime
  const bottlenecks = slaAgg.bottlenecks

  function exportOffersCSV(){
    const rows = [...live.filter(i=>i.status==='done'), ...sent].map(it=>({ code:it.code, title:it.title, customer:it.customer, sales:salesById[it.requesterId||''], createdAt:it.createdAt, doneAt:(it.statusHistory.find(s=>s.status==='done')?.at||''), valueOffered:it.valueOffered, deliveryMonths:it.deliveryTimeMonths }))
    const csv = toCSV(rows, ['code','title','customer','sales','createdAt','doneAt','valueOffered','deliveryMonths'])
    download('offers_sent.csv', csv)
  }
  function exportWinsCSV(){
    const rows = [...won, ...live.filter(i=>i.state==='won')].map(it=>({ code:it.code, title:it.title, customer:it.customer, poDate:it.poDate, value:it.contractValue, region:it.region, product:it.productFamily }))
    const csv = toCSV(rows, ['code','title','customer','poDate','value','region','product'])
    download('order_intake.csv', csv)
  }
  function printPDF(){ window.print() }

  function toggleYear(y:number){
    setYearsSel(prev=>{
      const cur = prev? [...prev] : yearsToPlot.slice()
      const i = cur.indexOf(y)
      if(i>=0){ cur.splice(i,1) } else { cur.push(y) }
      return cur.sort((a,b)=>a-b)
    })
  }

  // ---------- Custom dashboards ----------
  function addWidget(){
    const w:Widget = { id:Math.random().toString(36).slice(2,9), title:'New Widget', type:'offers_time', w:1, h:320, dim:'product' }
    setCustom(c=>[...c, w])
  }
  function updateWidget(id:string, patch:Partial<Widget>){
    setCustom(c=>c.map(x=> x.id===id? {...x, ...patch} : x))
  }
  function removeWidget(id:string){
    setCustom(c=>c.filter(x=>x.id!==id))
  }
  function moveWidget(id:string, dir:-1|1){
    setCustom(c=>{
      const idx = c.findIndex(x=>x.id===id); if(idx<0) return c
      const j = idx + dir; if(j<0||j>=c.length) return c
      const next = c.slice(); const [it]=next.splice(idx,1); next.splice(j,0,it); return next
    })
  }

  function renderChartByType(t:WidgetType){
    if(t==='offers_time'){
      return (<ResponsiveContainer><LineChart data={offersSeries}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledCount(n, scaleCount)} allowDecimals={false}/><Tooltip formatter={(v)=>[fmtScaledCount(v, scaleCount),'Offers']}/><Legend/><Line type="monotone" dataKey="offers" dot={false}/></LineChart></ResponsiveContainer>)
    }
    if(t==='intake_time'){
      return (<ResponsiveContainer><LineChart data={winsSeries}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v)=>[fmtScaledEUR(v, scaleValue),'Order Intake']}/><Legend/><Line type="monotone" dataKey="orderIntake" dot={false}/></LineChart></ResponsiveContainer>)
    }
    if(t==='workload'){
      return (<ResponsiveContainer><BarChart data={workload}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledCount(n, scaleCount)}/><Tooltip formatter={(v)=>[fmtScaledCount(v, scaleCount),'Hours']}/><Legend/><Bar dataKey="hours">{workload.map((d:any,i:number)=>(<Cell key={d.name} fill={PALETTE.bars[i%PALETTE.bars.length]} />))}</Bar></BarChart></ResponsiveContainer>)
    }
    if(t==='outcome'){
      return (<ResponsiveContainer><BarChart data={outcome}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="k" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tickFormatter={(n)=>fmtScaledCount(n, scaleCount)}/><Tooltip formatter={(v)=>[fmtScaledCount(v, scaleCount),'Count']}/><Legend/><Bar dataKey="v">{outcome.map((d:any,i:number)=>(<Cell key={d.k} fill={PALETTE.outcome[d.k]||PALETTE.bars[i%PALETTE.bars.length]} />))}</Bar></BarChart></ResponsiveContainer>)
    }
    if(t==='won_by_dim'){
      return (<ResponsiveContainer><BarChart data={dimWon}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v)=>[fmtScaledEUR(v, scaleValue),'Value']}/><Legend/><Bar dataKey="value">{dimWon.map((d:any,i:number)=>(<Cell key={d.name} fill={PALETTE.bars[i%PALETTE.bars.length]} />))}</Bar></BarChart></ResponsiveContainer>)
    }
    if(t==='prog_offers'){
      return (<ResponsiveContainer><LineChart data={overlayOffers}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="idx" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tickFormatter={(n)=>fmtScaledCount(n, scaleCount)}/><Tooltip formatter={(v,n)=>[fmtScaledCount(v, scaleCount), String(n)]}/><Legend/>{yearsToPlot.map(y=> <Line key={y} type="monotone" dataKey={String(y)} dot={false}/>)}</LineChart></ResponsiveContainer>)
    }
    if(t==='prog_offers_val'){
      return (<ResponsiveContainer><LineChart data={overlayOffersVal}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="idx" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v,n)=>[fmtScaledEUR(v, scaleValue), String(n)]}/><Legend/>{yearsToPlot.map(y=> <Line key={y} type="monotone" dataKey={String(y)} dot={false}/>)}</LineChart></ResponsiveContainer>)
    }
    if(t==='prog_intake'){
      return (<ResponsiveContainer><LineChart data={overlayIntake}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="idx" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v,n)=>[fmtScaledEUR(v, scaleValue), String(n)]}/><Legend/>{yearsToPlot.map(y=> <Line key={y} type="monotone" dataKey={String(y)} dot={false}/>)}</LineChart></ResponsiveContainer>)
    }
    return null
  }

  return (<div className={compact?'compact':''}>
    

    <div className="kpi">
      <div className="k"><div className="meta">Live</div><div className="n">{nf.format(live.length)}</div></div>
      <div className="k"><div className="meta">Sent (7d archived)</div><div className="n">{nf.format(sent.length)}</div></div>
      <div className="k"><div className="meta">Won</div><div className="n">{nf.format(won.length)}</div></div>
      <div className="k"><div className="meta">Lost</div><div className="n">{nf.format(lost.length)}</div></div>
    </div>

    {series.offers && (<div className="card" style={{marginTop:12}}>
      <div className="title">Offers Sent over Time</div>
      <div style={{width:'100%', height:280}}>
        <ResponsiveContainer><LineChart data={offersSeries}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledCount(n, scaleCount)} allowDecimals={false}/><Tooltip formatter={(v)=>[fmtScaledCount(v, scaleCount),'Offers']}/><Legend/><Line type="monotone" dataKey="offers" dot={false}/></LineChart></ResponsiveContainer>
      </div>
    </div>)}

    {series.wins && (<div className="card" style={{marginTop:12}}>
      <div className="title">Order Intake (Value) over Time</div>
      <div style={{width:'100%', height:280}}>
        <ResponsiveContainer><LineChart data={winsSeries}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v)=>[fmtScaledEUR(v, scaleValue),'Order Intake']}/><Legend/><Line type="monotone" dataKey="orderIntake" dot={false}/></LineChart></ResponsiveContainer>
      </div>
    </div>)}

    {series.workload && (<div className="card" style={{marginTop:12}}>
      <div className="title">Workload by Team Member (hours, based on L2)</div>
      <div style={{width:'100%', height:320}}>
        <ResponsiveContainer><BarChart data={workload}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledCount(n, scaleCount)}/><Tooltip formatter={(v)=>[fmtScaledCount(v, scaleCount),'Hours']}/><Legend/><Bar dataKey="hours">{workload.map((d:any,i:number)=>(<Cell key={d.name} fill={PALETTE.bars[i%PALETTE.bars.length]} />))}</Bar></BarChart></ResponsiveContainer>
      </div>
    </div>)}

    <div className="card" style={{marginTop:12}}>
      <div className="title">Outcome Snapshot</div>
      <div style={{width:'100%', height:280}}>
        <ResponsiveContainer><BarChart data={outcome}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="k" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tickFormatter={(n)=>fmtScaledCount(n, scaleCount)}/><Tooltip formatter={(v)=>[fmtScaledCount(v, scaleCount),'Count']}/><Legend/><Bar dataKey="v">{outcome.map((d:any,i:number)=>(<Cell key={d.k} fill={PALETTE.outcome[d.k]||PALETTE.bars[i%PALETTE.bars.length]} />))}</Bar></BarChart></ResponsiveContainer>
      </div>
    </div>

    <div className="card" style={{marginTop:12}}>
      <div className="title">Order Intake by {dimLocal==='product'?'Product Family': dimLocal==='region'?'Region': dimLocal==='assignee'?'Assignee':'Sales'}</div>
      <div className="controls" style={{margin:'6px 0'}}>
        <select className="select" value={dimLocal} onChange={e=>setDimLocal(e.target.value as any)}>
          <option value="product">Product Family</option>
          <option value="region">Region</option>
          <option value="assignee">Assignee</option>
          <option value="sales">Sales</option>
        </select>
      </div>
      <div style={{width:'100%', height:320}}>
        <ResponsiveContainer><BarChart data={dimWon}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v)=>[fmtScaledEUR(v, scaleValue),'Value']}/><Legend/><Bar dataKey="value">{dimWon.map((d:any,i:number)=>(<Cell key={d.name} fill={PALETTE.bars[i%PALETTE.bars.length]} />))}</Bar></BarChart></ResponsiveContainer>
      </div>
    </div>

    {/* Comparative controls */}
    <div className="card" style={{marginTop:12}}>
      <div className="title">Comparative & Progressive (YoY)</div>
      <div className="controls" style={{marginTop:8}}>
        <label className="meta">Granularity:
          <select className="select" value={progGran} onChange={e=>setProgGran(e.target.value as ProgGran)}>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        <div className="chips" style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {yearsAvailable.map(y=> (<label key={y} className="chip"><input type="checkbox" checked={yearsToPlot.includes(y)} onChange={()=>toggleYear(y)}/> {y}</label>))}
        </div>
        <div className="meta">Tip: compare WK30 this year vs WK30 of previous years by selecting <b>Week</b> and the years of interest.</div>
      </div>

      <div className="title" style={{marginTop:8, fontSize:14}}>Progressive Offers Count</div>
      <div style={{width:'100%', height:280}}>
        <ResponsiveContainer><LineChart data={overlayOffers}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="idx" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tickFormatter={(n)=>fmtScaledCount(n, scaleCount)}/><Tooltip formatter={(v, n)=>[fmtScaledCount(v, scaleCount), String(n)]}/><Legend/>{yearsToPlot.map(y=> <Line key={y} type="monotone" dataKey={String(y)} dot={false} />)}</LineChart></ResponsiveContainer>
      </div>

      <div className="title" style={{marginTop:12, fontSize:14}}>Progressive Offers Value (Rev 0)</div>
      <div style={{width:'100%', height:280}}>
        <ResponsiveContainer><LineChart data={overlayOffersVal}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="idx" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v, n)=>[fmtScaledEUR(v, scaleValue), String(n)]}/><Legend/>{yearsToPlot.map(y=> <Line key={y} type="monotone" dataKey={String(y)} dot={false} />)}</LineChart></ResponsiveContainer>
      </div>

      <div className="title" style={{marginTop:12, fontSize:14}}>Progressive Order Intake</div>
      <div style={{width:'100%', height:280}}>
        <ResponsiveContainer><LineChart data={overlayIntake}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="idx" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(n)=>fmtScaledEUR(n, scaleValue)}/><Tooltip formatter={(v, n)=>[fmtScaledEUR(v, scaleValue), String(n)]}/><Legend/>{yearsToPlot.map(y=> <Line key={y} type="monotone" dataKey={String(y)} dot={false} />)}</LineChart></ResponsiveContainer>
      </div>
    </div>
    {/* SLA & Bottlenecks */}
    <div className="card" style={{marginTop:12}}>
      <div className="title">SLA & Bottlenecks (Actual vs Target by Phase)</div>
      <div className="controls" style={{marginTop:8}}>
        <div className="meta">Targets taken from Gantt presets (L1+L2). If URS present, extra days are added to Technical Review target.</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{height:300}}>
          <ResponsiveContainer>
            <BarChart data={slaBars}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="phase" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(n)=>nf.format(Number(n))} />
              <Tooltip formatter={(v)=>[nf.format(Number(v)),'Days']}/>
              <Legend/>
              <Bar dataKey="target" fill={PALETTE.target} />
              <Bar dataKey="actual" fill={PALETTE.actual} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{height:300}}>
          <ResponsiveContainer>
            <BarChart data={slaOnTime}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="phase" tick={{ fontSize: 11 }} />
              <YAxis domain={[0,100]} tickFormatter={(n)=>nf.format(Number(n))+'%'} />
              <Tooltip formatter={(v)=>[nf.format(Number(v))+'%','On-time']}/>
              <Legend/>
              <Bar dataKey="onTimePct">{slaOnTime.map((d:any)=>(<Cell key={d.phase} fill={PALETTE.ontimeByPhase[(d.phaseKey||d.phase||"internal").toLowerCase().replace(" & ","_").replace(" ","_")]||PALETTE.line}/>))}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="title" style={{marginTop:8, fontSize:14}}>Top Bottlenecks (avg overrun, days)</div>
      <div style={{height:260}}>
        <ResponsiveContainer>
          <BarChart data={bottlenecks}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(n)=>nf.format(Number(n))} />
            <Tooltip formatter={(v)=>[nf.format(Number(v)),'Avg overrun (days)']}/>
            <Legend/>
            <Bar dataKey="overrun">{bottlenecks.map((d:any,i:number)=>(<Cell key={d.name} fill={PALETTE.bars[i%PALETTE.bars.length]} />))}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>


    {/* Customizable Dashboard Section */}
    <div className="card" style={{marginTop:12}}>
      <div className="title">Custom Dashboards</div>
      <div className="controls" style={{marginTop:8}}>
        <button className="btn-sm" onClick={addWidget}>Add widget</button>
      </div>

      <div className="dash-grid">
        {custom.map((w)=> (<div key={w.id} className="widget" style={{gridColumn:`span ${w.w*6}`, height:w.h}} draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', w.id) }} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ const id=e.dataTransfer.getData('text/plain'); if(!id||id===w.id)return; setCustom(list=>{ const idx=list.findIndex(x=>x.id===id); const to=list.findIndex(x=>x.id===w.id); if(idx<0||to<0) return list; const next=list.slice(); const [it]=next.splice(idx,1); next.splice(to,0,it); return next }) }}>
          <div className="head">
            <div className="handle">↕ {w.title}</div>
            <div className="controls">
              <input className="select" style={{width:140}} value={w.title} onChange={e=>updateWidget(w.id,{title:e.target.value})}/>
              <select className="select" value={w.type} onChange={e=>updateWidget(w.id,{type:e.target.value as any})}>
                <option value="offers_time">Offers over Time</option>
                <option value="intake_time">Intake over Time</option>
                <option value="workload">Workload</option>
                <option value="outcome">Outcome</option>
                <option value="won_by_dim">Won by Dimension</option>
                <option value="prog_offers">Progressive Offers</option>
                <option value="prog_offers_val">Progressive Offers Value (Rev0)</option>
                <option value="prog_intake">Progressive Order Intake</option>
              </select>
              {w.type==='won_by_dim' && (
                <select className="select" value={w.dim||'product'} onChange={e=>updateWidget(w.id,{dim:e.target.value as any})}>
                  <option value="product">Product</option>
                  <option value="region">Region</option>
                  <option value="assignee">Assignee</option>
                  <option value="sales">Sales</option>
                </select>
              )}
              <select className="select" value={String(w.w)} onChange={e=>updateWidget(w.id,{w:Number(e.target.value) as any})}>
                <option value="1">Width 1/2</option><option value="2">Width Full</option>
              </select>
              <select className="select" value={String(w.h)} onChange={e=>updateWidget(w.id,{h:Number(e.target.value) as any})}>
                <option value="240">H 240</option><option value="320">H 320</option><option value="420">H 420</option>
              </select>
              <button className="btn-sm" onClick={()=>moveWidget(w.id,-1)}>↑</button>
              <button className="btn-sm" onClick={()=>moveWidget(w.id,1)}>↓</button>
              <button className="btn-sm btn-del" onClick={()=>removeWidget(w.id)}>Remove</button>
            </div>
          </div>
          <div style={{width:'100%', height: w.h - 48}}>
            {renderChartByType(w.type)}
          </div>
        </div>))}
      </div>
    <div className="card">
      <div className="title">Dashboard Controls</div>
      <div className="controls" style={{marginTop:8}}>
        <select className="select" value={gran} onChange={e=>setGran(e.target.value as Gran)}>
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
        </select>
        <label className="meta"><input type="checkbox" checked={series.offers} onChange={e=>setSeries(s=>({...s,offers:e.target.checked}))}/> Offers</label>
        <label className="meta"><input type="checkbox" checked={series.wins} onChange={e=>setSeries(s=>({...s,wins:e.target.checked}))}/> Order Intake</label>
        <label className="meta"><input type="checkbox" checked={series.workload} onChange={e=>setSeries(s=>({...s,workload:e.target.checked}))}/> Workload</label>

        <div className="chips" style={{display:'flex',gap:6,alignItems:'center'}}>
          <span className="meta">Scale (Counts)</span>
          <select className="select" value={String(scaleCount)} onChange={e=>setScaleCount(Number(e.target.value))}>
            <option value="1">x1</option><option value="1000">/1k</option><option value="1000000">/1M</option>
          </select>
          <span className="meta">Scale (Values)</span>
          <select className="select" value={String(scaleValue)} onChange={e=>setScaleValue(Number(e.target.value))}>
            <option value="1">x1</option><option value="1000">/1k</option><option value="1000000">/1M</option>
          </select>
        </div>

        <div style={{flex:1}}></div>
        <button className="btn-sm" onClick={()=>{const w=window.open('','_blank'); if(w){w.document.write('<html><head><title>Print</title></head><body>'+document.querySelector('.container')!.innerHTML+'</body></html>'); w.document.close(); w.focus(); w.print();}}}>Export to PDF</button>
        <button className="btn-sm" onClick={()=>setCompact(c=>!c)}>{compact?'Normal density':'Compact mode'}</button>
      </div>
    </div>
</div>
  </div>)
}