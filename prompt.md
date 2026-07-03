You are a senior engineer setting up the data and service layer for **RentStack**, a rent collection platform.

The frontend is already built in React and TailwindCSS with React Router and all pages are navigable.

**For now, everything is mocked. No real API calls. No backend server yet.** However, the code must be structured so that when we are ready to connect the real Nomba APIs and a real backend, the transition requires minimal changes — ideally just swapping out the mock service files for real ones without touching any page or component.

---

## ARCHITECTURE PATTERN

Use a **Service Layer pattern**. Every page and component fetches data by calling a service function — never by calling an API directly inline. This means when we switch to real APIs later, we only update the service files and nothing else changes.

Structure:

```
/src
  /services
    authService.js
    tenantService.js
    paymentService.js
    dashboardService.js
    reportService.js
    webhookService.js
  /mock
    mockData.js
    mockDelay.js
  /api
    apiClient.js        ← empty for now, ready for real API calls later
  /context
    AuthContext.jsx
    AppContext.jsx
```

---

## MOCK SETUP RULES

Create `/src/mock/mockDelay.js`:

- A simple utility that wraps every mock response in a `setTimeout` of 600–900ms to simulate real network latency
- This makes the UI feel realistic and forces loading states to be built properly

Create `/src/mock/mockData.js`:

- All mock data lives here in one place
- Data must be realistic — Nigerian names, Nigerian bank names (Wema Bank, Sterling Bank), real-looking account numbers, naira amounts, Lagos addresses
- Include enough records to make the UI look populated: at least 8 tenants, 30+ payment events across different states

---

## MOCK DATA TO GENERATE

**One landlord:**

```
name: Abdulwahab Yusuf
email: abdulwahab@rentstack.com
phone: 08031234567
property: Sunshine Court, 14 Admiralty Way, Lekki Phase 1, Lagos
rent per unit: ₦85,000/month
```

**8 tenants across different payment states:**

- 2 tenants — PAID (full payment received this cycle)
- 2 tenants — PARTIAL (paid between 40% and 80% of rent)
- 1 tenant — UNPAID (nothing received this cycle)
- 1 tenant — OVERPAID (paid more than rent due, credit carries forward)
- 1 tenant — DISPUTED (misdirected payment flagged)
- 1 tenant — CLOSED (former tenant, offboarded)

Each tenant must have:

- Realistic full name
- Unit number (e.g. Flat 3B)
- A fake but realistic-looking virtual account number (10 digits)
- Bank name (Wema Bank or Sterling Bank — these are common for virtual accounts in Nigeria)
- Account name matching tenant name
- Move-in date
- Payment history of at least 4 months

**Payment events:**

- Mix of single full payments, multiple partial transfers in one cycle, and one overpayment
- One misdirected payment with no matching tenant
- Timestamps spread across the last 4 months

---

## SERVICE FILES

Each service file exports async functions that return mock data wrapped in the mock delay. Add a clear comment above every function marking where the real API call will go later.

**authService.js**

```javascript
// MOCK: Replace with POST /api/auth/register when backend is ready
export async function register(data) {}

// MOCK: Replace with POST /api/auth/login when backend is ready
export async function login(email, password) {}

// MOCK: Replace with GET /api/auth/me when backend is ready
export async function getCurrentUser() {}

export async function logout() {}
```

**tenantService.js**

```javascript
// MOCK: Replace with GET /api/tenants when backend is ready
export async function getAllTenants() {}

// MOCK: Replace with GET /api/tenants/:id when backend is ready
export async function getTenantById(id) {}

// MOCK: Replace with POST /api/tenants when backend is ready
// This will also call Nomba Virtual Account API on the backend
export async function addTenant(data) {}

// MOCK: Replace with PUT /api/tenants/:id when backend is ready
export async function updateTenant(id, data) {}

// MOCK: Replace with POST /api/tenants/:id/offboard when backend is ready
export async function offboardTenant(id) {}

// MOCK: Replace with GET /api/tenants/:id/transactions when backend is ready
export async function getTenantPaymentHistory(id) {}

// MOCK: Simulates Nomba virtual account provisioning
// Returns a fake account number after a delay to mimic the real API call
export async function provisionVirtualAccount(tenantData) {}
```

**paymentService.js**

```javascript
// MOCK: Replace with GET /api/payments when backend is ready
export async function getAllPayments() {}

// MOCK: Replace with GET /api/payments/misdirected when backend is ready
export async function getMisdirectedPayments() {}

// MOCK: Replace with POST /api/payments/assign when backend is ready
export async function assignMisdirectedPayment(paymentId, tenantId) {}

// MOCK: Replace with POST /api/payments/return when backend is ready
// This will trigger Nomba Transfers API on the backend
export async function returnMisdirectedPayment(paymentId) {}
```

**dashboardService.js**

```javascript
// MOCK: Replace with GET /api/dashboard when backend is ready
export async function getDashboardStats() {}
```

**reportService.js**

```javascript
// MOCK: Replace with GET /api/reports when backend is ready
export async function getReports(dateRange) {}

// MOCK: Replace with GET /api/reports/export/csv when backend is ready
export async function exportCSV() {}
```

---

## API CLIENT (empty but ready)

Create `/src/api/apiClient.js`:

```javascript
// This file will be used when the real backend is ready.
// Set REACT_APP_API_URL in your .env file to point to your backend.
// All service files will import from here instead of using mock data.

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Attach JWT token to every request automatically
// Handles 401 by redirecting to login
```

Leave the implementation stubbed with comments. Do not implement it yet.

---

## ENV FILE

Create a `.env.example` at the root of `/client`:

```
# API URL — leave empty while using mock data
# Fill this in when the real backend is ready
REACT_APP_API_URL=

# Set to "true" to use real API, "false" to use mock data
REACT_APP_USE_MOCK=true
```

Create a `/src/config.js` file:

```javascript
export const USE_MOCK = process.env.REACT_APP_USE_MOCK === "true";
```

Every service file checks this flag at the top. When `USE_MOCK` is true it returns mock data. When false it calls the real API via `apiClient.js`. This means **switching from mock to real is a single `.env` change**.

---

## AUTH CONTEXT

Set up `AuthContext.jsx` with:

- `currentUser` state — populated from mock landlord data on load
- `login()`, `logout()`, `register()` functions that call `authService`
- Protected route wrapper that redirects to login if no user

---

## LOADING AND ERROR STATES

Every page must handle three states properly:

- **Loading** — show a simple skeleton loader or spinner while the service function is resolving. Use the mock delay so this is always visible and testable.
- **Success** — render the data
- **Error** — show a clean inline error message with a retry button

Build a reusable `useAsync` hook that handles this pattern so every page uses it consistently.

---

## WHAT SWITCHING TO REAL APIS LOOKS LIKE LATER

When the backend is ready, the only changes needed are:

1. Set `REACT_APP_USE_MOCK=false` in `.env`
2. Set `REACT_APP_API_URL=https://your-backend-url.com` in `.env`
3. Implement `apiClient.js`
4. In each service file, replace the mock return with a real `apiClient` call

No page components, no context files, no routing — nothing else changes.

---

That is the full mock setup. Build it so the app runs completely with realistic data today, and is ready to connect to real Nomba APIs tomorrow with a single environment variable change.

LANDING PAGE CONTENT & IMAGERY
Build a complete, content-rich landing page that tells the RentStack story. The page should feel like a real product landing page — not a placeholder. Use real copy, real sections, and real images pulled from the Unsplash API (free, no auth required for basic usage).
Unsplash image URL format — use this pattern:
Code
Use these specific curated images that match the product context:
Hero background person/scene: https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop
Nigerian city/real estate: https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop
Landlord at desk: https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80&auto=format&fit=crop
Payment/fintech: https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&auto=format&fit=crop
Tenant keys/housing: https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80&auto=format&fit=crop
LANDING PAGE SECTIONS
Section 1 — Hero
Full width, light background #FAFAF9. Two columns on desktop, single column on mobile.
Left column — copy:
Heading:
"Rent collection that actually works."
Subheading:
"RentStack gives every tenant a dedicated bank account number. Every payment is reconciled automatically. Every naira is accounted for — in real time."
Two buttons below:
"Get Started as a Landlord" — primary
"I'm a Tenant" — secondary
Small trust line below buttons:
"Built on Nomba payment infrastructure. Trusted by landlords across Lagos."
Right column — image:
Use the landlord at desk image. Display in a clean rounded-2xl overflow-hidden container. No border. No shadow heavier than shadow-sm.
Section 2 — The Problem We Are Solving
Background: #FFFFFF. Centered heading, then three problem cards in a row.
Section label above heading: "THE PROBLEM"
Heading: "Rent collection in Nigeria is broken."
Subtext: "Landlords are chasing payments on WhatsApp. Tenants are paying yearly upfront because they have no proof of reliability. The money moves but nothing is recorded."
Three problem cards — flat, border border-[#E2E8F0], rounded-xl, no shadow:
Card 1 — No Reconciliation
Image: payment/fintech image (cropped top, h-40 object-cover rounded-t-xl)
Title: "Landlords have no system"
Body: "When rent comes in — or doesn't — there is no automated record. Landlords manually match bank alerts to tenant names and still get it wrong. Partial payments disappear into ambiguity."
Card 2 — No Tenant Record
Image: tenant keys image
Title: "Tenants have nothing to show"
Body: "A tenant can pay rent faithfully for five years and have zero financial proof of it. No statement. No credit signal. No identity in the system. Their most consistent financial behaviour is completely invisible."
Card 3 — No Infrastructure
Image: Nigerian city image
Title: "The infrastructure gap"
Body: "No payment system in Nigeria assigns a unique, persistent account number to each tenant, reconciles transfers automatically, and produces clean records for both sides. Until now."
Section 3 — How RentStack Works
Background: #FAFAF9. Centered heading.
Section label: "HOW IT WORKS"
Heading: "Three steps. Fully automated."
Three steps in a row — numbered, flat design, no cards, just number + title + body:
Step 1 — Onboard your tenants
"Add each tenant to RentStack. Our system instantly generates a dedicated Nomba virtual account number for them — their own unique account tied to their identity and your property."
Step 2 — Tenants pay as normal
"Tenants transfer rent to their dedicated account number from any Nigerian bank. No app required on their end. No new behaviour. They pay exactly how they already do."
Step 3 — Everything reconciles automatically
"The moment a payment lands, RentStack captures it, matches it to the tenant, and updates your dashboard in real time. Partial payments, overpayments, multiple transfers — all handled. You do nothing."
Section 4 — What RentStack Handles
Background: #FFFFFF.
Section label: "RECONCILIATION ENGINE"
Heading: "Every scenario. Handled."
Subtext: "Most rent collection tools only work when everything goes right. RentStack is built for the real world."
Six scenario cards in a 2x3 grid — flat, border border-[#E2E8F0], rounded-xl p-6:
Full Payment — "Tenant pays the exact rent amount in one transfer. Instantly marked as Paid."
Partial Payment — "Tenant pays in instalments across multiple transfers. Each one is captured and aggregated until the full amount is reached."
Overpayment — "Tenant pays more than rent due. The excess is logged as a credit and automatically applied to next month."
Underpayment — "Tenant pays less than rent due. The outstanding balance is tracked and visible to both landlord and tenant."
Misdirected Payment — "Money lands on the wrong account. RentStack flags it immediately and gives the landlord a resolution flow."
Tenant Offboarding — "When a tenant leaves, their account is cleanly closed. Any late payment is caught and handled — nothing falls through."
Section 5 — For Landlords and Tenants
Background: #FAFAF9. Two columns side by side.
Left column — For Landlords
Image: landlord at desk (full width of column, rounded-xl, h-56 object-cover)
Below image:
Title: "Everything in one dashboard"
Body: "See every tenant's payment status at a glance. Know who has paid, who is short, and who owes — without making a single phone call. Export reports. Download statements. Run your properties like a business."
Right column — For Tenants
Image: tenant keys image
Below image:
Title: "Your rent history is now an asset"
Body: "Every payment you make is recorded, timestamped, and tied to your identity. Download your verified rent statement and share it with banks, employers, or future landlords. Your consistency finally counts for something."
Section 6 — Call to Action
Background: #0F172A (dark, same as sidebar). Centered. Full width.
Heading in white: "Start collecting rent the right way."
Subtext in #94A3B8: "Set up your property in minutes. Your tenants get their account numbers the same day."
One button: "Get Started" — primary style but on dark background so use bg-[#C9A84C] text-white
LANDING PAGE DESIGN RULES
No gradients anywhere — including the hero. Flat colors only.
Images must have object-cover and fixed heights to prevent layout shift.
All section headings centered on mobile, left-aligned on desktop where there is supporting content beside them.
Smooth scroll between sections.
Sticky navigation bar at the top: RentStack logo on left, "Landlord Login" and "Get Started" buttons on right.
The navbar background is #FFFFFF with border-b border-[#E2E8F0] and becomes sticky on scroll.
Mobile responsive — all multi-column layouts collapse to single column below md breakpoint.
No animations except transition-colors duration-200 on buttons and links.
This landing page should read like a real product that solves a real problem. The copy is the product story. The images make it feel grounded. Together they should make a judge or a landlord immediately understand what RentStack does and why it matters.

IMAGES THROUGHOUT THE APP
Images are not limited to the landing page. Use contextual imagery across the entire application to make it feel like a real, polished product. All images come from Unsplash using the same format:
Code
Follow these rules for every image in the app:
Always use object-cover with a fixed height
Never let an image stretch or distort
No borders or heavy shadows on images — rounded-xl and nothing else
Images are supporting context, not decoration — every image must relate to what is on screen
AUTH PAGES (Login & Sign Up)
Split the screen into two columns on desktop:
Left column — the form (white background, clean)
Right column — a full-height contextual image with a dark overlay bg-black/40 and a short quote or tagline on top of it in white text
Image for auth pages:
https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop
Quote on top of the image:
"Every naira, accounted for. Every tenant, on record."
On mobile, hide the right column entirely — form only.
DASHBOARD
Welcome banner at the top — full width, h-32, dark background #0F172A with the landlord's name and a short greeting. Place a faint low-opacity image behind the text as a texture:
https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80&auto=format&fit=crop
Apply opacity-10 to the image and overlay the text on top. Text stays sharp. Image just adds subtle depth without being a gradient.
TENANTS PAGE
Empty state — when no tenants have been added yet, show a centered illustration area with this image at w-48 h-48 rounded-full object-cover mx-auto opacity-60:
https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&q=80&auto=format&fit=crop
Below it: "No tenants yet. Add your first tenant to get started." with the "Add Tenant" button below.
Tenant cards — each tenant card has a small circular avatar at the top left. Since tenants won't have profile photos, generate a consistent avatar using:
Code
This gives every tenant a gold avatar with their initials — no random stock photos of people.
TENANT DETAIL PAGE
Page header — full width banner, h-40, background #0F172A, tenant name and unit overlaid in white. Same faint background texture as the dashboard welcome banner:
https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop
Image at opacity-10 behind the text.
Statements section — next to the Download Statement button, show this small contextual image in a rounded-lg h-24 w-full object-cover container:
https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80&auto=format&fit=crop
PAYMENTS PAGE
Misdirected payments empty state — when there are no misdirected payments, show a positive empty state with this image at w-40 h-40 rounded-full object-cover mx-auto opacity-60:
https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80&auto=format&fit=crop
Text below: "No misdirected payments. Everything is reconciled."
REPORTS PAGE
Page header banner — same treatment as dashboard and tenant detail. Full width h-32 dark banner with faint background image and "Reports & Analytics" title in white over it.
Image:
https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80&auto=format&fit=crop
SETTINGS PAGE
Profile section — next to the landlord's name and email fields, show their avatar generated from ui-avatars.com the same way as tenants:
Code
Dark background, white initials — matches the sidebar color for consistency.
TENANT PORTAL
Home page header — full width banner, h-40, dark background, tenant name overlaid. Same faint texture image approach.
Statement section — show this image as a contextual visual next to the download button:
https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80&auto=format&fit=crop
Caption below image in text-xs text-[#64748B]:
"Your statement is a verified record of every rent payment you have made. Share it with banks, employers, or future landlords."
EMPTY STATES (global rule)
Every empty state across the entire app — any page where there is no data yet — must have:
A contextual Unsplash image at w-40 h-40 rounded-full object-cover mx-auto opacity-60
A short, helpful message in text-sm text-[#64748B] text-center mt-4
A relevant action button below the message
Never show a blank white space when there is no data.
ONBOARDING (first time landlord setup)
The three-step onboarding flow should have a right-side panel on desktop that stays fixed while the form steps change on the left. The right panel shows:
A full-height image: https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80&auto=format&fit=crop
Dark overlay bg-black/50
On top of the overlay, show the current step's benefit text in white — changes as the user moves through steps:
Step 1: "Your property, set up in minutes."
Step 2: "Every tenant gets their own account number."
Step 3: "Payments reconcile themselves. You just watch."
GENERAL IMAGE RULES FOR THE WHOLE APP
Avatars for any person (landlord or tenant) always come from ui-avatars.com — never stock photos of people
Page header banners use dark backgrounds with faint opacity-10 texture images — never solid color blocks alone
Empty states always have an image — never just text
Images in cards are always object-cover with a fixed height, rounded-t-xl if at the top of a card or rounded-xl if standalone
Never use a photo of a person's face anywhere inside the app — only the landing page uses lifestyle photography and even there it is contextual, not portrait
This ensures the entire application feels visually rich and complete — not just the landing page.
