import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getDashboardStats } from "../../services/dashboardService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import Icon from "../../components/ui/Icon";
import { formatNaira as fmt, formatDate, paymentTypeBadge } from "../../utils/format";

function StatCard({ icon, label, value, sub, color = "text-[#0B1F17]", iconColor = "text-[#15803D] bg-[#ECFDF3]" }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
      <span className={`inline-flex w-9 h-9 rounded-full items-center justify-center mb-3 ${iconColor}`}>
        <Icon name={icon} className="w-4.5 h-4.5" />
      </span>
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
      <div className="px-6 md:px-8 pt-8 pb-2">
        <p className="text-[#64748B] text-sm">Good day,</p>
        <h1 className="text-[#0B1F17] text-2xl font-bold">{currentUser?.name}</h1>
        <p className="text-[#94A3B8] text-xs mt-0.5">{currentUser?.property?.name}</p>
      </div>

      <div className="p-6 md:p-8">
        {loading && <Spinner />}
        {error && <ErrorMessage message={error} onRetry={retry} />}

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon="users" label="Total Tenants" value={stats.totalTenants} />
              <StatCard
                icon="checkCircle"
                label="Paid"
                value={stats.counts.paid}
                color="text-emerald-600"
                iconColor="text-emerald-600 bg-emerald-50"
              />
              <StatCard
                icon="arrowsRightLeft"
                label="Partial"
                value={stats.counts.partial}
                color="text-amber-600"
                iconColor="text-amber-600 bg-amber-50"
              />
              <StatCard
                icon="exclamation"
                label="Unpaid"
                value={stats.counts.unpaid}
                color="text-red-600"
                iconColor="text-red-600 bg-red-50"
              />
              <StatCard
                icon="banknote"
                label={`Collected — ${stats.cycleLabel}`}
                value={fmt(stats.totalCollected)}
                sub={`of ${fmt(stats.totalExpected)} expected`}
              />
              <StatCard
                icon="scaleBalance"
                label="Outstanding"
                value={fmt(stats.outstanding)}
                color="text-red-600"
                iconColor="text-red-600 bg-red-50"
              />
              <StatCard
                icon="chartBar"
                label="Collection Rate"
                value={`${stats.collectionRate}%`}
                color={stats.collectionRate >= 80 ? "text-emerald-600" : "text-amber-600"}
                iconColor={stats.collectionRate >= 80 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}
              />
              <StatCard
                icon="banknote"
                label="Overpaid"
                value={stats.counts.overpaid}
                color="text-blue-600"
                iconColor="text-blue-600 bg-blue-50"
              />
              <StatCard
                icon="exclamation"
                label="Disputed"
                value={stats.counts.disputed}
                color="text-orange-600"
                iconColor="text-orange-600 bg-orange-50"
              />
              <StatCard
                icon="exclamation"
                label="Misdirected"
                value={stats.misdirectedCount}
                color="text-orange-600"
                iconColor="text-orange-600 bg-orange-50"
              />
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="font-semibold text-[#0B1F17] text-sm">Recent Payments</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F7FAF8]">
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
                      <td className="px-5 py-3 text-[#0B1F17]">{p.tenantName}</td>
                      <td className="px-5 py-3 text-xs text-[#64748B]">{p.unit}</td>
                      <td className="px-5 py-3 font-medium text-[#0B1F17]">{fmt(p.amount)}</td>
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
