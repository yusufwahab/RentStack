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
-- tenants
-- ---------------------------------------------------------------
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references landlords (id) on delete cascade,
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
-- sms_logs — one row per payment-receipt SMS actually sent.
-- ---------------------------------------------------------------
create table if not exists sms_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  provider text not null default 'Termii',
  to_phone text not null,
  message text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  provider_message_id text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_sms_logs_tenant on sms_logs (tenant_id);

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
alter table tenants enable row level security;
alter table tenant_kyc_events enable row level security;
alter table payments enable row level security;
alter table sms_logs enable row level security;
alter table webhook_events enable row level security;

create policy "landlords read own row" on landlords
  for select using (auth.uid() = id);

create policy "landlords update own row" on landlords
  for update using (auth.uid() = id);

create policy "landlords read own tenants" on tenants
  for select using (auth.uid() = landlord_id);

create policy "landlords read own payments" on payments
  for select using (auth.uid() = landlord_id);

create policy "landlords read own tenants kyc events" on tenant_kyc_events
  for select using (
    auth.uid() = (select landlord_id from tenants where tenants.id = tenant_kyc_events.tenant_id)
  );

create policy "landlords read own tenants sms logs" on sms_logs
  for select using (
    auth.uid() = (select landlord_id from tenants where tenants.id = sms_logs.tenant_id)
  );

-- webhook_events has no read policy for authenticated users — it's
-- backend/service-role only (may contain unverified/raw payloads).

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
