// src/lib/types.ts

// Kanban status values used across the app (board + support lanes)
export type Status =
  | 'new_opportunities'
  | 'to_do'
  | 'on_going'
  | 'in_charge_technical'
  | 'in_charge_procurement'
  | 'in_charge_operations'
  | 'in_charge_strategic'
  | 'done';

// Narrower union used in some places for archive filters / searches
export type ArchiveTab = 'all' | 'sent' | 'won' | 'lost' | 'deleted';

export interface Member {
  id: string;
  name: string;
  email: string;
  specialties?: string[];
}

export interface Sales {
  id: string;
  name: string;
  email: string;
}

export interface FunctionalOwnerIds {
  technical?: string;
  procurement?: string;
  operations?: string;
  strategic?: string;
}

export interface StatusRecord {
  status: Status;
  at: string; // ISO date
}

export interface Opportunity {
  id: string;
  title: string;
  description?: string;

  // basic meta
  customer?: string;
  code?: string;
  region?: string;

  // relations
  requesterId?: string;   // sales requester
  assigneeId?: string;    // current owner on board
  salesId?: string;       // optional link to Sales

  // lifecycle
  createdAt: string;      // ISO date
  status: Status;
  statusHistory: StatusRecord[];

  // classification
  firstLevel?: string;    // L1
  secondLevel?: string;   // L2
  productFamily?: string;
  intercompany?: boolean;
  keyAccount?: boolean;

  // functional ownership / completion
  functionalOwnerIds?: FunctionalOwnerIds;
  functionalDone: Record<string, boolean>;

  // planning / due dates
  clientRequestedDueAt?: string; // ISO
  plannedDueAt?: string;         // ISO
  dueAt?: string;                // ISO (used in some cards)
  poDate?: string;               // Purchase order date (won)

  // state flags
  state?: 'open' | 'waiting_customer' | 'waiting_sales' | 'won' | 'lost';

  // economics
  valueOffered?: number;
  contractValue?: number;
  deliveryTimeMonths?: number;

  // extra parameters
  revision?: number;
  rush?: boolean;
  urs?: boolean;
  ursExtraDays?: number;

  // archive info
  archivedAt?: string;      // when moved to archive
  lostReason?: string;
  deletedReason?: string;
}

export interface AuditEvent {
  id: string;
  at: string; // ISO
  type: 'created' | 'status_change' | 'deleted';
  opp: string;
  from?: string;
  to?: string;
  by?: string;
  note?: string;
}

export interface Archives {
  sent: Opportunity[];
  won: Opportunity[];
  lost: Opportunity[];
  deleted: Opportunity[];
}
