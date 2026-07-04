import { useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getAllTenants, addTenant } from "../../services/tenantService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { formatNaira } from "../../utils/format";

const EMPTY_STATE_IMAGE = "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&q=80&auto=format&fit=crop";

function AddTenantModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: "", unit: "", email: "", phone: "", moveInDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const tenant = await addTenant(form);
      onAdded(tenant);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[#0B1F17]">Add New Tenant</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0B1F17] transition-colors duration-200">
            Close
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: "name", label: "Full Name", placeholder: "Chiamaka Eze" },
            { key: "unit", label: "Unit", placeholder: "Flat 5A" },
            { key: "email", label: "Email", placeholder: "tenant@gmail.com", type: "email" },
            { key: "phone", label: "Phone", placeholder: "08012345678" },
            { key: "moveInDate", label: "Move-in Date", type: "date" },
          ].map(({ key, label, placeholder, type = "text" }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#0B1F17] mb-1">{label}</label>
              <input
                type={type}
                required
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#15803D] text-white py-2.5 rounded-lg text-sm font-medium mt-2 hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60"
          >
            {loading ? "Provisioning virtual account…" : "Add Tenant"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const { data: tenants, loading, error, retry } = useAsync(getAllTenants);
  const [list, setList] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const source = list ?? tenants ?? [];
  const displayed = source.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.unit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#0B1F17]">Tenants</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#15803D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200"
        >
          <Icon name="plus" className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      {tenants && tenants.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or unit…"
          className="w-full md:w-72 border border-[#E5E7EB] rounded-lg px-4 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
        />
      )}

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={retry} />}

      {!loading && !error && source.length === 0 && (
        <EmptyState
          image={EMPTY_STATE_IMAGE}
          message="No tenants yet. Add your first tenant to get started."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#15803D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200"
            >
              Add Tenant
            </button>
          }
        />
      )}

      {!loading && !error && source.length > 0 && displayed.length === 0 && (
        <p className="text-sm text-[#64748B] text-center py-16">No tenants match "{search}".</p>
      )}

      {!loading && displayed.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((t) => (
            <Link
              key={t.id}
              to={`/tenants/${t.id}`}
              className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 hover:border-[#15803D] transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={t.name} className="w-9 h-9" />
                <div className="min-w-0">
                  <p className="font-medium text-[#0B1F17] text-sm truncate">{t.name}</p>
                  <p className="text-xs text-[#64748B]">{t.unit}</p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={t.status} />
                </div>
              </div>
              <div className="border-t border-[#F1F5F9] pt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Account</span>
                  <span className="text-[#0B1F17] font-mono">{t.virtualAccountNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Bank</span>
                  <span className="text-[#0B1F17]">{t.bankName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Paid this cycle</span>
                  <span className="text-[#0B1F17] font-medium">{formatNaira(t.currentCycle.paid)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <AddTenantModal
          onClose={() => setShowModal(false)}
          onAdded={(t) => setList((prev) => [...(prev ?? tenants ?? []), t])}
        />
      )}
    </div>
  );
}
