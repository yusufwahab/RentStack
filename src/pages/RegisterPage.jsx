import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STEPS = ["Property Details", "Account Setup", "Done"];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyName: "",
    propertyAddress: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const stepBenefits = [
    "Your property, set up in minutes.",
    "Every tenant gets their own account number.",
    "Payments reconcile themselves. You just watch.",
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (step < 1) { setStep(step + 1); return; }
    setError("");
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        property: { name: form.propertyName, address: form.propertyAddress },
      });
      setStep(2);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 bg-white">
        <div className="max-w-sm w-full mx-auto">
          <Link to="/" className="text-[#0B1F17] font-bold text-lg tracking-tight">RentStack</Link>

          <div className="mt-6 flex gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= step ? "bg-[#15803D]" : "bg-[#E5E7EB]"}`} />
            ))}
          </div>
          <p className="mt-3 text-xs text-[#64748B]">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

          <h1 className="mt-4 text-2xl font-bold text-[#0B1F17]">
            {step === 2 ? "You're all set!" : "Create your account"}
          </h1>

          {step === 2 ? (
            <p className="mt-3 text-sm text-[#475569]">Redirecting you to your dashboard…</p>
          ) : (
            <>
              {error && <p className="mt-4 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {step === 0 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#0B1F17] mb-1">Full Name</label>
                      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Abdulwahab Yusuf"
                        className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0B1F17] mb-1">Property Name</label>
                      <input required value={form.propertyName} onChange={(e) => setForm({ ...form, propertyName: e.target.value })}
                        placeholder="Sunshine Court"
                        className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0B1F17] mb-1">Property Address</label>
                      <input required value={form.propertyAddress} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                        placeholder="14 Admiralty Way, Lekki Phase 1, Lagos"
                        className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0B1F17] mb-1">Phone</label>
                      <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="08031234567"
                        className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40" />
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#0B1F17] mb-1">Email</label>
                      <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0B1F17] mb-1">Password</label>
                      <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40" />
                    </div>
                  </>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-[#15803D] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60">
                  {loading ? "Creating account…" : step === 1 ? "Create Account" : "Continue"}
                </button>
              </form>
              <p className="mt-6 text-sm text-[#64748B]">
                Already have an account?{" "}
                <Link to="/login" className="text-[#15803D] font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right — Image */}
      <div className="hidden md:flex flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-end p-12">
          <p className="text-white text-2xl font-semibold leading-snug max-w-xs">
            {stepBenefits[step]}
          </p>
        </div>
      </div>
    </div>
  );
}
