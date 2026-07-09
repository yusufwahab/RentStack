import { useParams, useNavigate } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getTenantById, getTenantPaymentHistory, offboardTenant, getShareableStatementLink } from "../../services/tenantService";
import { getTenantKyc } from "../../services/kycService";
import { getNotificationsForTenant } from "../../services/notificationService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import PageBanner from "../../components/ui/PageBanner";
import Icon from "../../components/ui/Icon";
import ReliabilityScoreCard from "../../components/ui/ReliabilityScoreCard";
import ShareLinkButton from "../../components/ui/ShareLinkButton";
import { formatNaira, formatDate, formatDateTime, paymentTypeBadge, paymentTypeLabel } from "../../utils/format";

const BANNER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop";
const STATEMENT_IMAGE = "https://images.unsplash.com/photo-1644043350898-2f4ff1e17912?w=400&q=80&auto=format&fit=crop";

export default function TenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: tenant, loading: tLoading, error: tError, retry: tRetry } = useAsync(() => getTenantById(id), [id]);
  const { data: history, loading: hLoading, error: hError, retry: hRetry } = useAsync(() => getTenantPaymentHistory(id), [id]);
  const { data: kyc } = useAsync(() => getTenantKyc(id), [id]);
  const { data: notifications } = useAsync(() => getNotificationsForTenant(id), [id]);

  async function handleOffboard() {
    if (!tenant || !window.confirm(`Offboard ${tenant.name}? This cannot be undone.`)) return;
    await offboardTenant(id);
    navigate("/tenants");
  }

  function downloadStatement() {
    if (!history || !tenant) return;
    const rows = [
      ["Reference", "Amount", "Type", "Date"],
      ...history.map((p) => [p.reference, p.amount, paymentTypeLabel(p.type), formatDate(p.date)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tenant.name.replace(/\s+/g, "-")}-statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tLoading) return <Spinner />;
  if (tError) return <ErrorMessage message={tError} onRetry={tRetry} />;
  if (!tenant) return null;

  const { currentCycle } = tenant;

  return (
    <div>
      <PageBanner image={BANNER_IMAGE} height="h-40">
        <div className="flex items-center gap-4">
          <Avatar name={tenant.name} className="w-12 h-12" />
          <div>
            <h1 className="text-white text-xl font-semibold">{tenant.name}</h1>
            <p className="text-[#94A3B8] text-sm">{tenant.unit}</p>
          </div>
          <div className="ml-2">
            <StatusBadge status={tenant.status} />
          </div>
        </div>
      </PageBanner>

      <div className="p-6 md:p-8 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-[#0B1F17] text-sm">Account Details</h2>
            {[
              { label: "Virtual Account Number", value: tenant.virtualAccountNumber, mono: true },
              { label: "Bank", value: tenant.bankName },
              { label: "Account Name", value: tenant.accountName },
              { label: "Move-in Date", value: formatDate(tenant.moveInDate) },
              ...(tenant.moveOutDate ? [{ label: "Move-out Date", value: formatDate(tenant.moveOutDate) }] : []),
              { label: "Phone", value: tenant.phone },
              { label: "Email", value: tenant.email },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between gap-3 text-xs">
                <span className="text-[#64748B] shrink-0">{label}</span>
                <span className={`text-[#0B1F17] text-right ${mono ? "font-mono" : ""}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-[#0B1F17] text-sm">Current Cycle</h2>
            {[
              { label: "Rent Due", value: formatNaira(currentCycle.due) },
              { label: "Amount Paid", value: formatNaira(currentCycle.paid) },
              {
                label: "Balance",
                value: formatNaira(currentCycle.balance),
                color: currentCycle.balance > 0 ? "text-red-600" : "text-emerald-600",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-[#64748B]">{label}</span>
                <span className={`font-medium ${color || "text-[#0B1F17]"}`}>{value}</span>
              </div>
            ))}
            {currentCycle.credit > 0 && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                {formatNaira(currentCycle.credit)} credit carries forward to next month.
              </p>
            )}
            {tenant.disputeNote && (
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg leading-relaxed">
                {tenant.disputeNote}
              </p>
            )}
          </div>

          {kyc && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#0B1F17] text-sm">KYC Tier</h2>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-[#ECFDF3] text-[#15803D] border-emerald-200">
                  {kyc.tier}
                </span>
              </div>
              <p className="text-xs text-[#64748B]">{kyc.limit}</p>
              {kyc.tierChange && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg leading-relaxed">
                  Changed from {kyc.tierChange.from} to {kyc.tierChange.to} on {formatDate(kyc.tierChange.date)} —{" "}
                  {kyc.tierChange.reason}
                </p>
              )}
            </div>
          )}

          <ReliabilityScoreCard tenantId={id} />

          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
            <img src={STATEMENT_IMAGE} alt="" className="w-full h-24 object-cover rounded-lg mb-3" />
            <div className="flex flex-col gap-2">
              <button
                onClick={downloadStatement}
                disabled={!history || history.length === 0}
                className="w-full flex items-center justify-center gap-1.5 border border-[#E5E7EB] text-[#0B1F17] py-2 rounded-lg text-sm hover:bg-[#F7FAF8] transition-colors duration-200 disabled:opacity-50"
              >
                <Icon name="document" className="w-4 h-4" />
                Download Statement
              </button>
              <ShareLinkButton
                getLink={() => getShareableStatementLink(id)}
                label="Share Statement"
                className="w-full justify-center"
              />
            </div>
          </div>

          {tenant.status !== "CLOSED" && (
            <button
              onClick={handleOffboard}
              className="w-full border border-red-200 text-red-600 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors duration-200"
            >
              Offboard Tenant
            </button>
          )}
        </div>

        <div className="md:col-span-2">
          <h2 className="font-semibold text-[#0B1F17] mb-4">Payment History</h2>
          {hLoading && <Spinner />}
          {hError && <ErrorMessage message={hError} onRetry={hRetry} />}
          {history && history.length === 0 && (
            <p className="text-sm text-[#64748B] text-center py-16 border border-dashed border-[#E5E7EB] rounded-xl">
              No payment history yet.
            </p>
          )}
          {history && history.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F7FAF8]">
                    {["Reference", "Amount", "Type", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#64748B] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-[#64748B] whitespace-nowrap">{p.reference}</td>
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
          )}

          {notifications && notifications.length > 0 && (
            <div className="mt-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <Icon name="envelope" className="w-4 h-4 text-[#64748B]" />
                <h2 className="font-semibold text-[#0B1F17] text-sm">Email Notifications Sent</h2>
              </div>
              <div className="divide-y divide-[#F1F5F9] max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-[#0B1F17]">{n.to}</span>
                      <span className="text-xs text-[#94A3B8] whitespace-nowrap">{formatDateTime(n.sentAt)}</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
