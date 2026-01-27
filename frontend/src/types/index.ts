// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'staff' | 'client';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

// Lookup types
export interface Cause {
  id: string;
  name: string;
  is_active: boolean;
}

export interface ApplicantType {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Province {
  id: string;
  code: string;
  name: string;
  country_code: string;
  is_active: boolean;
}

export interface EligibilityFlag {
  id: string;
  name: string;
  is_active: boolean;
}

// Grant types
export type GrantStatus = 'open' | 'closed' | 'unknown';
export type DeadlineType = 'fixed' | 'rolling' | 'multiple';

export interface Grant {
  id: string;
  name: string;
  funder: string | null;
  description: string | null;
  source_url: string | null;
  notes: string | null;
  status: GrantStatus;
  deadline_type: DeadlineType;
  deadline_at: string | null;
  next_deadline_at: string | null;
  last_verified_at: string | null;
  amount_min: number | null;
  amount_max: number | null;
  currency: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  causes: Cause[];
  applicant_types: ApplicantType[];
  provinces: Province[];
  eligibility_flags: EligibilityFlag[];
}

export interface GrantCreate {
  name: string;
  funder?: string;
  description?: string;
  source_url?: string;
  notes?: string;
  status?: GrantStatus;
  deadline_type?: DeadlineType;
  deadline_at?: string;
  next_deadline_at?: string;
  amount_min?: number;
  amount_max?: number;
  currency?: string;
  cause_ids?: string[];
  applicant_type_ids?: string[];
  province_ids?: string[];
  eligibility_flag_ids?: string[];
}

// Client types
export interface Client {
  id: string;
  name: string;
  entity_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  causes: Cause[];
  applicant_types: ApplicantType[];
  provinces: Province[];
  eligibility_flags: EligibilityFlag[];
  // Subscription fields
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  subscription_price_id: string | null;
  current_period_end: string | null;
  grant_db_access: boolean;
}

export interface ClientCreate {
  name: string;
  entity_type?: string;
  notes?: string;
  cause_ids?: string[];
  applicant_type_ids?: string[];
  province_ids?: string[];
  eligibility_flag_ids?: string[];
}

export interface ClientUser {
  user_id: string;
  client_id: string;
  client_role: string | null;
  email: string;
  name: string | null;
  is_active: boolean;
}

// Match types
export type MatchStatus = 'new' | 'qualified' | 'rejected' | 'converted';

export interface Match {
  id: string;
  client_id: string;
  grant_id: string;
  fit_score: number;
  fit_level: string | null;
  reasons: Record<string, unknown> | null;
  notes: string | null;
  status: MatchStatus;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
  grant?: Grant;
}

export interface MatchGenerate {
  grant: Grant;
  fit_score: number;
  fit_level: string;
  reasons: Record<string, unknown>;
}

// Application types
export type ApplicationStage = 'draft' | 'in_progress' | 'submitted' | 'awarded' | 'declined' | 'reporting' | 'closed';
export type EventType = 'status_change' | 'note' | 'doc_request' | 'submission' | 'decision';

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: EventType;
  from_stage: string | null;
  to_stage: string | null;
  note: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  client_id: string;
  grant_id: string;
  match_id: string | null;
  stage: ApplicationStage;
  internal_deadline_at: string | null;
  submitted_at: string | null;
  decision_at: string | null;
  amount_requested: number | null;
  amount_awarded: number | null;
  assigned_to_user_id: string | null;
  cycle_year: number | null;
  round_label: string | null;
  created_at: string;
  updated_at: string;
  grant?: Grant;
  client?: Client;
  events: ApplicationEvent[];
}

export interface ApplicationCreate {
  client_id: string;
  grant_id: string;
  match_id?: string;
  stage?: ApplicationStage;
  internal_deadline_at?: string;
  amount_requested?: number;
  assigned_to_user_id?: string;
}

// Message types
export interface Message {
  id: string;
  client_id: string;
  application_id: string | null;
  channel: 'email' | 'portal';
  subject: string | null;
  body: string | null;
  sent_to: string | null;
  sent_at: string | null;
  created_at: string;
}

// Invite types
export interface ClientInvite {
  id: string;
  email: string;
  name: string | null;
  client_id: string;
  client_role: string | null;
  token: string;
  expires_at: string;
  created_at: string;
  is_expired: boolean;
}

export interface InviteInfo {
  email: string;
  name: string | null;
  client_name: string;
  is_expired: boolean;
  is_valid: boolean;
}

// Subscription types
export interface SubscriptionStatus {
  has_access: boolean;
  status: string | null;
  current_period_end: string | null;
  is_manual_override: boolean;
  stripe_customer_id: string | null;
}

export interface PriceInfo {
  price_id: string;
  amount: number;
  currency: string;
  interval: string | null;
}

export interface Prices {
  monthly: PriceInfo | null;
  annual: PriceInfo | null;
}

export interface CheckoutResponse {
  session_id: string;
  checkout_url: string;
}

export interface BillingPortalResponse {
  portal_url: string;
}
