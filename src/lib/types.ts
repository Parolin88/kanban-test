export type Status =
  | "to_do"
  | "on_going"
  | "done"
  | "in_charge_technical"
  | "in_charge_procurement";

export type StatusOrNew = Status | "new_opportunities";

export interface Opportunity {
  id: string;
  name: string;
  customer: string;
  amount: number;
  salesId?: string;
}

export interface Archives {
  sent: Opportunity[];
  won: Opportunity[];
  lost: Opportunity[];
  deleted: Opportunity[];
}
