
import React, { useMemo, useState } from 'react'
import type { Opportunity, Archives, Member, Sales } from '../lib/types'
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from 'recharts'

type Scope = 'won'|'sent'|'board'|'all'
type Dimension = 'region'|'product'|'sales'|'assignee'
type Metric = 'count'|'offers_value'|'po_value'

const PIE_COLORS = ['#0055A5','#00A3AD','#7FB3D5','#00A651','#F5A623','#8E44AD','#7DCEA0','#5DADE2','#566573','#B3B6B7']

function nfEUR(v:number){
  try{
    return new Intl.NumberFormat(undefined,{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v||0)
  }catch{ return String(v) }
}

export default function InsightsPie({
  items, archives, membersById, salesById
}:{
  items: Opportunity[]; archives: Archives;
  membersById: Record<string, Member>; salesById: Record<string, Sales>;
}){
  const [scope,setScope] = useState<Scope>('won')
  const [dimension,setDimension] = useState<Dimension>('product')
  const [metric,setMetric] = useState<Metric>('count')

  const pool = useMemo(()=>{
    if(scope==='board') return items
    if(scope==='won') return archives.won
    if(scope==='sent') return archives.sent
    return [...items, ...archives.sent, ...archives.won, ...archives.lost]
  },[scope, items, archives])

  const series = useMemo(()=>{
    const m = new Map<string, number>()
    for(const it of pool){
      let key: string = '—'
      if(dimension==='region') key = it.region || '—'
      if(dimension==='product') key = it.productFamily || '—'
      if(dimension==='sales') key = salesById[(it.requesterId||'')]?.name || '—'
      if(dimension==='assignee') key = membersById[(it.assigneeId||'')]?.name || '—'
      let inc = 1
      if(metric==='offers_value'){
        // Count only revision 0 (undefined treated as 0)
        const rev = Number((it as any).revision ?? 0);
        if(rev!==0) { continue }
        inc = it.valueOffered || 0
      } else if(metric==='po_value'){
        // PO / Contract value (won opportunities)
        inc = it.contractValue || 0
      }
      m.set(key, (m.get(key)||0) + inc)
    }
    const arr = Array.from(m.entries()).map(([name,value])=>({ name, value }))
    const total = arr.reduce((a,b)=>a+(Number(b.value)||0), 0) || 1
    return arr
      .sort((a,b)=> (Number(b.value)||0) - (Number(a.value)||0))
      .map(r=> ({ ...r, pct: Math.round((Number(r.value)||0)/total*100) }))
  },[pool, dimension, metric, salesById, membersById])

  const tooltipFmt = (v:any)=> metric==='count' ? String(v) : nfEUR(Number(v)||0)

  return (
    <div className="card" style={{fontSize:13}}>
      <div className="title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Distribution (count & %)</span>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select className="select" value={scope} onChange={e=>setScope(e.target.value as Scope)}>
            <option value="won">Won</option>
            <option value="sent">Sent (archived offers)</option>
            <option value="board">Board (open)</option>
            <option value="all">All</option>
          </select>
          <select className="select" value={dimension} onChange={e=>setDimension(e.target.value as Dimension)}>
            <option value="product">Product family</option>
            <option value="region">Region</option>
            <option value="sales">Sales</option>
            <option value="assignee">Assignee</option>
          </select>
          <select className="select" value={metric} onChange={e=>setMetric(e.target.value as Metric)}>
            <option value="count">Count</option>
            <option value="offers_value">Offers value</option>
            <option value="po_value">Order Intake value (PO)</option>
          </select>
        </div>
      </div>

      <div style={{marginTop:8}}>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie dataKey="value" data={series} labelLine={false} label={(p:any)=> metric==='count'
              ? `${p.name} ${p.value} (${p.pct}%)`
              : `${p.name} ${tooltipFmt(p.value)} (${p.pct}%)`}>
              {series.map((_,i:number)=>(<Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>))}
            </Pie>
            <Tooltip formatter={(v:any, _:any, p:any)=>[tooltipFmt(v), p && p.payload ? p.payload.name : '']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
