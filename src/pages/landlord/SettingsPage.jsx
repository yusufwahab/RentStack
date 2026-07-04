import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../../components/ui/Avatar";

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    propertyName: currentUser?.property?.name || "",
    propertyAddress: currentUser?.property?.address || "",
  });
  const [rentPerUnit, setRentPerUnit] = useState(currentUser?.rentPerUnit || 85000);
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-[#0B1F17] mb-6">Settings</h1>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={form.name || "R S"} bg="0B1F17" color="ffffff" className="w-14 h-14" />
          <div>
            <p className="font-semibold text-[#0B1F17]">{form.name}</p>
            <p className="text-sm text-[#64748B]">{form.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {[
            { key: "name", label: "Full Name" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Phone" },
            { key: "propertyName", label: "Property Name" },
            { key: "propertyAddress", label: "Property Address" },
          ].map(({ key, label, type = "text" }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-[#0B1F17] mb-1">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>
          ))}
          <button
            type="submit"
            className="bg-[#15803D] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200"
          >
            {saved ? "Saved" : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-[#0B1F17] mb-1">Rent Per Unit</h2>
        <p className="text-sm text-[#64748B] mb-4">Default rent amount charged per unit per month.</p>
        <div className="flex items-center gap-3">
          <span className="text-[#64748B] text-sm">₦</span>
          <input
            type="number"
            value={rentPerUnit}
            onChange={(e) => setRentPerUnit(Number(e.target.value))}
            className="border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
          />
        </div>
      </div>
    </div>
  );
}
