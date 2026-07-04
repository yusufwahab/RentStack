import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import Avatar from "../components/ui/Avatar";

const IMG = {
  hero: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop",
  city: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop",
  landlord: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1000&q=80&auto=format&fit=crop",
  fintech: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&auto=format&fit=crop",
  tenant: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80&auto=format&fit=crop",
  houseMinimal: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80&auto=format&fit=crop",
  houseVilla: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80&auto=format&fit=crop",
  houseNight: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop",
  houseCabin: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&q=80&auto=format&fit=crop",
};

const FEATURED_PROPERTIES = [
  {
    image: IMG.houseMinimal,
    type: "Detached House",
    benefit: "One dedicated virtual account per tenant, reconciled automatically.",
  },
  {
    image: IMG.houseVilla,
    type: "Luxury Duplex",
    benefit: "Full payments, partial payments, and overpayments — all tracked without a phone call.",
  },
  {
    image: IMG.houseNight,
    type: "Family Home",
    benefit: "A verified rent statement for every tenant, ready to download any time.",
  },
  {
    image: IMG.houseCabin,
    type: "Self-Contained Units",
    benefit: "Every tenant onboarded in minutes — no new behaviour required on their end.",
  },
];

const NAV_LINKS = [
  { to: "#how-it-works", label: "How It Works" },
  { to: "#scenarios", label: "Reconciliation" },
  { to: "#properties", label: "Properties" },
  { to: "#testimonials", label: "Landlords" },
];

const SCENARIOS = [
  { icon: "checkCircle", title: "Full Payment", tag: "Instant" },
  { icon: "arrowsRightLeft", title: "Partial Payment", tag: "Aggregated" },
  { icon: "banknote", title: "Overpayment", tag: "Credited" },
  { icon: "scaleBalance", title: "Underpayment", tag: "Tracked" },
  { icon: "exclamation", title: "Misdirected", tag: "Flagged" },
  { icon: "userMinus", title: "Offboarding", tag: "Closed" },
];

const PROBLEM_CARDS = [
  {
    tag: "Problem 01",
    image: IMG.fintech,
    title: "Landlords have no system",
    body: "When rent comes in — or doesn't — there is no automated record. Landlords manually match bank alerts to tenant names and still get it wrong. Partial payments disappear into ambiguity.",
  },
  {
    tag: "Problem 02",
    image: IMG.tenant,
    title: "Tenants have nothing to show",
    body: "A tenant can pay rent faithfully for five years and have zero financial proof of it. No statement. No credit signal. No identity in the system.",
  },
  {
    tag: "Problem 03",
    image: IMG.city,
    title: "The infrastructure gap",
    body: "No payment system in Nigeria assigns a unique, persistent account number to each tenant and reconciles transfers automatically for both sides. Until now.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Onboard your tenants",
    body: "Add each tenant to RentStack. Our system instantly generates a dedicated Nomba virtual account number for them — their own unique account tied to their identity and your property.",
  },
  {
    n: "2",
    title: "Tenants pay as normal",
    body: "Tenants transfer rent to their dedicated account number from any Nigerian bank. No app required on their end. No new behaviour. They pay exactly how they already do.",
  },
  {
    n: "3",
    title: "Everything reconciles automatically",
    body: "The moment a payment lands, RentStack captures it, matches it to the tenant, and updates your dashboard in real time. You do nothing.",
  },
];

const WHY_TILES = [
  { icon: "shieldCheck", title: "Verified Reconciliation", body: "Every transfer is matched and confirmed automatically — nothing is taken on trust." },
  { icon: "buildingOffice", title: "Nomba-Powered", body: "Built on regulated Nigerian payment infrastructure, not spreadsheets and WhatsApp." },
  { icon: "banknote", title: "Dedicated Accounts", body: "Each tenant gets their own persistent virtual account tied to your property." },
  { icon: "checkCircle", title: "Simple to Adopt", body: "Onboard in minutes. Tenants pay exactly how they already do — no new behaviour." },
];

const TESTIMONIALS = [
  {
    name: "Chidinma Adeyemi",
    location: "Landlord, Lekki",
    quote: "I used to reconcile alerts against a WhatsApp chat every month. Now I open one dashboard and I know exactly who's paid.",
  },
  {
    name: "Tunde Okonjo",
    location: "Landlord, Ikeja",
    quote: "A tenant tried to dispute a payment date last year. This year I just sent them their statement. That alone paid for itself.",
  },
  {
    name: "Grace Eze",
    location: "Landlord, Yaba",
    quote: "Partial payments used to be a headache to track by hand. RentStack aggregates them automatically and tells me the balance.",
  },
];

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold tracking-[0.15em] text-[#15803D] text-center">{children}</p>;
}

export default function LandingPage() {
  const [lookup, setLookup] = useState("");
  const navigate = useNavigate();

  function handleLookup(e) {
    e.preventDefault();
    navigate(lookup.trim() ? `/tenant-portal?account=${encodeURIComponent(lookup.trim())}` : "/tenant-portal");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="hidden md:flex items-center justify-between px-6 py-2 text-xs text-[#64748B] border-b border-[#E5E7EB]">
        <span>Lagos, Nigeria</span>
        <span>support@rentstack.com · +234 800 123 4567</span>
      </div>

      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#15803D] flex items-center justify-center text-white">
              <Icon name="buildingOffice" className="w-4 h-4" />
            </span>
            <span className="font-semibold text-[#0B1F17] text-lg tracking-tight">RentStack</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.to} href={l.to} className="text-sm text-[#334155] hover:text-[#15803D] transition-colors duration-200">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:inline text-sm text-[#0B1F17] hover:text-[#15803D] transition-colors duration-200">
              Landlord Login
            </Link>
            <Link
              to="/register"
              className="text-sm bg-[#15803D] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#116932] transition-colors duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — image bleeds to the viewport edge, same treatment as the reference */}
      <section className="bg-white overflow-hidden">
        <div className="grid md:grid-cols-2 items-center">
          <div className="text-center md:text-left px-6 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] md:pr-6 pt-14 md:pt-20 pb-10 md:pb-16">
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              <span className="text-[#0B1F17]">Rent collection</span>
              <br />
              <span className="text-[#15803D]">that actually works.</span>
            </h1>
            <p className="mt-6 text-lg text-[#475569] leading-relaxed max-w-xl mx-auto md:mx-0">
              RentStack gives every tenant a dedicated bank account number. Every payment is reconciled automatically. Every naira is accounted for — in real time.
            </p>
            <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-3">
              <Link
                to="/register"
                className="bg-[#15803D] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#116932] transition-colors duration-200"
              >
                Get Started as a Landlord
              </Link>
              <Link
                to="/tenant-portal"
                className="border border-[#E5E7EB] bg-white text-[#0B1F17] px-6 py-3 rounded-full text-sm font-medium hover:bg-[#F7FAF8] transition-colors duration-200"
              >
                I'm a Tenant
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center md:justify-start gap-3">
              <div className="flex -space-x-2">
                {["Chidinma Adeyemi", "Tunde Okonjo", "Grace Eze"].map((n) => (
                  <Avatar key={n} name={n} className="w-8 h-8 border-2 border-white" bg="15803D" />
                ))}
                <span className="w-8 h-8 rounded-full border-2 border-white bg-[#ECFDF3] text-[#15803D] text-xs font-semibold flex items-center justify-center">
                  +9
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Built on Nomba payment infrastructure.
                <br />
                Trusted by landlords across Lagos.
              </p>
            </div>
          </div>
          <div className="relative h-72 md:h-[480px]">
            <img
              src={IMG.landlord}
              alt="Landlord reviewing rent payments at his desk"
              className="absolute inset-0 w-full h-full object-cover md:rounded-l-[2rem] rounded-2xl md:rounded-r-none"
            />
            <div className="hidden sm:flex absolute -bottom-6 left-6 md:left-10 bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-4 items-center gap-3 max-w-[240px]">
              <Avatar name="Chiamaka Eze" className="w-10 h-10" bg="15803D" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0B1F17] truncate">Chiamaka Eze · Flat 1A</p>
                <p className="text-xs text-[#15803D] font-medium flex items-center gap-1 mt-0.5">
                  <Icon name="checkCircle" className="w-3.5 h-3.5" /> Paid ₦85,000
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick lookup bar, overlapping the section boundary */}
        <div className="max-w-4xl mx-auto px-6 mt-16 md:mt-20 md:-mb-10 relative z-10">
          <form
            onSubmit={handleLookup}
            className="bg-white border border-[#E5E7EB] shadow-lg rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch"
          >
            <div className="flex-1 flex items-center gap-2 px-3">
              <Icon name="search" className="w-4 h-4 text-[#94A3B8] shrink-0" />
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="Enter your tenant account number to check rent status"
                className="w-full py-2 text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#15803D] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#116932] transition-colors duration-200 whitespace-nowrap"
            >
              Check Status
            </button>
          </form>
        </div>
      </section>

      {/* Scenarios strip */}
      <section id="scenarios" className="bg-[#F7FAF8] pt-20 md:pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-[#0B1F17]">Every scenario, handled</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SCENARIOS.map((s) => (
              <div
                key={s.title}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 text-center hover:shadow-md hover:border-[#15803D]/30 transition-shadow duration-200"
              >
                <span className="inline-flex w-11 h-11 rounded-full bg-[#ECFDF3] text-[#15803D] items-center justify-center mb-3">
                  <Icon name={s.icon} className="w-5 h-5" />
                </span>
                <p className="text-sm font-medium text-[#0B1F17]">{s.title}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{s.tag}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties — showcasing the kinds of properties RentStack is built for */}
      <section id="properties" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <SectionLabel>PROPERTIES ON RENTSTACK</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold text-[#0B1F17]">Built for properties like yours.</h2>
            </div>
            <Link
              to="/register"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#15803D] hover:text-[#116932] transition-colors duration-200 whitespace-nowrap"
            >
              Add your property <Icon name="arrowRight" className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-[#475569] max-w-2xl leading-relaxed mb-10">
            From a single duplex to a multi-unit compound, every property gets the same infrastructure: a dedicated account per tenant, automatic reconciliation, and a clean record for every payment.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED_PROPERTIES.map(({ image, type, benefit }) => (
              <Link
                key={type}
                to="/register"
                className="group border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="relative">
                  <img src={image} alt={type} className="w-full h-44 object-cover" />
                  <span className="absolute top-3 left-3 bg-white/95 text-[#15803D] text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                    On RentStack
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-[#0B1F17] text-sm">{type}</h3>
                  <p className="mt-2 text-xs text-[#64748B] leading-relaxed">{benefit}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="bg-[#F7FAF8] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>THE PROBLEM</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#0B1F17] text-center">Rent collection in Nigeria is broken.</h2>
          <p className="mt-4 text-[#475569] text-center max-w-2xl mx-auto leading-relaxed">
            Landlords are chasing payments on WhatsApp. Tenants are paying yearly upfront because they have no proof of reliability. The money moves but nothing is recorded.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {PROBLEM_CARDS.map(({ tag, image, title, body }) => (
              <div
                key={title}
                className="border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="relative">
                  <img src={image} alt={title} className="w-full h-40 object-cover" />
                  <span className="absolute top-3 left-3 bg-white/95 text-[#0B1F17] text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                    {tag}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-[#0B1F17]">{title}</h3>
                  <p className="mt-2 text-sm text-[#475569] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>HOW IT WORKS</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#0B1F17] text-center">Three steps. Fully automated.</h2>
          <div className="mt-14 grid md:grid-cols-3 gap-10">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="text-center md:text-left">
                <span className="inline-flex w-10 h-10 rounded-full bg-[#15803D] text-white items-center justify-center font-semibold">
                  {n}
                </span>
                <h3 className="mt-4 font-semibold text-[#0B1F17] text-lg">{title}</h3>
                <p className="mt-2 text-sm text-[#475569] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose RentStack */}
      <section className="bg-[#F7FAF8] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#0B1F17] text-center mb-12">Why landlords choose RentStack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {WHY_TILES.map(({ icon, title, body }) => (
              <div key={title} className="text-center">
                <span className="inline-flex w-14 h-14 rounded-full bg-[#ECFDF3] text-[#15803D] items-center justify-center mb-4">
                  <Icon name={icon} className="w-6 h-6" />
                </span>
                <h3 className="font-semibold text-[#0B1F17] text-sm">{title}</h3>
                <p className="mt-2 text-xs text-[#64748B] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Landlords and Tenants */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10">
          <div className="text-center md:text-left">
            <img src={IMG.landlord} alt="Landlord managing properties from a dashboard" className="w-full h-56 object-cover rounded-2xl" />
            <h3 className="mt-6 text-xl font-bold text-[#0B1F17]">Everything in one dashboard</h3>
            <p className="mt-2 text-sm text-[#475569] leading-relaxed">
              See every tenant's payment status at a glance. Know who has paid, who is short, and who owes — without making a single phone call.
            </p>
          </div>
          <div className="text-center md:text-left">
            <img src={IMG.tenant} alt="Tenant holding keys to a new home" className="w-full h-56 object-cover rounded-2xl" />
            <h3 className="mt-6 text-xl font-bold text-[#0B1F17]">Your rent history is now an asset</h3>
            <p className="mt-2 text-sm text-[#475569] leading-relaxed">
              Every payment you make is recorded, timestamped, and tied to your identity. Download your verified rent statement any time.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-[#F7FAF8] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>LANDLORDS ON RENTSTACK</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#0B1F17] text-center mb-12">What our landlords say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                <Icon name="quote" className="w-6 h-6 text-[#ECFDF3] fill-current" />
                <p className="mt-3 text-sm text-[#334155] leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <Avatar name={t.name} className="w-9 h-9" bg="15803D" />
                  <div>
                    <p className="text-sm font-medium text-[#0B1F17]">{t.name}</p>
                    <p className="text-xs text-[#64748B]">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-2xl overflow-hidden bg-[#0B1F17] grid md:grid-cols-2">
            <div className="relative hidden md:block h-full min-h-[260px]">
              <img src={IMG.landlord} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
            </div>
            <div className="p-10 md:p-12 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white">Start collecting rent the right way.</h2>
              <p className="mt-4 text-[#94A3B8] max-w-md mx-auto md:mx-0">
                Set up your property in minutes. Your tenants get their account numbers the same day.
              </p>
              <Link
                to="/register"
                className="mt-8 inline-block bg-[#15803D] text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-[#1a9548] transition-colors duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1F17] pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#15803D] flex items-center justify-center text-white">
                <Icon name="buildingOffice" className="w-4 h-4" />
              </span>
              <span className="font-semibold text-white text-lg">RentStack</span>
            </div>
            <p className="mt-3 text-sm text-[#94A3B8] leading-relaxed">
              Rent collection infrastructure for Nigerian landlords, built on Nomba.
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li><Link to="/dashboard" className="hover:text-white transition-colors duration-200">Dashboard</Link></li>
              <li><Link to="/tenants" className="hover:text-white transition-colors duration-200">Tenants</Link></li>
              <li><Link to="/payments" className="hover:text-white transition-colors duration-200">Payments</Link></li>
              <li><Link to="/reports" className="hover:text-white transition-colors duration-200">Reports</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li><Link to="/register" className="hover:text-white transition-colors duration-200">Get Started</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors duration-200">Landlord Login</Link></li>
              <li><Link to="/tenant-portal" className="hover:text-white transition-colors duration-200">Tenant Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-[#94A3B8]">
              <li>support@rentstack.com</li>
              <li>+234 800 123 4567</li>
              <li>Lagos, Nigeria</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-12 pt-6 border-t border-white/10">
          <p className="text-xs text-[#64748B]">© {new Date().getFullYear()} RentStack. Built on Nomba infrastructure.</p>
        </div>
      </footer>
    </div>
  );
}
