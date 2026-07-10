import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getAllTenants, getTenantById, getTenantPaymentHistory, processPayment } from "../../services/tenantService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import PageBanner from "../../components/ui/PageBanner";
import Icon from "../../components/ui/Icon";
import ReliabilityScoreCard from "../../components/ui/ReliabilityScoreCard";
import { formatNaira, formatDate, paymentTypeBadge } from "../../utils/format";

const BANNER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop";

export default function TenantViewPage() {
  const { data: allTenants, loading: listLoading, error: listError, retry: retryList } = useAsync(getAllTenants);
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const {
    data: tenant,
    loading: tLoading,
    error: tError,
    retry: retryTenant,
  } = useAsync(() => (selectedId ? getTenantById(selectedId) : null), [selectedId]);
  const {
    data: history,
    loading: hLoading,
    retry: retryHistory,
  } = useAsync(() => (selectedId ? getTenantPaymentHistory(selectedId) : []), [selectedId]);

  useEffect(() => {
    if (!selectedId && allTenants && allTenants.length > 0) {
      const active = allTenants.find((t) => t.status !== "CLOSED") || allTenants[0];
      setSelectedId(active.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTenants]);

  useEffect(() => {
    if (tenant) setAmount(String(tenant.currentCycle.balance || tenant.rentAmount));
  }, [tenant]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 6000);
    return () => clearTimeout(t);
  }, [successMsg]);

  async function handleProcess(e) {
    e.preventDefault();
    setSubmitError("");
    setSuccessMsg("");
    const value = Number(amount);
    if (!value || value <= 0) {
      setSubmitError("Enter an amount greater than zero.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await processPayment(selectedId, value);
      const label = { full: "Full payment", partial: "Partial payment", overpayment: "Overpayment" }[result.type] || "Payment";
      setSuccessMsg(`${label} of ${formatNaira(value)} recorded. The landlord dashboard now reflects it.`);
      await Promise.all([retryTenant(), retryHistory()]);
    } catch (err) {
      setSubmitError(err.message || "Could not process this payment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (listLoading) return <Spinner />;
  if (listError) return <ErrorMessage message={listError} onRetry={retryList} />;

  return (
    <div>
      <PageBanner image={BANNER_IMAGE} height="h-32" title="Tenant's View" subtitle="Preview the app as your tenant, and test a payment" />

      <div className="p-6 md:p-8 space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
          <label className="block text-sm font-medium text-[#0B1F17] mb-2">Viewing as</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full md:w-80 border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
          >
            {(allTenants || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.unit}
              </option>
            ))}
          </select>
        </div>

        {tLoading && <Spinner />}
        {tError && <ErrorMessage message={tError} onRetry={retryTenant} />}

        {tenant && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <Avatar name={tenant.name} className="w-10 h-10" />
                  <div>
                    <p className="font-semibold text-[#0B1F17] text-sm">{tenant.name}</p>
                    <p className="text-[#64748B] text-xs">{tenant.unit}</p>
                  </div>
                  <div className="ml-auto">
                    <StatusBadge status={tenant.status} />
                  </div>
                </div>
                {[
                  { label: "Account Number", value: tenant.virtualAccountNumber, mono: true },
                  { label: "Bank", value: tenant.bankName },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-[#64748B]">{label}</span>
                    <span className={`text-[#0B1F17] ${mono ? "font-mono" : ""}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-[#0B1F17] text-sm">This Cycle</h3>
                {[
                  { label: "Rent Due", value: formatNaira(tenant.currentCycle.due) },
                  { label: "Amount Paid", value: formatNaira(tenant.currentCycle.paid) },
                  {
                    label: "Balance",
                    value: formatNaira(tenant.currentCycle.balance),
                    color: tenant.currentCycle.balance > 0 ? "text-red-600" : "text-emerald-600",
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-[#64748B]">{label}</span>
                    <span className={`font-medium ${color || "text-[#0B1F17]"}`}>{value}</span>
                  </div>
                ))}
                {tenant.currentCycle.creditApplied > 0 && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                    {formatNaira(tenant.currentCycle.creditApplied)} credit applied from last cycle's overpayment.
                  </p>
                )}
                {tenant.currentCycle.credit > 0 && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                    {formatNaira(tenant.currentCycle.credit)} credit carries forward to next month.
                  </p>
                )}
              </div>

              <ReliabilityScoreCard tenantId={tenant.id} />

              <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon name="arrowsRightLeft" className="w-4 h-4 text-[#64748B]" />
                  <h3 className="font-semibold text-[#0B1F17] text-sm">Process a Bank Transfer</h3>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  In production this happens automatically when {tenant.name.split(" ")[0]} sends money to their virtual
                  account number. This lets you test the same reconciliation engine — try full, partial, or over payment.
                </p>
                <form onSubmit={handleProcess} className="space-y-2">
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                  />
                  <button
                    type="submit"
                    disabled={submitting || tenant.status === "CLOSED"}
                    className="w-full bg-[#15803D] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60"
                  >
                    {submitting ? "Processing…" : "Process Payment"}
                  </button>
                </form>
                {submitError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{submitError}</p>
                )}
                {successMsg && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg leading-relaxed">
                    {successMsg}{" "}
                    <Link to="/dashboard" className="underline font-medium">
                      Go to Dashboard →
                    </Link>
                  </p>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <h2 className="font-semibold text-[#0B1F17] mb-4">Payment History</h2>
              {hLoading && <Spinner />}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
