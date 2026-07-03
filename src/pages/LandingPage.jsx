import { Link } from "react-router-dom";

const IMG = {
  hero: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop",
  city: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop",
  landlord: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80&auto=format&fit=crop",
  fintech: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&auto=format&fit=crop",
  tenant: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80&auto=format&fit=crop",
};

const PROBLEM_CARDS = [
  {
    image: IMG.fintech,
    title: "Landlords have no system",
    body: "When rent comes in — or doesn't — there is no automated record. Landlords manually match bank alerts to tenant names and still get it wrong. Partial payments disappear into ambiguity.",
  },
  {
    image: IMG.tenant,
    title: "Tenants have nothing to show",
    body: "A tenant can pay rent faithfully for five years and have zero financial proof of it. No statement. No credit signal. No identity in the system. Their most consistent financial behaviour is completely invisible.",
  },
  {
    image: IMG.city,
    title: "The infrastructure gap",
    body: "No payment system in Nigeria assigns a unique, persistent account number to each tenant, reconciles transfers automatically, and produces clean records for both sides. Until now.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Onboard your tenants",
    body: "Add each tenant to RentStack. Our system instantly generates a dedicated Nomba virtual account number for them — their own unique account tied to their identity and your property.",
  },
  {
    n: "02",
    title: "Tenants pay as normal",
    body: "Tenants transfer rent to their dedicated account number from any Nigerian bank. No app required on their end. No new behaviour. They pay exactly how they already do.",
  },
  {
    n: "03",
    title: "Everything reconciles automatically",
    body: "The moment a payment lands, RentStack captures it, matches it to the tenant, and updates your dashboard in real time. Partial payments, overpayments, multiple transfers — all handled. You do nothing.",
  },
];

const SCENARIOS = [
  { title: "Full Payment", body: "Tenant pays the exact rent amount in one transfer. Instantly marked as Paid." },
  { title: "Partial Payment", body: "Tenant pays in instalments across multiple transfers. Each one is captured and aggregated until the full amount is reached." },
  { title: "Overpayment", body: "Tenant pays more than rent due. The excess is logged as a credit and automatically applied to next month." },
  { title: "Underpayment", body: "Tenant pays less than rent due. The outstanding balance is tracked and visible to both landlord and tenant." },
  { title: "Misdirected Payment", body: "Money lands on the wrong account. RentStack flags it immediately and gives the landlord a resolution flow." },
  { title: "Tenant Offboarding", body: "When a tenant leaves, their account is cleanly closed. Any late payment is caught and handled — nothing falls through." },
];

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold tracking-[0.15em] text-[#C9A84C] text-center">{children}</p>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-semibold text-[#0F172A] text-lg tracking-tight">RentStack</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-[#0F172A] px-4 py-2 rounded-lg border border-[#E2E8F0] hover:bg-[#FAFAF9] transition-colors duration-200"
            >
              Landlord Login
            </Link>
            <Link
              to="/register"
              className="text-sm bg-[#0F172A] text-white px-4 py-2 rounded-lg hover:bg-[#1E293B] transition-colors duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] leading-[1.1] tracking-tight">
              Rent collection that actually works.
            </h1>
            <p className="mt-6 text-lg text-[#475569] leading-relaxed max-w-xl mx-auto md:mx-0">
              RentStack gives every tenant a dedicated bank account number. Every payment is reconciled automatically. Every naira is accounted for — in real time.
            </p>
            <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-3">
              <Link
                to="/register"
                className="bg-[#0F172A] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#1E293B] transition-colors duration-200"
              >
                Get Started as a Landlord
              </Link>
              <Link
                to="/tenant-portal"
                className="border border-[#E2E8F0] bg-white text-[#0F172A] px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#FAFAF9] transition-colors duration-200"
              >
                I'm a Tenant
              </Link>
            </div>
            <p className="mt-6 text-xs text-[#94A3B8]">
              Built on Nomba payment infrastructure. Trusted by landlords across Lagos.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <img
              src={IMG.landlord}
              alt="Landlord reviewing rent payments at his desk"
              className="w-full h-72 md:h-96 object-cover"
            />
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>THE PROBLEM</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#0F172A] text-center">
            Rent collection in Nigeria is broken.
          </h2>
          <p className="mt-4 text-[#475569] text-center max-w-2xl mx-auto leading-relaxed">
            Landlords are chasing payments on WhatsApp. Tenants are paying yearly upfront because they have no proof of reliability. The money moves but nothing is recorded.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {PROBLEM_CARDS.map(({ image, title, body }) => (
              <div key={title} className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <img src={image} alt={title} className="w-full h-40 object-cover rounded-t-xl" />
                <div className="p-6">
                  <h3 className="font-semibold text-[#0F172A]">{title}</h3>
                  <p className="mt-2 text-sm text-[#475569] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#FAFAF9] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>HOW IT WORKS</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#0F172A] text-center">
            Three steps. Fully automated.
          </h2>
          <div className="mt-14 grid md:grid-cols-3 gap-10">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="text-center md:text-left">
                <span className="text-sm font-semibold text-[#C9A84C]">{n}</span>
                <h3 className="mt-2 font-semibold text-[#0F172A] text-lg">{title}</h3>
                <p className="mt-2 text-sm text-[#475569] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reconciliation Engine */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>RECONCILIATION ENGINE</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#0F172A] text-center">Every scenario. Handled.</h2>
          <p className="mt-4 text-[#475569] text-center max-w-xl mx-auto leading-relaxed">
            Most rent collection tools only work when everything goes right. RentStack is built for the real world.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SCENARIOS.map(({ title, body }) => (
              <div key={title} className="border border-[#E2E8F0] rounded-xl p-6">
                <h3 className="font-semibold text-[#0F172A]">{title}</h3>
                <p className="mt-2 text-sm text-[#475569] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Landlords and Tenants */}
      <section className="bg-[#FAFAF9] py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10">
          <div className="text-center md:text-left">
            <img
              src={IMG.landlord}
              alt="Landlord managing properties from a dashboard"
              className="w-full h-56 object-cover rounded-xl"
            />
            <h3 className="mt-6 text-xl font-bold text-[#0F172A]">Everything in one dashboard</h3>
            <p className="mt-2 text-sm text-[#475569] leading-relaxed">
              See every tenant's payment status at a glance. Know who has paid, who is short, and who owes — without making a single phone call. Export reports. Download statements. Run your properties like a business.
            </p>
          </div>
          <div className="text-center md:text-left">
            <img
              src={IMG.tenant}
              alt="Tenant holding keys to a new home"
              className="w-full h-56 object-cover rounded-xl"
            />
            <h3 className="mt-6 text-xl font-bold text-[#0F172A]">Your rent history is now an asset</h3>
            <p className="mt-2 text-sm text-[#475569] leading-relaxed">
              Every payment you make is recorded, timestamped, and tied to your identity. Download your verified rent statement and share it with banks, employers, or future landlords. Your consistency finally counts for something.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F172A] py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Start collecting rent the right way.</h2>
          <p className="mt-4 text-[#94A3B8]">
            Set up your property in minutes. Your tenants get their account numbers the same day.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-block bg-[#C9A84C] text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-[#b8963e] transition-colors duration-200"
          >
            Get Started
          </Link>
        </div>
      </section>

      <footer className="bg-[#0F172A] border-t border-white/10 py-6 text-center">
        <p className="text-xs text-[#64748B]">
          © {new Date().getFullYear()} RentStack. Built on Nomba infrastructure.
        </p>
      </footer>
    </div>
  );
}
