import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getDashboardStats } from "../../services/dashboardService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import PageBanner from "../../components/ui/PageBanner";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatNaira as fmt, formatDate, paymentTypeBadge } from "../../utils/format";

const BANNER_IMAGE = "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80&auto=format&fit=crop";

function StatCard({ label, value, sub, color = "text-[#0F172A]" }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <p className="text-xs text-[#64748B] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[#94A3B8] mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { data: stats, loading, error, retry } = useAsync(getDashboardStats);

  return (
    <div>
      <PageBanner image={BANNER_IMAGE} height="h-32">
        <p className="text-[#94A3B8] text-sm">Good day,</p>
        <h1 className="text-white text-2xl font-bold">{currentUser?.name}</h1>
        <p className="text-[#64748B] text-xs mt-0.5">{currentUser?.property?.name}</p>
      </PageBanner>

      <div className="p-6 md:p-8">
        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={retry} />}

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="Total Tenants" value={stats.totalTenants} />
              <StatCard label="Paid" value={stats.counts.paid} color="text-emerald-600" />
              <StatCard label="Partial" value={stats.counts.partial} color="text-amber-600" />
              <StatCard label="Unpaid" value={stats.counts.unpaid} color="text-red-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <StatCard
                label={`Collected — ${stats.cycleLabel}`}
                value={fmt(stats.totalCollected)}
                sub={`of ${fmt(stats.totalExpected)} expected`}
              />
              <StatCard label="Outstanding" value={fmt(stats.outstanding)} color="text-red-600" />
              <StatCard
                label="Collection Rate"
                value={`${stats.collectionRate}%`}
                color={stats.collectionRate >= 80 ? "text-emerald-600" : "text-amber-600"}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard label="Overpaid" value={stats.counts.overpaid} color="text-blue-600" />
              <StatCard label="Disputed" value={stats.counts.disputed} color="text-orange-600" />
              <StatCard label="Misdirected" value={stats.misdirectedCount} color="text-orange-600" />
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-semibold text-[#0F172A] text-sm">Recent Payments</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFAF9]">
                    {["Tenant", "Unit", "Amount", "Type", "Date"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#64748B]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPayments.map((p) => (
                    <tr key={p.id} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="px-5 py-3 text-[#0F172A]">{p.tenantName}</td>
                      <td className="px-5 py-3 text-xs text-[#64748B]">{p.unit}</td>
                      <td className="px-5 py-3 font-medium text-[#0F172A]">{fmt(p.amount)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={paymentTypeBadge(p.type)} />
                      </td>
                      <td className="px-5 py-3 text-xs text-[#64748B]">{formatDate(p.date)}</td>
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
