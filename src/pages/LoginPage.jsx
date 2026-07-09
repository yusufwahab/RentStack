import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../config";
import Icon from "../components/ui/Icon";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
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
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[#0B1F17] font-bold text-lg tracking-tight hover:text-[#15803D] transition-colors duration-200"
          >
            <Icon name="arrowLeft" className="w-4 h-4" />
            RentStack
          </Link>
          <h1 className="mt-8 text-2xl font-bold text-[#0B1F17]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#64748B]">Sign in to your landlord account</p>

          {error && <p className="mt-4 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0B1F17] mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="abdulwahab@rentstack.com"
                className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B1F17] mb-1">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#15803D] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#64748B]">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#15803D] font-medium hover:underline">Get started</Link>
          </p>
          {USE_MOCK && <p className="mt-2 text-xs text-[#94A3B8]">Demo mode: enter any email and password to sign in.</p>}
        </div>
      </div>

      {/* Right — Image */}
      <div className="hidden md:flex flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-end p-12">
          <p className="text-white text-2xl font-semibold leading-snug max-w-xs">
            "Every naira, accounted for. Every tenant, on record."
          </p>
        </div>
      </div>
    </div>
  );
}
