# RentStack Backend

Node.js/Express API for RentStack — a virtual-account-powered rent
collection platform for Nigerian landlords. Backed by **Supabase**
(Postgres + Auth) and integrated with **Nomba** (virtual accounts, bank
transfers, webhooks) and **Brevo** (signup OTP + payment-receipt +
payment-alert emails).

> **Status:** This backend is built, deployed, and connected to the real
> frontend (see [Connecting the frontend](#connecting-the-frontend) for
> how that wiring works). Registration, login, dashboard, tenants,
> payments, reports, KYC, and reliability scores are all live against
> real Supabase data. Nomba virtual account provisioning is verified
> working with real credentials. Not yet exercised for real: a
> Nomba-triggered webhook (only tested with synthetic payloads so far)
> and outbound transfers (Nomba must separately enable sub-account
> transfers first). To make the reconciliation engine testable without
> a real bank transfer, `POST /api/tenants/:id/process-payment` (frontend:
> "Tenant's View") feeds it a synthetic transfer instead — see
> [Payment reconciliation logic](#payment-reconciliation-logic).

---

## Table of contents

1. [Architecture](#architecture)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Environment variables](#environment-variables)
5. [Setup](#setup)
   - [Supabase](#1-supabase)
   - [Nomba](#2-nomba)
   - [Brevo](#3-brevo-email)
   - [Install & run locally](#4-install--run-locally)
6. [Deployment](#deployment)
7. [Authentication](#authentication)
8. [Data model](#data-model)
9. [API reference](#api-reference)
10. [Payment reconciliation logic](#payment-reconciliation-logic)
11. [Webhook handling](#webhook-handling)
12. [Error handling](#error-handling)
13. [Known simplifications](#known-simplifications)
14. [Things that need your verification](#things-that-need-your-verification)
15. [Troubleshooting](#troubleshooting)
16. [Connecting the frontend](#connecting-the-frontend)

---

## Architecture

```
┌─────────────┐      Bearer JWT       ┌──────────────────┐
│  Frontend    │ ───────────────────▶ │  Express API      │
│  (not wired  │ ◀─────────────────── │  (this backend)    │
│  yet)        │        JSON           └──────────────────┘
└─────────────┘                          │        │
                                          │        │ service_role
                          Nomba REST API │        ▼
                     (virtual accounts,  │   ┌───────────┐
                      transfers, auth)   │   │ Supabase  │
                                          │   │ Postgres  │
                                          │   │ + Auth    │
                                          ▼   └───────────┘
                                   ┌──────────────┐
                                   │    Nomba     │──▶ webhook ──▶ POST /api/webhooks/nomba
                                   └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │    Brevo     │  (signup OTP, payment-receipt email)
                                   └──────────────┘
```

- The Express API is the **only** thing that talks to Supabase — it
  always uses the `service_role` key, which bypasses Row Level
  Security. RLS policies in `schema.sql` exist as a defense-in-depth
  backstop, not the primary access control.
- Nomba calls **us** (via webhook) whenever money moves on one of our
  virtual accounts. We call **Nomba** to provision virtual accounts and
  to send money back out (returning misdirected payments).
- Brevo is called server-side in two places: once during signup (OTP
  code) and once, fire-and-forget, after a payment is reconciled — a
  failed email never blocks or fails the payment write.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥18 (native `fetch`, ES modules) |
| Web framework | Express 4 |
| Database | Postgres via Supabase |
| Auth | Supabase Auth (email/password) |
| Payments | Nomba (virtual accounts, bank transfers, webhooks) |
| Email | Brevo (signup OTP, payment receipts) |
| Hosting (recommended) | Render (free tier, see [Deployment](#deployment)) |

No ORM — plain `@supabase/supabase-js` query builder calls throughout.
No TypeScript — plain JS with descriptive JSDoc-style comments where the
"why" isn't obvious from the code.

## Project structure

```
backend/
  .env.example          template — copy to .env and fill in
  render.yaml            Render Blueprint (deploy config)
  package.json
  supabase/
    schema.sql            run once against your Supabase project
  src/
    config/
      env.js               loads + validates env vars into one `env` object
      supabaseAdmin.js      the two Supabase clients (service_role, anon)
    middleware/
      requireAuth.js        verifies Bearer token, attaches req.landlordId
      errorHandler.js        404 + central error handler
    utils/
      asyncHandler.js        wraps async route handlers
      ApiError.js             typed HTTP error class
      cycles.js               billing-cycle date math, shared by dashboard/reports
      csv.js                  CSV generation for exports
    services/
      nombaService.js         all Nomba API calls + webhook signature verification
      brevoService.js         Brevo transactional email sending
      otpService.js           signup OTP generate/send/verify
      reconciliationService.js  turns an incoming transfer into a payment + tenant status update
      reliabilityService.js   Rent Reliability Score + shareable-link tokens
    controllers/             one file per resource, thin — validation + calling services/DB
    routes/                  one file per resource, mounted under /api
    app.js                   Express app assembly (middleware, routes, error handling)
    server.js                entrypoint — `node src/server.js`
```

## Environment variables

Full reference — see `.env.example` for the same list with inline
comments. None of these are committed; `.env` is gitignored (verified —
see [Troubleshooting](#troubleshooting) if you're ever unsure).

| Variable | Required | Description |
|---|---|---|
| `PORT` | no (default 4000) | Port the API listens on |
| `NODE_ENV` | no | `development` or `production` |
| `CORS_ORIGIN` | yes | Comma-separated list of origins allowed to call this API |
| `SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | Public anon key — used only to verify landlord JWTs |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Secret.** Full DB access, bypasses RLS. Backend-only, never send to a browser |
| `NOMBA_BASE_URL` | yes | `https://sandbox.nomba.com` or `https://api.nomba.com` |
| `NOMBA_PARENT_ACCOUNT_ID` | yes | "Main (parent) Account ID" from Nomba's credentials email — goes in the `accountId` header on every call |
| `NOMBA_SUB_ACCOUNT_ID` | yes | "Your sub-account ID" — used in the URL path for virtual account creation + transfers only |
| `NOMBA_CLIENT_ID` | yes | TEST or LIVE, matching `NOMBA_BASE_URL` |
| `NOMBA_CLIENT_SECRET` | yes | Nomba calls this "Private key" in their dashboard |
| `NOMBA_WEBHOOK_SECRET` | yes | Signing key Nomba gives you — verifies the `nomba-signature` header |
| `BREVO_API_KEY` | yes | Without it, signup OTP emails can't send (registration will fail) and payment-receipt emails fail gracefully (logged, not thrown) |
| `BREVO_SENDER_EMAIL` | no (default `notifications@rentstack.app`) | Must be a verified sender in your Brevo account |
| `BREVO_SENDER_NAME` | no (default `RentStack`) | Display name on outgoing emails |
| `INTERNAL_WEBHOOK_ALLOW_UNSIGNED` | no (default `false`) | Dev-only escape hatch to test `/api/webhooks/nomba` locally without a real signature. **Must be `false` in any deployed environment.** |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick a
   region close to your users (for RentStack, **West Europe (London)**
   has the best connectivity to Nigeria among standard cloud regions).
2. **SQL Editor → New query** → paste the entire contents of
   `supabase/schema.sql` → **Run**. You should see "Success. No rows
   returned." Verify in **Table Editor** that `landlords`, `tenants`,
   `tenant_kyc_events`, `payments`, `notification_logs`, `otp_codes`,
   and `webhook_events` all exist.
3. **Settings → API Keys** → copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public** key → `SUPABASE_ANON_KEY`
   - **service_role** key (click "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

Supabase Auth is used as-is for landlord accounts. The `landlords`
table is a 1:1 profile extension of `auth.users` (same `id`). No email
template setup is required — see [Known simplifications](#known-simplifications).

> **If you already ran an earlier version of `schema.sql`** (before
> `notification_logs`/`otp_codes` existed), run this once instead of
> the full script — it renames the old `sms_logs` table in place and
> adds the new OTP table, so you don't lose any existing data:
> ```sql
> alter table sms_logs rename to notification_logs;
> alter table notification_logs rename column to_phone to to_address;
> alter table notification_logs add column if not exists channel text not null default 'email' check (channel in ('email'));
> alter table notification_logs add column if not exists subject text;
> alter table notification_logs alter column provider set default 'Brevo';
> drop policy if exists "landlords read own tenants sms logs" on notification_logs;
> create policy "landlords read own tenants notification logs" on notification_logs
>   for select using (auth.uid() = (select landlord_id from tenants where tenants.id = notification_logs.tenant_id));
>
> create table if not exists otp_codes (
>   id uuid primary key default gen_random_uuid(),
>   email text not null,
>   code text not null,
>   purpose text not null default 'signup' check (purpose in ('signup')),
>   expires_at timestamptz not null,
>   verified_at timestamptz,
>   consumed_at timestamptz,
>   created_at timestamptz not null default now()
> );
> create index if not exists idx_otp_codes_email on otp_codes (email);
> alter table otp_codes enable row level security;
>
> grant all on all tables in schema public to service_role;
> grant all on all sequences in schema public to service_role;
> ```

> **If you hit `permission denied for table X`:** tables created via
> the SQL Editor don't always inherit the same grants Supabase's Table
> Editor UI applies automatically. `schema.sql` includes an explicit
> `grant ... to service_role` block at the bottom to prevent this —
> if you ran an older copy of the file, re-run just that block (see
> [Troubleshooting](#troubleshooting)).

> **If your `payments` table predates the "Tenant's View" process-payment
> feature**, run this once to add the column that distinguishes a real
> Nomba transfer from a landlord's own test payment:
> ```sql
> alter table payments add column if not exists source text not null default 'nomba' check (source in ('nomba', 'simulated'));
> ```

### 2. Nomba

RentStack's Nomba credentials are a **sub-account under a parent
business account** — the credentials email gives you both IDs, plus
separate TEST and LIVE client id/private key pairs. Two rules matter
everywhere in this codebase (confirmed from Nomba's own docs):

- The `accountId` **header** is always the **parent** account id — on
  auth, virtual account creation, and transfers alike.
- The **sub-account id** goes in the **URL path**, only on the two
  endpoints that move/collect money (create virtual account, transfer).

Steps:

1. From the credentials email: `NOMBA_PARENT_ACCOUNT_ID` = "Main
   (parent) Account ID", `NOMBA_SUB_ACCOUNT_ID` = "Your sub-account ID".
2. While `NOMBA_BASE_URL=https://sandbox.nomba.com`, use the **TEST**
   Client ID/Private key. Switch both the base URL and the credentials
   together when you go live — never mix TEST credentials with the live
   host or vice versa.
3. "Private key" in Nomba's dashboard = `NOMBA_CLIENT_SECRET` here (the
   API itself calls it `client_secret`).
4. Register your webhook URL with Nomba (their onboarding form or
   dashboard → Webhook Setup): `https://<your-deployed-backend>/api/webhooks/nomba`.
   Put the signing key they give you into `NOMBA_WEBHOOK_SECRET`.
5. Sub-account transfers must be separately enabled by Nomba before
   `POST /api/payments/:id/return` will work — if it 403s, that's
   likely why; ask them to enable it for your sub-account.

### 3. Brevo (email)

We use Brevo instead of an SMS provider (like Termii) for two reasons:
it has a genuine free tier for transactional email (unlike per-SMS
pricing with no meaningful free allowance), and every tenant/landlord
already has an email address in the data model — no new data collection
needed.

1. Sign up at [brevo.com](https://www.brevo.com), then **Settings → SMTP & API → API Keys** → generate a key → `BREVO_API_KEY`.
2. **Senders, Domains & Dedicated IPs** → add and verify a sender email
   (their flow emails you a confirmation link) → that address goes in
   `BREVO_SENDER_EMAIL`.
3. Used for two things: `POST /api/auth/request-otp` (signup
   verification code) and the payment-receipt email fired from
   `reconciliationService.js` after every reconciled payment.

### 4. Install & run locally

```bash
cd backend
cp .env.example .env   # then fill in every value from steps 1-3
npm install
npm run dev             # http://localhost:4000
```

`GET /health` should return `{ "status": "ok", "env": "development" }`.

## Deployment

Nomba's servers can't reach `localhost` — you need a public URL. Steps
for **Render** (free tier, no CLI needed):

1. Push this repo to GitHub.
2. [Render dashboard](https://dashboard.render.com) → **New → Blueprint**
   → point it at your repo. Render detects `backend/render.yaml`
   automatically (root dir, build/start commands, health check are all
   pre-configured).
   - Alternative without a Blueprint: **New → Web Service**, root
     directory `backend`, build command `npm install`, start command
     `npm start`.
3. In the service's **Environment** tab, fill in every variable marked
   `sync: false` in `render.yaml` — same values as your local `.env`.
   Render won't show secrets back to you in plaintext after saving, so
   keep your local `.env` as your own record.
4. Deploy. Your webhook URL is now
   `https://<your-service-name>.onrender.com/api/webhooks/nomba`.
5. Submit that URL + your sub-account ID to Nomba.

Free-tier Render services spin down after inactivity (~30-60s cold
start on the next request) — fine for demos/judging, worth upgrading
before a real launch.

## Authentication

Landlord auth is Supabase Auth (email/password), with an email-OTP
verification step in front of registration:

1. `POST /api/auth/request-otp { email }` — checks the email isn't
   already registered, generates a 6-digit code, stores it in
   `otp_codes` (10-minute expiry), emails it via Brevo.
2. `POST /api/auth/verify-otp { email, code }` — marks the code (and
   email) verified. Doesn't create an account yet.
3. `POST /api/auth/register {...}` — requires a verified,
   not-yet-consumed OTP for that email less than 30 minutes old
   (`otpService.assertEmailVerifiedForSignup`), or it 400s. On success,
   consumes the OTP (so it can't be replayed) and creates the Supabase
   Auth user with `email_confirm: true` — safe to auto-confirm because
   the OTP step already proved the address is real, so there's no need
   for Supabase's own separate confirmation-email flow on top of it.
4. `POST /api/auth/login` or a successful `register` both return a
   `session.accessToken` (a Supabase JWT, ~1hr lifetime) and
   `refreshToken`.
5. Every other landlord-facing route requires:
   ```
   Authorization: Bearer <accessToken>
   ```
6. `requireAuth` middleware verifies the token against Supabase Auth
   (`supabaseAuth.auth.getUser(token)`), then loads the matching
   `landlords` row and attaches it as `req.landlord` /
   `req.landlordId` for every downstream handler.

There is no separate "logout" invalidation server-side — Supabase JWTs
are stateless. `POST /api/auth/logout` exists so the frontend has a
consistent call to make; discarding the token client-side is what
actually "logs out."

`POST /api/webhooks/nomba` and `GET /public/*` are the only routes with
**no** bearer-token auth — see their own sections below for how they're
secured instead.

## Data model

| Table | Key columns | Notes |
|---|---|---|
| **landlords** | `id` (= `auth.users.id`), `name`, `email`, `phone`, `property_name`, `property_address`, `rent_per_unit` | 1:1 with Supabase Auth |
| **tenants** | `id`, `landlord_id`, `name`, `unit`, `rent_amount`, `move_in_date`, `move_out_date`, `status`, `kyc_tier`, `nomba_account_ref`, `virtual_account_number`, `bank_name` | `status` is cached/derived, kept in sync by `reconciliationService.refreshTenantStatus` |
| **tenant_kyc_events** | `tenant_id`, `from_tier`, `to_tier`, `reason`, `acknowledged` | Powers the KYC-change landlord alert |
| **payments** | `id`, `landlord_id` (nullable), `tenant_id` (nullable), `amount`, `type`, `reference` (unique), `sender_bank`, `sender_account_name`, `sender_account_number`, `nomba_account_ref`, `source`, `resolved`, `raw_payload` | `type` ∈ `full, partial, overpayment, disputed, misdirected, returned`. `source` ∈ `nomba, simulated` — `simulated` rows come from "Tenant's View" test payments, not a real transfer. See [Payment reconciliation logic](#payment-reconciliation-logic) for why `landlord_id`/`tenant_id` can be null |
| **notification_logs** | `tenant_id`, `payment_id`, `channel`, `to_address`, `subject`, `message`, `status`, `provider_message_id` | One row per payment-receipt email actually attempted |
| **otp_codes** | `email`, `code`, `purpose`, `expires_at`, `verified_at`, `consumed_at` | Signup verification codes — not tied to a landlord row (exists before the account does); service-role only, no RLS read policy at all |
| **webhook_events** | `event_type`, `request_id`, `payload` (jsonb), `signature_valid`, `processed`, `processing_error` | Raw audit log of **every** webhook Nomba has ever sent, valid or not |

Row Level Security is enabled on all eight tables. Policies scope `select`
to `auth.uid() = landlord_id` (directly, or via a join through
`tenants` for the two child tables) — there are **no write policies**,
so all writes are only possible through this API's `service_role`
client. Full grant/RLS statements are in `schema.sql`.

## API reference

All request/response bodies are JSON. All routes below except
`register`, `login`, `/api/webhooks/nomba`, and `/public/*` require the
`Authorization: Bearer <accessToken>` header described above.

### Auth

<details>
<summary><code>POST /api/auth/request-otp</code></summary>

```jsonc
// Request
{ "email": "a@b.com" }
// Response (200)
{ "success": true }
```
409s with `{ "error": "An account with this email already exists." }` if already registered.
</details>

<details>
<summary><code>POST /api/auth/verify-otp</code></summary>

```jsonc
// Request
{ "email": "a@b.com", "code": "123456" }
// Response (200)
{ "success": true }
```
</details>

<details>
<summary><code>POST /api/auth/register</code></summary>

```jsonc
// Request
{ "name": "Abdulwahab Yusuf", "email": "a@b.com", "phone": "08031234567",
  "password": "at-least-8-chars", "propertyName": "Sunshine Court",
  "propertyAddress": "14 Admiralty Way, Lekki Phase 1, Lagos" }

// Response (201)
{ "user": { "id": "...", "name": "...", "email": "...", "property_name": "...", ... },
  "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": 1234567890 } }
```
</details>

<details>
<summary><code>POST /api/auth/login</code></summary>

```jsonc
// Request
{ "email": "a@b.com", "password": "..." }
// Response (200) — same shape as register
```
</details>

<details>
<summary><code>GET /api/auth/me</code></summary>

Returns `{ "user": <landlord row> }` for the authenticated caller.
</details>

<details>
<summary><code>POST /api/auth/logout</code></summary>

Returns `{ "success": true }`. See [Authentication](#authentication) for why this is a no-op server-side.
</details>

### Tenants

| Route | Description |
|---|---|
| `GET /api/tenants` | List all of this landlord's tenants |
| `POST /api/tenants` | Create a tenant — **also provisions a real Nomba virtual account**. Body: `{ name, unit, email, phone, moveInDate, rentAmount }`. If the Nomba call fails, no tenant row is created |
| `GET /api/tenants/:id` | Single tenant |
| `PUT /api/tenants/:id` | Update `{ name, unit, email, phone, rentAmount }` |
| `POST /api/tenants/:id/offboard` | Sets `status = CLOSED`, `move_out_date = today`. Does **not** yet call Nomba's expire-virtual-account endpoint — see [Known simplifications](#known-simplifications) |
| `GET /api/tenants/:id/transactions` | Full payment history for this tenant, newest first |
| `GET /api/tenants/:id/kyc` | `{ tier, limit, tierChange }` — `tierChange` is the most recent unacknowledged event, or `null` |
| `GET /api/tenants/:id/reliability-score` | `{ score, tier, cyclesTracked, onTimeCount, partialCount, missedCount, breakdown, generatedAt }` |
| `GET /api/tenants/:id/reliability-score/share` | `{ url }` — mints a 30-day signed link, resolved by `GET /public/score/:token` |
| `GET /api/tenants/:id/statement/share` | `{ url }` — same mechanism, resolved by `GET /public/statement/:token` |
| `POST /api/tenants/:id/process-payment` | Body: `{ amount }`. Runs `amount` through the **exact same** `processIncomingTransfer` function the real Nomba webhook uses — same full/partial/overpayment/disputed classification, same tenant + landlord email alerts — just with a synthetic transfer instead of a signed Nomba payload. The resulting `payments` row has `source = 'simulated'` (internal flag only — never shown to users). Powers the frontend's "Tenant's View" test-payment button; requires the landlord's own auth token, same as every other tenant route |
| `GET /api/tenants/:id/notifications` | Every payment-receipt email sent to this tenant |

### Payments

| Route | Description |
|---|---|
| `GET /api/payments` | This landlord's full payment ledger (never includes unresolved misdirected payments) |
| `GET /api/payments/misdirected` | Platform-wide unresolved payments with no tenant match — see the ownership note in [Known simplifications](#known-simplifications) |
| `POST /api/payments/:id/assign` | Body `{ tenantId }` — attaches the payment to one of *your* tenants, sets `landlord_id`, recomputes tenant status |
| `POST /api/payments/:id/return` | Sends the money back to the original sender via Nomba's transfer API. Requires `sender_account_number` + a resolvable `sender_bank` on the payment row |

### Dashboard & Reports

| Route | Description |
|---|---|
| `GET /api/dashboard?cycle=YYYY-MM` | Full dashboard payload: KPI totals, status counts, per-tenant rows (with `daysSinceLastPayment`/`overdue`), last 10 payments, tenants due in the next 7 days, property summary. `cycle` defaults to the current month |
| `GET /api/reports?from=&to=` | `{ monthly, byTenant, totalCollected, payments }` — `monthly` covers the last 4 cycles regardless of `from`/`to` |
| `GET /api/reports/export/csv` | Streams a `text/csv` file of every payment |

### KYC

| Route | Description |
|---|---|
| `GET /api/kyc/alerts` | Unacknowledged tier-change events for this landlord's tenants |
| `POST /api/kyc/alerts/:id/acknowledge` | Marks one alert as acknowledged |

### Webhooks & public links

| Route | Auth | Description |
|---|---|---|
| `POST /api/webhooks/nomba` | HMAC signature (see [Webhook handling](#webhook-handling)) | Nomba calls this directly — never called by the frontend |
| `GET /public/score/:token` | Signed token in URL | Unauthenticated — resolves a reliability-score share link |
| `GET /public/statement/:token` | Signed token in URL | Unauthenticated — resolves a statement share link |

### Health

`GET /health` → `{ "status": "ok", "env": "development" }` — no auth, useful for uptime checks and Render's health check.

## Payment reconciliation logic

This is the core business logic, in `reconciliationService.js` and `utils/cycles.js`. It's fed from two places — a
real Nomba webhook, or the "Tenant's View" process-payment button — both of which build the same `transfer` shape
and hand it to `processIncomingTransfer()`, so the steps below apply identically either way:

1. A webhook arrives → `extractIncomingTransfer()` pulls out
   `accountRef`, `amount`, `reference`, sender details. (Or: a landlord
   hits "Process Payment" in Tenant's View, and `processPayment()` in
   `tenantController.js` builds an equivalent object directly, tagged
   `source: 'simulated'` internally.)
2. **Idempotency check**: if `reference` already exists in `payments`,
   stop — Nomba retries webhooks on anything but a 2XX response, so
   duplicates are expected and must be ignored.
3. **Tenant lookup**: find the tenant whose `nomba_account_ref` matches
   `accountRef`.
   - No match → `type = 'misdirected'`, `tenant_id`/`landlord_id` both null.
4. **Name check**: if the sender's name doesn't loosely match the
   tenant's registered `account_name` (word-set comparison, tolerant of
   reordering/casing) → `type = 'disputed'`, regardless of amount.
5. **Otherwise**, classify against the current cycle's running total for
   that tenant (`classifyAgainstCycle`): sum of this cycle's payments
   *including this one*, compared to `rent_amount` →
   `full` / `partial` / `overpayment`.
6. Insert the `payments` row, then `refreshTenantStatus()` recomputes
   and caches the tenant's `status` column from that same cycle's rows
   (so it never drifts from the underlying payment history).
7. If a tenant was matched and the type isn't `misdirected`/`returned`:
   a receipt email fires to the tenant (if they have an email on file),
   and a separate alert email fires to the **landlord** (if the tenant's
   `landlord_id` resolves to a landlord with an email — misdirected
   payments have no `landlord_id`, so they're never alerted on today).
   Both are best-effort via `brevoService.sendEmail()` — logged to
   `notification_logs` either way, success or failure; a failed email
   never blocks the payment write.

**Cycles** are always calendar months, keyed `"YYYY-MM"`. `dashboardController`
and `reportController` both use the same `cycleBounds()`/`classifyCycle()`
helpers so numbers are consistent everywhere they're shown.

## Webhook handling

Confirmed directly from Nomba's docs (not assumed):

- Envelope: `{ event_type, requestId, data }`.
- Nomba fires on 6 event types; **only `payment_success` is acted on
  today** — the other five (`payout_success`, `payment_failed`,
  `payment_reversal`, `payout_failed`, `payout_refund`) are logged to
  `webhook_events` for audit but not processed. Add handling in
  `webhookController.js` as those become relevant.
- **Every** request — valid signature or not — is written to
  `webhook_events` first, before any other logic runs. Nothing is ever
  silently dropped.
- Signature: `HMAC-SHA256(secret, signingString)`, base64-encoded,
  compared (`timingSafeEqual`) against the `nomba-signature` header.
  ```
  signingString = event_type:requestId:data.userId:data.walletId:
                  data.transactionId:data.type:data.time:
                  data.responseCode:nomba-timestamp-header
  ```
- Invalid signature → `401`, no processing. Valid but unhandled event
  type → `200` (acknowledged, not acted on). Processing error →
  still `200` (so Nomba doesn't retry forever for what's usually a bug
  on our side), with the error recorded in `webhook_events.processing_error`.

## Error handling

Every error response is `{ "error": "human-readable message" }` with an
appropriate status code (400/401/403/404/409/500), thrown via the
`ApiError` class and caught by the central `errorHandler` middleware.
Route handlers never need their own try/catch for this — `asyncHandler`
forwards any rejected promise to `errorHandler` automatically.

## Known simplifications

- **Misdirected payments have no fixed owner.** A payment only becomes
  `misdirected` when its `accountRef` matches no tenant at all — which
  also means we structurally can't know which landlord it belongs to
  (tenants are only ever soft-closed, never hard-deleted, so a
  resolvable `accountRef` always yields a landlord; only a genuinely
  orphaned webhook has this problem). Rather than hide these forever,
  `GET /api/payments/misdirected` surfaces them to every authenticated
  landlord — `assign` is what actually attaches an owner. Real
  multi-landlord isolation would mean provisioning each landlord as
  their own Nomba sub-account.
- **Share links are signed HMAC tokens, not revocable DB rows.** They
  expire after 30 days but can't be manually revoked early. A
  `share_tokens` table with a `revoked_at` column is the natural
  upgrade if that matters to you.
- **Registration auto-confirms email** (`email_confirm: true` via the
  admin API) so you can test end-to-end without configuring Supabase's
  email templates first. Swap to `supabase.auth.signUp()` + a real
  confirmation flow before a public launch.
- **Tenant offboarding doesn't call Nomba's "expire virtual account"
  endpoint yet** — only the DB `status` flips to `CLOSED`. The account
  keeps accepting transfers on Nomba's side until that call is added
  (flagged with a `NOTE:` in `tenantController.js`).
- **CSV, not PDF**, for statement/report export — matches the frontend
  mock. Swapping to real PDFs (e.g. `pdfkit`) only touches the export
  controllers.

## Things that need your verification

Built against Nomba's and Brevo's actual published docs (fetched while
writing this, not from memory), but two specifics couldn't be confirmed
from public docs alone:

1. **Exact webhook `data` field names** for a virtual-account credit
   (`payment_success`) — amount, sender bank, sender account name/number.
   Nomba's docs confirm `accountRef` is the reconciliation key and name
   the 6 fields used for signing, but don't publish a full example
   payload for this specific event. `extractIncomingTransfer()` in
   `nombaService.js` tries several plausible field names — trigger one
   real sandbox transfer, log `req.body` in `webhookController.js`, and
   tighten the field list to match reality before relying on it.
2. **Brevo's free-tier email limits** — their transactional email API
   (`POST https://api.brevo.com/v3/smtp/email`, confirmed) works exactly
   as documented in this codebase, but their pricing page didn't render
   as static content when checked, so the exact free daily/monthly
   email allowance isn't confirmed here. Check your own Brevo dashboard
   if volume matters for your use case.

## Troubleshooting

**`permission denied for table X` when the service_role client tries to
read/write** — tables created via the SQL Editor don't automatically
inherit the grants Supabase's Table Editor UI applies. Fix (already in
`schema.sql`, but here standalone if you need to re-run it):
```sql
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
```

**`TypeError: fetch failed` / `getaddrinfo ENOTFOUND ...supabase.co`** —
`SUPABASE_URL` is still a placeholder or mistyped. Confirm it's your
real project URL (`https://<project-ref>.supabase.co`).

**`Error: supabaseKey is required.` on startup** — `SUPABASE_ANON_KEY`
or `SUPABASE_SERVICE_ROLE_KEY` is empty in `.env`.

**Nomba transfer returns 403** — sub-account transfers must be enabled
by Nomba first; see [Setup → Nomba](#2-nomba), step 5.

**Webhook always 401s** — check `NOMBA_WEBHOOK_SECRET` matches exactly
what Nomba gave you, and that you're not accidentally running with
`INTERNAL_WEBHOOK_ALLOW_UNSIGNED=true` in an environment where you
expect real verification (that flag makes every signature "valid").

## Connecting the frontend

Each frontend `src/services/*.js` file already has `// MOCK: Replace
with <endpoint>` comments pointing at the exact routes documented
above. Per the frontend's own architecture (see its `config.js`):

1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=http://localhost:4000`
   (or your deployed URL) in the frontend's `.env`.
2. Implement `frontend/src/api/apiClient.js` (currently a stub) to
   attach the bearer token and call this API.
3. In each service file, replace the mock branch with a real
   `apiClient` call.

No page or component changes needed — that's the whole point of the
service-layer pattern already in place on the frontend.
