# RentStack backend

Node.js/Express API backed by Supabase (Postgres + Auth), integrating with
Nomba for virtual accounts and bank transfers, and Termii for SMS receipts.

**This is not yet wired to the frontend.** The frontend still runs entirely
on its mock service layer. This backend is written so that connecting it
later is a matter of swapping mock functions for `fetch` calls — no route
or data-shape surprises.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql` (this repo) once.
3. Settings → API → copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (never expose this to a browser)

Supabase Auth is used as-is for landlord accounts (email/password). The
`landlords` table is a 1:1 profile extension of `auth.users`.

## 2. Set up Nomba

RentStack's Nomba credentials are a **sub-account under a parent business
account** — the credentials email gives you both IDs, plus separate
TEST and LIVE client id/private key pairs. Two rules that matter
everywhere in this codebase (confirmed from Nomba's docs, not assumed):

- The `accountId` header is **always the parent account id** — on auth,
  virtual account creation, and transfers alike.
- The **sub-account id** goes in the URL path, only on the two endpoints
  that move/collect money (create virtual account, bank transfer).

1. From the credentials email: `NOMBA_PARENT_ACCOUNT_ID` = "Main (parent)
   Account ID", `NOMBA_SUB_ACCOUNT_ID` = "Your sub-account ID".
2. While `NOMBA_BASE_URL=https://sandbox.nomba.com`, use the **TEST**
   Client ID/Private key. Switch both the base URL and the credentials
   together when you go live — never mix TEST credentials with the live
   host or vice versa.
3. "Private key" in Nomba's dashboard = `NOMBA_CLIENT_SECRET` here (the
   API itself calls it `client_secret`).
4. In the Nomba dashboard's Webhook Setup (or their onboarding form),
   register `https://<your-deployed-backend>/api/webhooks/nomba` and
   put the signing key they give you into `NOMBA_WEBHOOK_SECRET`.
5. Sub-account transfers must be enabled by Nomba before
   `POST /api/payments/:id/return` will work — if it 403s, that's likely why;
   ask them to enable it for your sub-account.

## 3. Set up Termii (SMS)

Get your API key from [termii.com](https://termii.com) → `TERMII_API_KEY`.
Register a sender ID (or use a shared/test one while in sandbox).

## 4. Install & run

```bash
cd backend
cp .env.example .env   # then fill in the values above
npm install
npm run dev             # http://localhost:4000
```

## 5. Deploy (so Nomba has a public webhook URL to call)

Nomba's servers can't reach `localhost` — you need a real URL before
submitting a webhook URL to them. Steps for Render (free tier, no CLI
needed):

1. Push this repo to GitHub (if not already).
2. In the [Render dashboard](https://dashboard.render.com), **New → Blueprint**,
   point it at your repo. Render will detect `backend/render.yaml`
   automatically and create the service (root dir is already set to `backend`).
   - If you'd rather not use a Blueprint: **New → Web Service**, connect the
     repo, set **Root Directory** to `backend`, **Build Command** to
     `npm install`, **Start Command** to `npm start`.
3. In the service's **Environment** tab, fill in every variable marked
   `sync: false` in `render.yaml` — these are the same values from your
   local `.env` (Supabase keys, Nomba credentials, Termii key). Render
   never shows these back to you in plaintext after saving, so keep your
   local `.env` as your own record.
4. Deploy. Once it's live, your webhook URL is:
   `https://<your-service-name>.onrender.com/api/webhooks/nomba`
5. Submit that URL (plus your Nomba sub-account ID) back to Nomba, and put
   the same `NOMBA_WEBHOOK_SECRET` they gave you into both your local
   `.env` and the Render environment variables.

Free-tier Render services spin down after inactivity and take ~30-60s to
wake on the next request — fine for hackathon judging, worth upgrading
before any real launch.

`GET /health` should return `{ "status": "ok" }` once it's running.

---

## What's real vs. what needs your verification

I built this against Nomba's and Termii's actual published docs (fetched
while writing this, not from memory), but two things could not be
confirmed from public docs alone — **test these in sandbox before relying
on them**:

### 1. Exact webhook payload field names (`nombaService.js` → `extractIncomingTransfer`)

Confirmed from Nomba's docs:
- The webhook envelope is `{ event_type, requestId, data }`.
- `accountRef` (the same string you pass into `createVirtualAccount`) is
  the intended key for matching a credit to a virtual account.
- The **signature** is computed over `event_type:requestId:userId:walletId:transactionId:type:time:responseCode:timestamp` — those six `data` field names (`userId`, `walletId`, `transactionId`, `type`, `time`, `responseCode`) are confirmed, since Nomba documents them specifically for signing.

**Not confirmed:** the field names for amount, sender bank name, sender
account name/number on a virtual-account credit specifically. Nomba's
docs describe these fields existing but don't publish a full example
payload for this event.

**What to do:** trigger one real test transfer to a sandbox virtual
account, temporarily log `JSON.stringify(req.body)` in
`webhookController.js`, and adjust the field list in
`extractIncomingTransfer()` to match exactly what you see. I wrote it to
try several plausible field names already, but don't ship without
checking this.

### 2. Termii's base URL

`smsService.js` uses `https://api.ng.termii.com` — this is the widely
documented Termii API host, but Termii's own docs page renders it as a
template placeholder (`BASE_URL`) rather than literal text in what I could
fetch. Double check it against your Termii dashboard/onboarding email.

---

## Known simplifications (deliberate, documented in code)

- **Misdirected payments have no fixed owner.** A payment only becomes
  "misdirected" (`tenant_id = null`) when its `accountRef` doesn't match
  any tenant at all — which also means we can't know which landlord it
  belongs to (see the big comment on `payments.landlord_id` in
  `schema.sql`). Rather than hide these, `GET /api/payments/misdirected`
  surfaces them to every authenticated landlord; the `assign` action is
  what actually attaches an owner. If you need real multi-landlord
  isolation, provision each landlord as a distinct Nomba **sub-account**
  (`create-virtual-account-for-sub-account` in Nomba's docs) so ownership
  is unambiguous even before assignment.
- **Share links (`reliabilityService.createShareToken`)** are a signed
  HMAC token, not a revocable database row. They expire after 30 days but
  can't be manually revoked early. A `share_tokens` table with a
  `revoked_at` column is the natural upgrade if you need that.
- **Registration auto-confirms email** (`supabaseAdmin.auth.admin.createUser`
  with `email_confirm: true`) so you can test end-to-end without setting
  up Supabase's email templates first. Swap to `supabase.auth.signUp()` +
  a real confirmation flow before a public launch.
- **Tenant offboarding doesn't yet call Nomba's "expire a virtual account"
  endpoint** — it only flips `status` to `CLOSED` in the DB. The account
  itself keeps accepting transfers on Nomba's side until you add that
  call (flagged with a `NOTE:` comment in `tenantController.js`).
- **CSV, not PDF, for statement/report export** — matches what the
  frontend mock currently does. If you need real PDFs, add `pdfkit` or
  similar; the export controllers are the only place that would change.

## Project structure

```
backend/
  src/
    config/       env loading, Supabase client
    middleware/   auth check, error handling
    utils/        asyncHandler, billing-cycle math, CSV
    services/     nombaService, smsService, reconciliationService, reliabilityService
    controllers/  one per resource
    routes/       one per resource, mounted under /api
    app.js        express app assembly
    server.js     entrypoint
  supabase/
    schema.sql    run once against your Supabase project
```

## API surface

All routes below (except `/api/auth/register`, `/api/auth/login`, and
`/api/webhooks/nomba`) require `Authorization: Bearer <accessToken>` from
`/api/auth/login`.

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/tenants
POST   /api/tenants
GET    /api/tenants/:id
PUT    /api/tenants/:id
POST   /api/tenants/:id/offboard
GET    /api/tenants/:id/transactions
GET    /api/tenants/:id/kyc
GET    /api/tenants/:id/reliability-score
GET    /api/tenants/:id/reliability-score/share
GET    /api/tenants/:id/statement/share
GET    /api/tenants/:id/sms-log

GET    /api/payments
GET    /api/payments/misdirected
POST   /api/payments/:id/assign      { tenantId }
POST   /api/payments/:id/return

GET    /api/dashboard?cycle=YYYY-MM

GET    /api/reports?from=&to=
GET    /api/reports/export/csv

GET    /api/kyc/alerts
POST   /api/kyc/alerts/:id/acknowledge

POST   /api/webhooks/nomba           (Nomba calls this — not for the frontend)

GET    /public/score/:token          (unauthenticated — resolves a share link)
GET    /public/statement/:token      (unauthenticated — resolves a share link)
```

## Connecting the frontend (when you're ready)

Each frontend `src/services/*.js` file already has `// MOCK: Replace with
<endpoint>` comments pointing at the routes above. The mechanical change
per the frontend's own architecture (see its `config.js`):

1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=http://localhost:4000` in the frontend's `.env`.
2. Implement `frontend/src/api/apiClient.js` (currently a stub) to attach the
   bearer token and call this API.
3. In each service file, replace the mock branch with a real `apiClient` call.

No page or component changes needed — that's the whole point of the
service-layer pattern already in place.
