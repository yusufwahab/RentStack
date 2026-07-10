import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAsync } from "../../hooks/useAsync";
import { getCollectionTrends, getTenantRiskTable } from "../../services/analyticsService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import PageBanner from "../../components/ui/PageBanner";
import { formatNaira } from "../../utils/format";

const BANNER_IMAGE = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80&auto=format&fit=crop";

function monthLabel(cycleKey) {
  const [y, m] = cycleKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-NG", { month: "short" });
}

function compactNaira(value) {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${Math.round(value / 1000)}k`;
  return `₦${value}`;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-[#0B1F17] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-[#64748B]">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="text-[#0B1F17] font-medium">{formatNaira(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: trends, loading: trendsLoading, error: trendsError, retry: retryTrends } = useAsync(getCollectionTrends);
  const { data: risk, loading: riskLoading, error: riskError, retry: retryRisk } = useAsync(getTenantRiskTable);

  const chartData = (trends?.monthly || []).map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <div>
      <PageBanner image={BANNER_IMAGE} height="h-32" title="Analytics" subtitle="Collection trends and tenant risk, at a glance" />

      <div className="p-6 md:p-8 space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-[#0B1F17] text-sm mb-4">Collection Trend — Last 12 Months</h2>
          {trendsLoading && <Spinner />}
          {trendsError && <ErrorMessage message={trendsError} onRetry={retryTrends} />}
          {!trendsLoading && !trendsError && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap="24%" barGap={2}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 12 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compactNaira}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F7FAF8" }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "#64748B" }}
                />
                <Bar dataKey="totalDue" name="Expected" fill="#64748B" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="totalCollected" name="Collected" fill="#15803D" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="font-semibold text-[#0B1F17] text-sm">Tenant Risk</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Risk = consecutive missed/partial cycles first, reliability score second. High risk means act now.
            </p>
          </div>
          {riskLoading && <Spinner />}
          {riskError && <ErrorMessage message={riskError} onRetry={retryRisk} />}
          {!riskLoading && !riskError && risk && risk.length === 0 && (
            <p className="text-sm text-[#64748B] text-center py-16">No active tenants yet.</p>
          )}
          {!riskLoading && !riskError && risk && risk.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7FAF8]">
                  {["Tenant", "Unit", "Risk", "Reliability Score", "Missed Streak", "Last Payment"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#64748B] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {risk.map((r) => (
                  <tr key={r.tenantId} className="border-b border-[#F1F5F9] last:border-0">
                    <td className="px-4 py-3 text-[#0B1F17] font-medium whitespace-nowrap">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{r.unit}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.riskLevel} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#0B1F17] whitespace-nowrap">{r.score}/100</td>
                    <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                      {r.missedStreak === 0 ? "—" : `${r.missedStreak} cycle${r.missedStreak === 1 ? "" : "s"}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                      {r.daysSinceLastPayment === null ? "Never" : `${r.daysSinceLastPayment} days ago`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
