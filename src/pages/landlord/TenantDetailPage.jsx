import { useParams, useNavigate } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getTenantById, getTenantPaymentHistory, offboardTenant } from "../../services/tenantService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import PageBanner from "../../components/ui/PageBanner";
import { formatNaira, formatDate, paymentTypeBadge, paymentTypeLabel } from "../../utils/format";

const BANNER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop";
const STATEMENT_IMAGE = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80&auto=format&fit=crop";

export default function TenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: tenant, loading: tLoading, error: tError, retry: tRetry } = useAsync(() => getTenantById(id), [id]);
  const { data: history, loading: hLoading, error: hError, retry: hRetry } = useAsync(() => getTenantPaymentHistory(id), [id]);

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
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-[#0F172A] text-sm">Account Details</h2>
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
                <span className={`text-[#0F172A] text-right ${mono ? "font-mono" : ""}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-[#0F172A] text-sm">Current Cycle</h2>
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
                <span className={`font-medium ${color || "text-[#0F172A]"}`}>{value}</span>
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

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <img src={STATEMENT_IMAGE} alt="" className="w-full h-24 object-cover rounded-lg mb-3" />
            <button
              onClick={downloadStatement}
              disabled={!history || history.length === 0}
              className="w-full border border-[#E2E8F0] text-[#0F172A] py-2 rounded-lg text-sm hover:bg-[#FAFAF9] transition-colors duration-200 disabled:opacity-50"
            >
              Download Statement
            </button>
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
          <h2 className="font-semibold text-[#0F172A] mb-4">Payment History</h2>
          {hLoading && <Spinner />}
          {hError && <ErrorMessage message={hError} onRetry={hRetry} />}
          {history && history.length === 0 && (
            <p className="text-sm text-[#64748B] text-center py-16 border border-dashed border-[#E2E8F0] rounded-xl">
              No payment history yet.
            </p>
          )}
          {history && history.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFAF9]">
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
                      <td className="px-4 py-3 font-medium text-[#0F172A] whitespace-nowrap">{formatNaira(p.amount)}</td>
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
        </div>
      </div>
    </div>
  );
}
