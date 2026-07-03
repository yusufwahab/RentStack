import { useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import {
  getAllPayments,
  getMisdirectedPayments,
  assignMisdirectedPayment,
  returnMisdirectedPayment,
} from "../../services/paymentService";
import { getAllTenants } from "../../services/tenantService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { formatNaira, formatDateTime, formatDate, paymentTypeBadge } from "../../utils/format";

const MISDIRECTED_EMPTY_IMAGE = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80&auto=format&fit=crop";

export default function PaymentsPage() {
  const { data: payments, loading: pLoading, error: pError, retry: pRetry } = useAsync(getAllPayments);
  const { data: misdirected, loading: mLoading, error: mError, retry: mRetry } = useAsync(getMisdirectedPayments);
  const { data: tenants } = useAsync(getAllTenants);
  const [tab, setTab] = useState("all");
  const [resolving, setResolving] = useState(null);
  const [mList, setMList] = useState(null);

  const displayedMisdirected = mList ?? misdirected ?? [];

  async function handleAssign(paymentId, tenantId) {
    await assignMisdirectedPayment(paymentId, tenantId);
    setMList((prev) => (prev ?? misdirected ?? []).filter((p) => p.id !== paymentId));
    setResolving(null);
  }

  async function handleReturn(paymentId) {
    await returnMisdirectedPayment(paymentId);
    setMList((prev) => (prev ?? misdirected ?? []).filter((p) => p.id !== paymentId));
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-xl font-semibold text-[#0F172A] mb-6">Payments</h1>

      <div className="flex gap-2 mb-6">
        {["all", "misdirected"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
              tab === t ? "bg-[#0F172A] text-white" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#FAFAF9]"
            }`}
          >
            {t === "all" ? "All Payments" : "Misdirected"}
            {t === "misdirected" && displayedMisdirected.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {displayedMisdirected.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <>
          {pLoading && <Spinner />}
          {pError && <ErrorMessage message={pError} onRetry={pRetry} />}
          {payments && payments.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFAF9]">
                    {["Reference", "Tenant", "Unit", "Amount", "Type", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#64748B] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFAF9]">
                      <td className="px-4 py-3 font-mono text-xs text-[#64748B] whitespace-nowrap">{p.reference}</td>
                      <td className="px-4 py-3 text-[#0F172A] whitespace-nowrap">{p.tenantName || "Unassigned"}</td>
                      <td className="px-4 py-3 text-[#64748B] text-xs whitespace-nowrap">{p.unit || "—"}</td>
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
        </>
      )}

      {tab === "misdirected" && (
        <>
          {mLoading && <Spinner />}
          {mError && <ErrorMessage message={mError} onRetry={mRetry} />}
          {!mLoading && !mError && displayedMisdirected.length === 0 && (
            <EmptyState image={MISDIRECTED_EMPTY_IMAGE} message="No misdirected payments. Everything is reconciled." />
          )}
          {displayedMisdirected.length > 0 && (
            <div className="space-y-4">
              {displayedMisdirected.map((m) => (
                <div key={m.id} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#0F172A]">{m.senderAccountName}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {m.senderBank} · {m.reference}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">{formatDateTime(m.date)}</p>
                      <p className="text-xs text-orange-700 mt-2">
                        No matching tenant account found for this transfer.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-[#0F172A]">{formatNaira(m.amount)}</p>
                      <StatusBadge status="UNRESOLVED" />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setResolving(resolving === m.id ? null : m.id)}
                      className="text-sm px-4 py-2 bg-[#0F172A] text-white rounded-lg hover:bg-[#1E293B] transition-colors duration-200"
                    >
                      Assign to Tenant
                    </button>
                    <button
                      onClick={() => handleReturn(m.id)}
                      className="text-sm px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#FAFAF9] transition-colors duration-200"
                    >
                      Return Payment
                    </button>
                  </div>
                  {resolving === m.id && tenants && (
                    <div className="mt-3 border border-[#E2E8F0] rounded-lg overflow-hidden">
                      {tenants
                        .filter((t) => t.status !== "CLOSED")
                        .map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleAssign(m.id, t.id)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FAFAF9] border-b border-[#F1F5F9] last:border-0 transition-colors duration-200"
                          >
                            <span className="font-medium text-[#0F172A]">{t.name}</span>
                            <span className="text-[#64748B] ml-2 text-xs">{t.unit}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
