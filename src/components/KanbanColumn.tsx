import React from 'react'
export default function KanbanColumn({ title, children, support, onDrop }:{ title:string; children:React.ReactNode; support?:boolean; onDrop?:()=>void }){
  return (<div className={`column ${support?'support':''}`}
              onDragOver={(e)=>{ if(onDrop){ e.preventDefault(); e.dataTransfer.dropEffect='move' } }}
              onDrop={(e)=>{ e.preventDefault(); onDrop && onDrop() }}>
    <div className="head"><div>{title}</div><span className="badge">{React.Children.toArray(children).length}</span></div>
    <div className="body" style={{padding:'8px', display:'grid', gap:8}}>{children}</div>
  </div>)
}
