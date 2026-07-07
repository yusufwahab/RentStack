# RentStack

RentStack is a virtual-account-powered rent collection platform for
Nigerian landlords, built on Nomba's payment infrastructure. Every
tenant gets their own dedicated bank account number; every transfer is
automatically reconciled against the right tenant and cycle; landlords
get one dashboard instead of a WhatsApp chat full of bank alerts.

- **Live frontend:** https://rent-stack.vercel.app
- **Backend API:** https://rentstack.onrender.com (see [backend/README.md](backend/README.md))
- **Repo:** https://github.com/yusufwahab/RentStack

## Current status

| Piece | Status |
|---|---|
| Frontend UI (this folder) | ✅ Fully built — landing page through every internal screen |
| Backend API (`backend/`) | ✅ Fully built, deployed, connected to a real Supabase project |
| Frontend ↔ backend connection | ✅ **Connected.** Every service file calls the real API when `VITE_USE_MOCK=false` — verified end to end (registration, login, dashboard, tenants, payments, reports) |
| Nomba integration | ✅ Verified — real virtual account provisioning confirmed working. ⚠️ Outbound transfers and a real (non-synthetic) webhook delivery aren't exercised yet |
| Signup verification | ✅ Email OTP via Brevo required before an account is created (see [Auth flow](#auth-flow)) |
| Payment-receipt notifications | ✅ Email via Brevo (not SMS — see [backend/README.md](backend/README.md#3-brevo-email) for why) |

## What's built (frontend)

- **Landing page** — full marketing site: hero, reconciliation-scenario
  strip, featured-properties section, problem/solution, how-it-works,
  testimonials, CTA, footer.
- **Auth & onboarding** — split-screen login, 4-step landlord signup
  wizard (property details → account setup → email OTP verification →
  done). See [Auth flow](#auth-flow).
- **Landlord dashboard** — cycle selector (this month / last month / two
  months ago), financial KPIs, a prominent collection-rate bar, status
  breakdown, tenant payment-status table (with overdue flags and
  days-since-last-payment), a live recent-activity feed, upcoming due
  dates, property summary, quick actions, and a misdirected-payments
  alert banner.
- **Tenants** — list, add (provisions a real Nomba virtual account),
  detail page with account info, current-cycle balance, KYC tier +
  tier-change flagging, Rent Reliability Score, payment history, email
  notification log, statement download + shareable link, offboarding.
- **Payments** — full ledger plus a dedicated misdirected-payments queue
  with assign-to-tenant / return-to-sender actions.
- **Reports** — monthly collection breakdown, per-tenant totals, CSV export.
- **Settings** — landlord profile.
- **Tenant portal** — self-service lookup by virtual account number
  (or via a link with `?account=`), payment history, Rent Reliability
  Score, statement download + shareable link.

Every page handles loading, error (with retry), and empty states —
nothing ever renders blank.

## Tech stack

- **React 19 + Vite + React Router**
- **Tailwind CSS v4** (via `@tailwindcss/vite` — already configured, don't reinstall or modify)
- No backend calls from any page directly — everything goes through a
  service layer (see below), which is what made connecting the real
  backend a config change rather than a rewrite.

## Getting started

```bash
npm install
cp .env.example .env   # see "Mock vs. real backend" below
npm run dev             # http://localhost:5173
```

## Mock vs. real backend

`src/config.js` reads `VITE_USE_MOCK` from `.env`:

- **`VITE_USE_MOCK=true`** (default) — every page runs entirely on
  in-memory mock data (`src/mock/`), no network calls, no backend
  needed. Login accepts any email/password. Good for UI work in
  isolation.
- **`VITE_USE_MOCK=false`** — every service function calls the real
  backend instead, via `src/api/apiClient.js` (attaches the bearer
  token automatically, redirects to `/login` on a 401). Set
  `VITE_API_URL` to `http://localhost:4000` (local backend) or
  `https://rentstack.onrender.com` (deployed). Registration then
  requires a real email OTP (see below) and tenant creation provisions
  a real Nomba virtual account.

### Demo login (mock mode only)

```
Email:    abdulwahab@rentstack.com
Password: password123
```

In real mode, login checks actual Supabase-issued credentials — use an
account you've registered, or ask a teammate who has one.

## Auth flow

Registration is a 4-step wizard (`src/pages/RegisterPage.jsx`):

1. **Property details** — name, property name/address, phone.
2. **Account setup** — email + password. Submitting this calls
   `requestSignupOtp(email)`, which emails a 6-digit code via Brevo.
3. **Verify email** — enter the code. Submitting calls
   `verifySignupOtp(email, code)`, then immediately `register(...)` —
   the account is only created after the code checks out.
4. **Done** — redirects to the dashboard, already logged in.

In mock mode, step 2 always "succeeds" and step 3 accepts any 6-digit
code (no real email is sent). In real mode, the backend enforces the
whole thing server-side regardless of what the frontend does — see
[backend/README.md → Authentication](backend/README.md#authentication).

## Architecture: the service layer

Every page/component calls a function in `src/services/*.js` — never
an API directly. Each service function checks the `USE_MOCK` flag and
either returns realistic mock data (wrapped in an artificial
600-900ms delay so loading states are always exercised) or calls the
real backend, mapping Postgres's snake_case/flat response shapes back
into the camelCase/nested shapes every page was built against
(`src/utils/apiMappers.js` is where that translation lives).

```
src/
  mock/            mockData.js (landlord, 8 tenants, 30+ payments), mockDelay.js
  services/        authService, tenantService, paymentService, dashboardService,
                    reportService, kycService, notificationService, reliabilityService
  api/              apiClient.js — bearer-token fetch wrapper for the real backend
  utils/            apiMappers.js — snake_case/nested-shape translation, format.js
  context/          AuthContext, AppContext
  hooks/            useAsync — the shared loading/error/retry pattern every page uses
  components/       Sidebar, layouts, and ui/ (Avatar, Icon, StatusBadge, PageBanner, ...)
  pages/            LandingPage, LoginPage, RegisterPage, landlord/*, tenant/*
```

Every service function has a `// MOCK: Replace with <endpoint>` comment
pointing at the exact real backend route it calls — all documented in
[backend/README.md](backend/README.md#api-reference).

## Backend

The backend (Node.js/Express + Supabase + Nomba + Brevo) lives in
[`backend/`](backend/) and is a completely separate app with its own
`package.json`, `.env`, and deployment. See
**[backend/README.md](backend/README.md)** for architecture, full API
reference, data model, setup instructions, and current known
limitations — it's the single source of truth for everything backend-related.
