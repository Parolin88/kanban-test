import type { FirstLevel, SecondLevel, Status, PhaseKey, ProductFamily } from './constants'
export type Member = { id:string; name:string; email?:string; specialties?: ProductFamily[] }
export type Sales = { id:string; name:string; email?:string }
export type Stamp = { status: Status; at: string }
export type FunctionalOwnerIds = Partial<Record<'technical'|'procurement'|'operations'|'strategic', string>>
export type FunctionalDone = Partial<Record<'technical'|'procurement'|'operations'|'strategic', boolean>>
export type OpportunityState = 'open'|'standby'|'waiting_customer'|'waiting_sales'|'lost'|'won'
export type LostReason = 'price'|'technology'|'lead_time'|'other'
export type DeletedReason = 'price'|'technology'|'lead_time'|'other'
export type WonReason = 'price'|'technology'|'lead_time'|'relationship'|'other'
export type Opportunity = {
  id: string; code?: string; title: string; customer?: string; requesterId?: string; region?: 'EMEA'|'AMER'|'APAC';
  description?: string; intercompany?: boolean;
  firstLevel?: FirstLevel; secondLevel?: SecondLevel; productFamily?: ProductFamily; keyAccount?: boolean;
  assigneeId?: string; salesId?: string; functionalOwnerIds?: FunctionalOwnerIds; functionalDone?: FunctionalDone;
  createdAt: string; dueAt?: string; plannedDueAt?: string; clientRequestedDueAt?: string; urs?: boolean; ursExtraDays?: number;
  status: Status; statusHistory: Stamp[]; revision?: number; rush?: boolean;
  state?: OpportunityState; lostReason?: LostReason; wonReason?: WonReason; poDate?: string; contractValue?: number;
  valueOffered?: number; deliveryTimeMonths?: number;
  archivedAt?: string;
  deletedReason?: DeletedReason;
}
export type Archives = { sent: Opportunity[]; won: Opportunity[]; lost: Opportunity[]; deleted: Opportunity[] }

export type AuditEvent = {
  id: string;
  at: string;
  type: 'created'|'deleted'|'status_change';
  opp?: string;
  from?: string;
  to?: string;
  by?: string;
  note?: string;
}
