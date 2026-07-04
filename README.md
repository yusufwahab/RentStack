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
| Nomba integration | ⚠️ Webhook receiver is live and verifying signatures correctly; the actual Nomba API calls (virtual account provisioning, transfers) are **not yet connected** — still missing account credentials |
| Frontend ↔ backend connection | ❌ **Not connected yet.** The frontend still runs entirely on its own mock service layer (see below) — real data from Supabase/Nomba isn't wired into any page yet |

In short: the two halves of the product are each independently real and
working, but they haven't been plugged into each other yet.

## What's built (frontend)

- **Landing page** — full marketing site: hero, reconciliation-scenario
  strip, featured-properties section, problem/solution, how-it-works,
  testimonials, CTA, footer.
- **Auth & onboarding** — split-screen login, 3-step landlord onboarding
  wizard. (Currently accepts any email/password while backed by mocks —
  see [Demo login](#demo-login).)
- **Landlord dashboard** — cycle selector (this month / last month / two
  months ago), financial KPIs, a prominent collection-rate bar, status
  breakdown, tenant payment-status table (with overdue flags and
  days-since-last-payment), a live recent-activity feed, upcoming due
  dates, property summary, quick actions, and a misdirected-payments
  alert banner.
- **Tenants** — list, add (provisions a virtual account, mocked or
  real), detail page with account info, current-cycle balance, KYC tier
  + tier-change flagging, Rent Reliability Score, payment history,
  SMS-notification log, statement download + shareable link, offboarding.
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
  service layer (see below), which is what makes the eventual backend
  connection a config change rather than a rewrite.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

### Demo login

The auth flow currently accepts **any email and password** (mocked —
see `src/services/authService.js`). There's also a seeded demo
landlord account with realistic data:

```
Email:    abdulwahab@rentstack.com
Password: password123
```

## Mock architecture

Every page/component calls a function in `src/services/*.js` — never
an API directly. Each service function checks the `USE_MOCK` flag
(`src/config.js`, driven by `VITE_USE_MOCK` in `.env`) and either
returns realistic mock data (wrapped in an artificial 600-900ms delay
so loading states are always exercised) or — once connected — calls
the real backend via `src/api/apiClient.js` (currently a stub).

```
src/
  mock/            mockData.js (landlord, 8 tenants, 30+ payments), mockDelay.js
  services/        authService, tenantService, paymentService, dashboardService,
                    reportService, webhookService, kycService, smsService, reliabilityService
  api/              apiClient.js — stub, implement when connecting the real backend
  context/          AuthContext, AppContext
  hooks/            useAsync — the shared loading/error/retry pattern every page uses
  components/       Sidebar, layouts, and ui/ (Avatar, Icon, StatusBadge, PageBanner, ...)
  pages/            LandingPage, LoginPage, RegisterPage, landlord/*, tenant/*
```

Every mock service function has a `// MOCK: Replace with <endpoint>`
comment pointing at the exact real backend route it corresponds to —
those routes already exist and are documented in
[backend/README.md](backend/README.md#api-reference).

## Connecting the real backend (when ready)

1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=https://rentstack.onrender.com` in `.env`.
2. Implement `src/api/apiClient.js` to attach the bearer token (from
   login) and call the real API.
3. In each `src/services/*.js` file, replace the mock branch with a
   real `apiClient` call — the endpoint each one maps to is already
   commented above the function.

No page or component changes required — that's the point of the
service-layer pattern.

## Backend

The backend (Node.js/Express + Supabase + Nomba + Termii) lives in
[`backend/`](backend/) and is a completely separate app with its own
`package.json`, `.env`, and deployment. See
**[backend/README.md](backend/README.md)** for architecture, full API
reference, data model, setup instructions, and current known
limitations — it's the single source of truth for everything backend-related.
