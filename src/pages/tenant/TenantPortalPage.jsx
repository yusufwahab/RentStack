import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getAllTenants, getTenantPaymentHistory, getShareableStatementLink } from "../../services/tenantService";
import Spinner from "../../components/ui/Spinner";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import PageBanner from "../../components/ui/PageBanner";
import Icon from "../../components/ui/Icon";
import ReliabilityScoreCard from "../../components/ui/ReliabilityScoreCard";
import ShareLinkButton from "../../components/ui/ShareLinkButton";
import { formatNaira, formatDate, paymentTypeBadge } from "../../utils/format";

const BANNER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80&auto=format&fit=crop";
const STATEMENT_IMAGE = "https://images.unsplash.com/photo-1644043350898-2f4ff1e17912?w=400&q=80&auto=format&fit=crop";

export default function TenantPortalPage() {
  const [searchParams] = useSearchParams();
  const prefilledAccount = searchParams.get("account") || "";
  const [accountNumber, setAccountNumber] = useState(prefilledAccount);
  const [tenant, setTenant] = useState(null);
  const [history, setHistory] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { data: allTenants, loading: tenantsLoading } = useAsync(getAllTenants);
  const autoLookupDone = useRef(false);

  async function runLookup(value) {
    setSearching(true);
    setNotFound(false);
    const found = (allTenants || []).find((t) => t.virtualAccountNumber === value.trim());
    if (!found) {
      setNotFound(true);
      setTenant(null);
      setHistory(null);
      setSearching(false);
      return;
    }
    const h = await getTenantPaymentHistory(found.id);
    setTenant(found);
    setHistory(h);
    setSearching(false);
  }

  useEffect(() => {
    if (prefilledAccount && allTenants && !autoLookupDone.current) {
      autoLookupDone.current = true;
      runLookup(prefilledAccount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledAccount, allTenants]);

  async function handleLookup(e) {
    e.preventDefault();
    await runLookup(accountNumber);
  }

  function downloadStatement() {
    if (!history || !tenant) return;
    const rows = [
      ["Reference", "Amount", "Type", "Date"],
      ...history.map((p) => [p.reference, p.amount, p.type, formatDate(p.date)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tenant.name.replace(/\s+/g, "-")}-rent-statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F7FAF8]">
      <div className="bg-[#0B1F17] px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-white font-semibold text-lg">
          RentStack
        </Link>
        <span className="text-[#94A3B8] text-sm">Tenant Portal</span>
      </div>

      {!tenant && (
        <div className="max-w-xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-[#0B1F17] mb-2 text-center">Check your rent status</h1>
          <p className="text-sm text-[#64748B] mb-8 text-center">
            Enter your dedicated 10-digit account number to view your payment history and download your statement.
          </p>

          <form onSubmit={handleLookup} className="flex gap-3">
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 8123456701"
              className="flex-1 border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
            />
            <button
              type="submit"
              disabled={searching || tenantsLoading || !accountNumber}
              className="bg-[#15803D] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60"
            >
              {searching ? "Looking up…" : "Look Up"}
            </button>
          </form>

          {notFound && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg mt-6">
              No tenant found with that account number. Please check and try again.
            </p>
          )}

          {tenantsLoading && (
            <div className="mt-6">
              <Spinner />
            </div>
          )}
        </div>
      )}

      {tenant && (
        <div className="max-w-2xl mx-auto px-6 py-10">
          <button
            onClick={() => {
              setTenant(null);
              setHistory(null);
              setAccountNumber("");
            }}
            className="text-sm text-[#64748B] hover:text-[#0B1F17] transition-colors duration-200 mb-4"
          >
            ← Look up another account
          </button>

          <div className="rounded-xl overflow-hidden mb-6">
            <PageBanner image={BANNER_IMAGE} height="h-40">
              <div className="flex items-center gap-4">
                <Avatar name={tenant.name} className="w-12 h-12" />
                <div>
                  <h2 className="text-white text-lg font-semibold">{tenant.name}</h2>
                  <p className="text-[#94A3B8] text-sm">{tenant.unit}</p>
                </div>
                <div className="ml-2">
                  <StatusBadge status={tenant.status} />
                </div>
              </div>
            </PageBanner>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-[#0B1F17] text-sm">Your Account</h3>
              {[
                { label: "Account Number", value: tenant.virtualAccountNumber, mono: true },
                { label: "Bank", value: tenant.bankName },
                { label: "Account Name", value: tenant.accountName },
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
          </div>

          <div className="mb-6">
            <ReliabilityScoreCard tenantId={tenant.id} />
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 mb-6 flex gap-4 items-start">
            <img src={STATEMENT_IMAGE} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-[#0B1F17] text-sm mb-1">Download Your Statement</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadStatement}
                  disabled={!history || history.length === 0}
                  className="flex items-center gap-1.5 bg-[#15803D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200 disabled:opacity-50"
                >
                  <Icon name="document" className="w-4 h-4" />
                  Download Statement
                </button>
                <ShareLinkButton getLink={() => getShareableStatementLink(tenant.id)} label="Share Statement" />
              </div>
              <p className="text-xs text-[#64748B] mt-3">
                Your statement is a verified record of every rent payment you have made. Share it with banks, employers, or future landlords.
              </p>
            </div>
          </div>

          {history && history.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h3 className="font-semibold text-[#0B1F17] text-sm">Payment History</h3>
              </div>
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
      )}
    </div>
  );
}
