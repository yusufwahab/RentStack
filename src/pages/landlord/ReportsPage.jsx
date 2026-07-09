import { useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { getReports, exportCSV } from "../../services/reportService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import PageBanner from "../../components/ui/PageBanner";
import Icon from "../../components/ui/Icon";
import { formatNaira, formatDate, paymentTypeBadge } from "../../utils/format";

const BANNER_IMAGE = "https://images.unsplash.com/photo-1644043350898-2f4ff1e17912?w=1200&q=80&auto=format&fit=crop";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const { data, loading, error, retry } = useAsync(() => getReports(dateRange), [dateRange.from, dateRange.to]);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportCSV();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rentstack-report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageBanner image={BANNER_IMAGE} height="h-32" title="Reports & Analytics" subtitle="Full payment history and collection summaries" />

      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 border border-[#E5E7EB] text-[#0B1F17] px-4 py-2 rounded-lg text-sm hover:bg-[#F7FAF8] transition-colors duration-200 disabled:opacity-60"
          >
            <Icon name="download" className="w-4 h-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>

        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={retry} />}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
                <p className="text-xs text-[#64748B] mb-1">Total Collected</p>
                <p className="text-2xl font-bold text-[#0B1F17]">{formatNaira(data.totalCollected)}</p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
                <p className="text-xs text-[#64748B] mb-1">Transactions</p>
                <p className="text-2xl font-bold text-[#0B1F17]">{data.payments.length}</p>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden overflow-x-auto mb-8">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="font-semibold text-[#0B1F17] text-sm">Monthly Collection</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F7FAF8]">
                    {["Month", "Expected", "Collected", "Rate"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#64748B] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr key={m.month} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="px-5 py-3 text-[#0B1F17] whitespace-nowrap">{m.month}</td>
                      <td className="px-5 py-3 text-xs text-[#64748B] whitespace-nowrap">{formatNaira(m.totalDue)}</td>
                      <td className="px-5 py-3 font-medium text-[#0B1F17] whitespace-nowrap">{formatNaira(m.totalCollected)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={m.collectionRate >= 80 ? "text-emerald-600" : "text-amber-600"}>
                          {m.collectionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="font-semibold text-[#0B1F17] text-sm">All Transactions</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F7FAF8]">
                    {["Reference", "Tenant", "Unit", "Amount", "Type", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#64748B] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F7FAF8]">
                      <td className="px-4 py-3 font-mono text-xs text-[#64748B] whitespace-nowrap">{p.reference}</td>
                      <td className="px-4 py-3 text-[#0B1F17] whitespace-nowrap">{p.tenantName}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{p.unit}</td>
                      <td className="px-4 py-3 font-medium text-[#0B1F17] whitespace-nowrap">{formatNaira(p.amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={paymentTypeBadge(p.type)} />
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{formatDate(p.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
