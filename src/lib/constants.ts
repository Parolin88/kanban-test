export const COLS = [
  { k: 'new_opportunities', label: 'New Opportunities' },
  { k: 'to_do', label: 'To Do' },
  { k: 'on_going', label: 'On Going (analysis)' },
  { k: 'done', label: 'Done / Sent' },
  { k: 'in_charge_technical', label: 'In charge of Technical Department', support:true },
  { k: 'in_charge_procurement', label: 'In charge of Procurement', support:true },
  { k: 'in_charge_operations', label: 'In charge of Operations', support:true },
  { k: 'in_charge_strategic', label: 'In charge of Strategic Planning', support:true },
] as const

export const L1 = ['Budget','Hot','Binding'] as const
export const L2 = ['Standard','CTO','ETO','Custom'] as const
export const PRODUCT_FAMILIES = ['Glass Converting','Sterile','Vision Inspection','Assembly & Packaging'] as const

export type Status = typeof COLS[number]['k']
export type FirstLevel = typeof L1[number]
export type SecondLevel = typeof L2[number]
export type ProductFamily = typeof PRODUCT_FAMILIES[number]

export type PhaseKey = 'internal'|'technical'|'procurement'|'strategic_ops'|'offer'

export const STATUS_TO_PHASE: Partial<Record<Status, PhaseKey>> = {
  on_going: 'internal',
  in_charge_technical: 'technical',
  in_charge_procurement: 'procurement',
  in_charge_operations: 'strategic_ops',
  in_charge_strategic: 'strategic_ops',
  done: 'offer',
}

export const DEFAULT_GANTT: Record<FirstLevel, Record<SecondLevel, Record<PhaseKey, number>>> = {
  Budget:   { Standard:{internal:2, technical:0, procurement:0, strategic_ops:0, offer:1},
              CTO:{internal:2, technical:1, procurement:0, strategic_ops:0, offer:1},
              ETO:{internal:2, technical:2, procurement:1, strategic_ops:0, offer:1},
              Custom:{internal:2, technical:1, procurement:0, strategic_ops:0, offer:1} },
  Hot:      { Standard:{internal:1, technical:1, procurement:0, strategic_ops:0, offer:1},
              CTO:{internal:1, technical:2, procurement:1, strategic_ops:1, offer:1},
              ETO:{internal:1, technical:3, procurement:2, strategic_ops:2, offer:1},
              Custom:{internal:1, technical:2, procurement:1, strategic_ops:1, offer:1} },
  Binding:  { Standard:{internal:2, technical:2, procurement:1, strategic_ops:1, offer:2},
              CTO:{internal:3, technical:4, procurement:2, strategic_ops:2, offer:2},
              ETO:{internal:4, technical:5, procurement:3, strategic_ops:3, offer:3},
              Custom:{internal:3, technical:3, procurement:1, strategic_ops:2, offer:2} },
}

export const DEFAULT_L2_HOURS: Record<SecondLevel, number> = {
  Standard: 16, CTO: 24, ETO: 40, Custom: 32,
}
