const STATUS_STYLES = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  UNPAID: "bg-red-50 text-red-600 border-red-200",
  OVERPAID: "bg-blue-50 text-blue-700 border-blue-200",
  DISPUTED: "bg-orange-50 text-orange-700 border-orange-200",
  CLOSED: "bg-[#F1F5F9] text-[#64748B] border-[#E5E7EB]",
  UNRESOLVED: "bg-orange-50 text-orange-700 border-orange-200",
  RETURNED: "bg-[#F1F5F9] text-[#64748B] border-[#E5E7EB]",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-50 text-red-600 border-red-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-red-50 text-red-600 border-red-200",
};

export default function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${
        STATUS_STYLES[status] || "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      {label || status}
    </span>
  );
}
