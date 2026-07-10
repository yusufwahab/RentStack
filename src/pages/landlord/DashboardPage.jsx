import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getDashboardStats, CYCLE_OPTIONS } from "../../services/dashboardService";
import { exportCSV } from "../../services/reportService";
import { getKycAlerts } from "../../services/kycService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import Icon from "../../components/ui/Icon";
import { formatNaira as fmt, formatDate, formatDateTime, paymentTypeBadge } from "../../utils/format";

const PROPERTY_IMAGE = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80&auto=format&fit=crop";

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

// Severity-scaled radial meter — fill + track are the same hue family (a
// lighter step of the fill color), matching the emerald/amber/red tiers
// StatusBadge and ReportsPage already use for collection rate.
const RING_SEVERITY = [
  { min: 80, fill: "#15803D", track: "#DCFCE7" },
  { min: 50, fill: "#D97706", track: "#FEF3C7" },
  { min: 0, fill: "#DC2626", track: "#FEE2E2" },
];

function CollectionRing({ rate, size = 116, thickness = 11 }) {
  const clamped = Math.min(Math.max(rate, 0), 100);
  const { fill, track } = RING_SEVERITY.find((s) => clamped >= s.min);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fill}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-[#0B1F17]">{clamped}%</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [cycle, setCycle] = useState(CYCLE_OPTIONS[0].key);
  const { data: stats, loading, error, retry } = useAsync(() => getDashboardStats(cycle), [cycle]);
  const { data: kycAlerts } = useAsync(getKycAlerts);
  const [exporting, setExporting] = useState(false);

  async function handleDownloadReport() {
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
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <p className="text-[#64748B] text-sm">Good day,</p>
          <h1 className="text-[#0B1F17] text-2xl font-bold">{currentUser?.name}</h1>
          <p className="text-[#94A3B8] text-xs mt-0.5">{currentUser?.property?.name}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#64748B] mb-1">Viewing cycle</label>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            className="border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
          >
            {CYCLE_OPTIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        <Link
          to="/tenants?action=add"
          className="flex items-center gap-1.5 bg-[#15803D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200"
        >
          <Icon name="plus" className="w-4 h-4" />
          Add Tenant
        </Link>
        <Link
          to="/payments?tab=misdirected"
          className="flex items-center gap-1.5 border border-[#E5E7EB] text-[#0B1F17] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F7FAF8] transition-colors duration-200"
        >
          <Icon name="exclamation" className="w-4 h-4" />
          View Misdirected Payments
        </Link>
        <button
          onClick={handleDownloadReport}
          disabled={exporting}
          className="flex items-center gap-1.5 border border-[#E5E7EB] text-[#0B1F17] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F7FAF8] transition-colors duration-200 disabled:opacity-60"
        >
          <Icon name="download" className="w-4 h-4" />
          {exporting ? "Exporting…" : "Download This Month's Report"}
        </button>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={retry} />}

      {stats && (
        <>
          {/* Misdirected payments alert — never buried */}
          {stats.misdirectedCount > 0 && (
            <div className="flex items-center justify-between gap-4 bg-[#FEE2E2] border border-red-200 rounded-2xl px-5 py-4 mb-6">
              <div className="flex items-center gap-3">
                <Icon name="exclamation" className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-800">
                  <span className="font-medium">
                    {stats.misdirectedCount} misdirected payment{stats.misdirectedCount > 1 ? "s" : ""}
                  </span>{" "}
                  need resolution.
                </p>
              </div>
              <Link
                to="/payments?tab=misdirected"
                className="shrink-0 text-sm font-medium text-red-700 hover:text-red-900 transition-colors duration-200 whitespace-nowrap"
              >
                Review now →
              </Link>
            </div>
          )}

          {/* KYC tier-change alerts */}
          {kycAlerts && kycAlerts.length > 0 && (
            <div className="space-y-2 mb-6">
              {kycAlerts.map((alert) => (
                <div
                  key={alert.tenantId}
                  className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="shieldCheck" className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-900">
                      <span className="font-medium">{alert.tenantName}</span>'s KYC tier changed from{" "}
                      <span className="font-medium">{alert.from}</span> to{" "}
                      <span className="font-medium">{alert.to}</span> on {formatDate(alert.date)} — {alert.reason}
                    </p>
                  </div>
                  <Link
                    to={`/tenants/${alert.tenantId}`}
                    className="shrink-0 text-sm font-medium text-amber-800 hover:text-amber-900 transition-colors duration-200 whitespace-nowrap"
                  >
                    View tenant →
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Financial KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon="users" label="Total Tenants" value={stats.totalTenants} />
            <StatCard icon="banknote" label={`Expected — ${stats.cycleLabel}`} value={fmt(stats.totalExpected)} />
            <StatCard
              icon="checkCircle"
              label="Collected This Cycle"
              value={fmt(stats.totalCollected)}
              color="text-emerald-600"
              iconColor="text-emerald-600 bg-emerald-50"
            />
            <StatCard
              icon="scaleBalance"
              label="Outstanding"
              value={fmt(stats.outstanding)}
              color="text-red-600"
              iconColor="text-red-600 bg-red-50"
            />
          </div>

          {/* Collection rate — impossible to miss */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-6">
            <CollectionRing rate={stats.collectionRate} />
            <div>
              <p className="text-sm font-medium text-[#0B1F17]">Collected this cycle</p>
              <p className="text-2xl font-bold text-[#0B1F17] mt-1">
                {fmt(stats.totalCollected)} <span className="text-base font-normal text-[#64748B]">of {fmt(stats.totalExpected)}</span>
              </p>
              {stats.outstanding > 0 && (
                <p className="text-xs text-[#94A3B8] mt-1">{fmt(stats.outstanding)} still outstanding</p>
              )}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard icon="checkCircle" label="Paid" value={stats.counts.paid} color="text-emerald-600" iconColor="text-emerald-600 bg-emerald-50" />
            <StatCard icon="arrowsRightLeft" label="Partial" value={stats.counts.partial} color="text-amber-600" iconColor="text-amber-600 bg-amber-50" />
            <StatCard icon="exclamation" label="Unpaid" value={stats.counts.unpaid} color="text-red-600" iconColor="text-red-600 bg-red-50" />
            <StatCard icon="banknote" label="Overpaid" value={stats.counts.overpaid} color="text-blue-600" iconColor="text-blue-600 bg-blue-50" />
            <StatCard icon="exclamation" label="Disputed" value={stats.counts.disputed} color="text-orange-600" iconColor="text-orange-600 bg-orange-50" />
          </div>

          {/* Tenant status table + Recent activity */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="font-semibold text-[#0B1F17] text-sm">Tenant Payment Status — {stats.cycleLabel}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F7FAF8]">
                      {["Tenant", "Unit", "Status", "Paid", "Balance", "Last Payment"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#64748B] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.tenantRows.map((t) => (
                      <tr key={t.id} className="border-b border-[#F1F5F9] last:border-0">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={t.name} className="w-7 h-7" />
                            <span className="text-[#0B1F17] whitespace-nowrap">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-[#64748B] whitespace-nowrap">{t.unit}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={t.cycleStatus} />
                            {t.overdue && <StatusBadge status="OVERDUE" />}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-[#0B1F17] whitespace-nowrap">{fmt(t.cyclePaid)}</td>
                        <td className="px-5 py-3 text-xs font-medium whitespace-nowrap">
                          {t.cycleBalance > 0 ? (
                            <span className="text-red-600">{fmt(t.cycleBalance)} due</span>
                          ) : t.cycleCredit > 0 ? (
                            <span className="text-blue-600">+{fmt(t.cycleCredit)} credit</span>
                          ) : (
                            <span className="text-emerald-600">Settled</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-[#64748B] whitespace-nowrap">
                          {t.daysSinceLastPayment === null ? "No payments yet" : `${t.daysSinceLastPayment}d ago`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="font-semibold text-[#0B1F17] text-sm">Recent Activity</h2>
              </div>
              <div className="divide-y divide-[#F1F5F9] max-h-105 overflow-y-auto">
                {stats.recentPayments.map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[#0B1F17] truncate">{p.tenantName}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{formatDateTime(p.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-[#0B1F17]">{fmt(p.amount)}</p>
                      <div className="mt-1">
                        <StatusBadge status={paymentTypeBadge(p.type)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Properties + upcoming due dates */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {stats.properties.map((property) => (
                <div key={property.id ?? property.name} className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
                  <img src={PROPERTY_IMAGE} alt={property.name} className="w-full h-40 object-cover" />
                  <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-[#0B1F17]">{property.name}</h3>
                      <p className="text-xs text-[#64748B] mt-0.5">{property.address}</p>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="text-lg font-bold text-[#0B1F17]">{property.totalUnits}</p>
                        <p className="text-xs text-[#64748B]">Total Units</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#15803D]">{property.occupiedUnits}</p>
                        <p className="text-xs text-[#64748B]">Occupied</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h2 className="font-semibold text-[#0B1F17] text-sm">Due in the Next 7 Days</h2>
              </div>
              {stats.upcomingDue.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-10 px-5">Nothing due in the next week.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {stats.upcomingDue.map((t) => (
                    <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-[#0B1F17] truncate">{t.name}</p>
                        <p className="text-xs text-[#64748B]">{t.unit}</p>
                      </div>
                      <p className="text-xs text-[#94A3B8] shrink-0 whitespace-nowrap">{formatDate(t.dueDate)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
