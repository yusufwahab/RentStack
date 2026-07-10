-- =============================================================
-- RentStack — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- on a fresh project. Assumes Supabase Auth is enabled (it is by
-- default) — `landlords.id` is a 1:1 extension of `auth.users`.
-- =============================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------
-- landlords — one row per registered landlord, keyed to auth.users
-- ---------------------------------------------------------------
create table if not exists landlords (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  property_name text,
  property_address text,
  rent_per_unit numeric(12, 2) default 85000,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- properties — a landlord can own more than one. `landlords.property_name`/
-- `property_address` predate this table and are kept (harmless, just no
-- longer authoritative) — every landlord gets at least one properties row,
-- lazily created from those columns if they never explicitly added one.
-- ---------------------------------------------------------------
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references landlords (id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_properties_landlord on properties (landlord_id);

-- ---------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references landlords (id) on delete cascade,
  property_id uuid references properties (id) on delete set null,
  name text not null,
  unit text not null,
  email text,
  phone text,
  rent_amount numeric(12, 2) not null,
  move_in_date date not null,
  move_out_date date,
  status text not null default 'UNPAID'
    check (status in ('PAID', 'PARTIAL', 'UNPAID', 'OVERPAID', 'DISPUTED', 'CLOSED')),
  kyc_tier text check (kyc_tier in ('Tier 1', 'Tier 2', 'Tier 3')),

  -- Running overpayment credit, carried forward and netted against
  -- future cycles' rent due — see reconciliationService.js /
  -- utils/cycles.js classifyCycle for how this is consumed/replenished.
  credit_balance numeric(12, 2) not null default 0,

  -- Basic lease/billing extras — informational only. lease_end_date powers
  -- the renewal reminder job; service_charge is billed alongside rent but
  -- NOT folded into the reconciliation engine's due/credit math (a tenant's
  -- virtual-account payment is still matched against rent_amount alone —
  -- service charge is display/total-only in this basic pass).
  lease_end_date date,
  service_charge numeric(12, 2) not null default 0,
  guarantor_name text,
  guarantor_phone text,
  guarantor_relationship text,

  -- Nomba virtual account fields — populated after a successful
  -- POST /v1/accounts/virtual call. `nomba_account_ref` is the
  -- accountRef *we* generate and send to Nomba; it's the reliable
  -- key for reconciling webhooks back to a tenant (see README).
  nomba_account_ref text unique,
  virtual_account_number text,
  bank_name text,
  account_name text,

  created_at timestamptz not null default now()
);

create index if not exists idx_tenants_landlord on tenants (landlord_id);
create index if not exists idx_tenants_account_ref on tenants (nomba_account_ref);
create index if not exists idx_tenants_property on tenants (property_id);

-- ---------------------------------------------------------------
-- tenant_kyc_events — audit trail of KYC tier changes, used to
-- power the landlord-facing "KYC tier changed" alert.
-- ---------------------------------------------------------------
create table if not exists tenant_kyc_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  from_tier text,
  to_tier text not null,
  reason text,
  changed_at timestamptz not null default now(),
  acknowledged boolean not null default false
);

create index if not exists idx_kyc_events_tenant on tenant_kyc_events (tenant_id);

-- ---------------------------------------------------------------
-- deposits — one row per tenant's caution/security deposit. Deliberately
-- simple: a single running record per tenant (received amount, cumulative
-- deductions + reason, status), not a full itemized ledger of deposit
-- transactions. Landlord marks it received/refunded manually — this does
-- NOT flow through the Nomba virtual-account reconciliation engine.
-- ---------------------------------------------------------------
create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  landlord_id uuid not null references landlords (id) on delete cascade,
  amount numeric(12, 2) not null,
  status text not null default 'HELD' check (status in ('HELD', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED')),
  deductions numeric(12, 2) not null default 0,
  deduction_reason text,
  received_at timestamptz not null default now(),
  refunded_at timestamptz
);

create index if not exists idx_deposits_tenant on deposits (tenant_id);
create index if not exists idx_deposits_landlord on deposits (landlord_id);

-- ---------------------------------------------------------------
-- maintenance_requests — basic issue-tracking: tenant reports a problem,
-- landlord moves it through OPEN -> IN_PROGRESS -> RESOLVED. No photos/
-- attachments or comment thread in this basic pass.
-- ---------------------------------------------------------------
create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  landlord_id uuid not null references landlords (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_maintenance_tenant on maintenance_requests (tenant_id);
create index if not exists idx_maintenance_landlord on maintenance_requests (landlord_id, status);

-- ---------------------------------------------------------------
-- payments — every inbound transfer RentStack has captured via the
-- Nomba webhook, plus outbound "return" transfers for misdirected
-- payments. `tenant_id` is null for misdirected payments where no
-- virtual account matched. `landlord_id` is nullable: tenants are only
-- ever soft-closed (never hard-deleted), so a resolvable `accountRef`
-- always yields a landlord — the only time landlord_id is null is a
-- genuinely orphaned webhook whose accountRef matches no tenant at all
-- (bad data, or a field-name mismatch in extractIncomingTransfer — see
-- nombaService.js). Those rows are invisible to every landlord (RLS
-- scopes on landlord_id = auth.uid(), which never matches null) and are
-- meant for manual/admin investigation, not the landlord-facing
-- misdirected-payments flow.
-- ---------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid references landlords (id) on delete cascade,
  tenant_id uuid references tenants (id) on delete set null,

  amount numeric(12, 2) not null,
  type text not null
    check (type in ('full', 'partial', 'overpayment', 'disputed', 'misdirected', 'returned')),

  -- Nomba's own transaction reference — the idempotency key that
  -- stops a retried webhook from creating a duplicate row.
  reference text not null unique,

  sender_bank text,
  sender_account_name text,
  sender_account_number text,

  -- Which virtual account the money landed on, as reported by Nomba.
  nomba_account_ref text,

  -- 'nomba' = a real transfer via the webhook. 'simulated' = created from
  -- the landlord's own "Tenant's View" test-payment button (no real money
  -- moved) — lets judges/demo users exercise the same reconciliation
  -- engine without needing a real bank transfer.
  source text not null default 'nomba' check (source in ('nomba', 'simulated')),

  resolved boolean not null default false,
  raw_payload jsonb,

  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_landlord on payments (landlord_id);
create index if not exists idx_payments_tenant on payments (tenant_id);
create index if not exists idx_payments_occurred on payments (occurred_at);
create index if not exists idx_payments_misdirected on payments (landlord_id, resolved) where tenant_id is null;

-- ---------------------------------------------------------------
-- notification_logs — one row per payment-receipt email actually sent
-- (via Brevo). Named generically (not `email_logs`) since `channel`
-- leaves room for another provider/medium later without a rename.
-- ---------------------------------------------------------------
create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  channel text not null default 'email' check (channel in ('email', 'sms')),
  kind text not null default 'receipt' check (kind in ('receipt', 'landlord_alert', 'reminder', 'lease_reminder')),
  provider text not null default 'Brevo',
  to_address text not null,
  subject text,
  message text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  provider_message_id text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_notification_logs_tenant on notification_logs (tenant_id);

-- ---------------------------------------------------------------
-- otp_codes — short-lived signup-verification codes emailed via
-- Brevo. Not tied to a landlord/tenant row (verification happens
-- before the account exists) — backend/service-role only, never
-- readable by an authenticated user (see RLS section below).
-- ---------------------------------------------------------------
create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  purpose text not null default 'signup' check (purpose in ('signup')),
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_codes_email on otp_codes (email);

-- ---------------------------------------------------------------
-- webhook_events — raw audit log of everything Nomba has ever sent
-- us, signature-verified or not. Keep this even after processing —
-- it's the source of truth if reconciliation logic ever needs a
-- replay.
-- ---------------------------------------------------------------
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'nomba',
  event_type text,
  request_id text,
  payload jsonb not null,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_received on webhook_events (received_at);

-- =============================================================
-- Row Level Security
--
-- The Express backend talks to Supabase with the SERVICE_ROLE key,
-- which bypasses RLS entirely — these policies are a defense-in-depth
-- backstop, not the primary access control. They allow an
-- authenticated landlord to *read* their own data if the anon/user
-- key is ever used directly, but grant no write policies, so all
-- writes are only possible via the backend's service-role client.
-- =============================================================

alter table landlords enable row level security;
alter table properties enable row level security;
alter table tenants enable row level security;
alter table tenant_kyc_events enable row level security;
alter table deposits enable row level security;
alter table maintenance_requests enable row level security;
alter table payments enable row level security;
alter table notification_logs enable row level security;
alter table webhook_events enable row level security;
alter table otp_codes enable row level security;

create policy "landlords read own row" on landlords
  for select using (auth.uid() = id);

create policy "landlords update own row" on landlords
  for update using (auth.uid() = id);

create policy "landlords read own properties" on properties
  for select using (auth.uid() = landlord_id);

create policy "landlords read own tenants" on tenants
  for select using (auth.uid() = landlord_id);

create policy "landlords read own payments" on payments
  for select using (auth.uid() = landlord_id);

create policy "landlords read own tenants kyc events" on tenant_kyc_events
  for select using (
    auth.uid() = (select landlord_id from tenants where tenants.id = tenant_kyc_events.tenant_id)
  );

create policy "landlords read own tenants notification logs" on notification_logs
  for select using (
    auth.uid() = (select landlord_id from tenants where tenants.id = notification_logs.tenant_id)
  );

create policy "landlords read own deposits" on deposits
  for select using (auth.uid() = landlord_id);

create policy "landlords read own maintenance requests" on maintenance_requests
  for select using (auth.uid() = landlord_id);

-- webhook_events and otp_codes have no read policy for authenticated
-- users — both are backend/service-role only (webhook_events may hold
-- unverified/raw payloads; otp_codes exists before any account does).

-- =============================================================
-- Grants
--
-- Tables created via the SQL Editor don't automatically pick up the
-- same role grants Supabase's Table Editor UI applies — without this,
-- even the service_role client gets "permission denied for table X"
-- despite bypassing RLS (RLS and table-level GRANTs are separate
-- layers; bypassing one doesn't imply the other). This grants
-- service_role full access now, and by default for any table added
-- later.
-- =============================================================

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
