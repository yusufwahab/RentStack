import { useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { getAllProperties, addProperty, deleteProperty } from "../../services/propertyService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";

const EMPTY_STATE_IMAGE = "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&q=80&auto=format&fit=crop";

function AddPropertyModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const property = await addProperty(form);
      onAdded(property);
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
          <h2 className="font-semibold text-[#0B1F17]">Add Property</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0B1F17] transition-colors duration-200">
            Close
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: "name", label: "Property Name", placeholder: "Sunshine Court" },
            { key: "address", label: "Address", placeholder: "14 Admiralty Way, Lekki Phase 1, Lagos" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#0B1F17] mb-1">{label}</label>
              <input
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
            {loading ? "Saving…" : "Add Property"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const { data: properties, loading, error, retry } = useAsync(getAllProperties);
  const [list, setList] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const source = list ?? properties ?? [];

  async function handleDelete(id) {
    setDeleteError("");
    setDeletingId(id);
    try {
      await deleteProperty(id);
      setList((prev) => (prev ?? properties ?? []).filter((p) => p.id !== id));
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#0B1F17]">Properties</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#15803D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200"
        >
          <Icon name="plus" className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">{deleteError}</p>
      )}

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={retry} />}

      {!loading && !error && source.length === 0 && (
        <EmptyState
          image={EMPTY_STATE_IMAGE}
          message="No properties yet. Add your first property to get started."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#15803D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200"
            >
              Add Property
            </button>
          }
        />
      )}

      {!loading && source.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {source.map((p) => (
            <div key={p.id} className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#F7FAF8] flex items-center justify-center shrink-0">
                  <Icon name="buildingOffice" className="w-5 h-5 text-[#15803D]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[#0B1F17] text-sm truncate">{p.name}</p>
                  <p className="text-xs text-[#64748B] truncate">{p.address}</p>
                </div>
              </div>
              <div className="border-t border-[#F1F5F9] pt-3 flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm font-bold text-[#0B1F17]">{p.totalUnits}</p>
                    <p className="text-xs text-[#64748B]">Total Units</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#15803D]">{p.occupiedUnits}</p>
                    <p className="text-xs text-[#64748B]">Occupied</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id || p.totalUnits > 0}
                  title={p.totalUnits > 0 ? "Move or offboard its tenants first" : "Delete property"}
                  className="text-xs text-[#94A3B8] hover:text-red-600 transition-colors duration-200 disabled:opacity-40 disabled:hover:text-[#94A3B8]"
                >
                  {deletingId === p.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddPropertyModal
          onClose={() => setShowModal(false)}
          onAdded={(p) => setList((prev) => [...(prev ?? properties ?? []), p])}
        />
      )}
    </div>
  );
}
