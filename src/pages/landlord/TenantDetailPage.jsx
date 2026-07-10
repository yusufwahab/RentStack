import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getTenantById, getTenantPaymentHistory, offboardTenant, getShareableStatementLink, updateTenant } from "../../services/tenantService";
import { getTenantKyc } from "../../services/kycService";
import { getNotificationsForTenant } from "../../services/notificationService";
import { getDeposit, recordDeposit, refundDeposit } from "../../services/depositService";
import { getTenantMaintenanceRequests, updateMaintenanceRequestStatus } from "../../services/maintenanceService";
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

function daysUntil(dateString) {
  if (!dateString) return null;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(dateString) - todayStart) / (1000 * 60 * 60 * 24));
}

function EditLeaseModal({ tenant, onClose, onSaved }) {
  const [form, setForm] = useState({
    leaseEndDate: tenant.leaseEndDate || "",
    serviceCharge: tenant.serviceCharge || 0,
    guarantorName: tenant.guarantorName || "",
    guarantorPhone: tenant.guarantorPhone || "",
    guarantorRelationship: tenant.guarantorRelationship || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const updated = await updateTenant(tenant.id, form);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[#0B1F17]">Lease & Guarantor Details</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0B1F17] transition-colors duration-200">
            Close
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#0B1F17] mb-1">Lease End Date</label>
            <input
              type="date"
              value={form.leaseEndDate}
              onChange={(e) => setForm({ ...form, leaseEndDate: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#0B1F17] mb-1">Service Charge (per cycle)</label>
            <input
              type="number"
              min="0"
              value={form.serviceCharge}
              onChange={(e) => setForm({ ...form, serviceCharge: Number(e.target.value) })}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
            />
          </div>
          <div className="pt-2 border-t border-[#F1F5F9]">
            <p className="text-xs font-medium text-[#0B1F17] mb-2">Guarantor</p>
            <div className="space-y-3">
              {[
                { key: "guarantorName", label: "Full Name", placeholder: "Adaeze Nwachukwu" },
                { key: "guarantorPhone", label: "Phone", placeholder: "08012345678" },
                { key: "guarantorRelationship", label: "Relationship", placeholder: "Sister" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#0B1F17] mb-1">{label}</label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#15803D] text-white py-2.5 rounded-lg text-sm font-medium mt-2 hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DepositCard({ tenantId }) {
  const { data: deposit, loading, retry } = useAsync(() => getDeposit(tenantId), [tenantId]);
  const [showRecord, setShowRecord] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [amount, setAmount] = useState("");
  const [deductions, setDeductions] = useState("0");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleRecord(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await recordDeposit(tenantId, amount);
      setShowRecord(false);
      setAmount("");
      retry();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRefund(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await refundDeposit(tenantId, deductions, reason);
      setShowRefund(false);
      retry();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
      <h2 className="font-semibold text-[#0B1F17] text-sm">Security Deposit</h2>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {!deposit && !showRecord && (
        <>
          <p className="text-xs text-[#64748B]">No deposit on record for this tenant.</p>
          <button
            onClick={() => setShowRecord(true)}
            className="w-full border border-[#E5E7EB] text-[#0B1F17] py-2 rounded-lg text-sm hover:bg-[#F7FAF8] transition-colors duration-200"
          >
            Record Deposit
          </button>
        </>
      )}

      {!deposit && showRecord && (
        <form onSubmit={handleRecord} className="space-y-2">
          <input
            type="number"
            min="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount received"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#15803D] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowRecord(false)}
              className="px-3 text-sm text-[#64748B] hover:text-[#0B1F17] transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {deposit && (
        <>
          {[
            { label: "Amount", value: formatNaira(deposit.amount) },
            { label: "Status", value: <StatusBadge status={deposit.status} /> },
            ...(deposit.deductions > 0 ? [{ label: "Deductions", value: formatNaira(deposit.deductions) }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-xs">
              <span className="text-[#64748B]">{label}</span>
              <span className="text-[#0B1F17] font-medium">{value}</span>
            </div>
          ))}
          {deposit.deductionReason && <p className="text-xs text-[#94A3B8]">Reason: {deposit.deductionReason}</p>}

          {deposit.status === "HELD" && !showRefund && (
            <button
              onClick={() => setShowRefund(true)}
              className="w-full border border-[#E5E7EB] text-[#0B1F17] py-2 rounded-lg text-sm hover:bg-[#F7FAF8] transition-colors duration-200"
            >
              Refund / Settle Deposit
            </button>
          )}

          {deposit.status === "HELD" && showRefund && (
            <form onSubmit={handleRefund} className="space-y-2 pt-2 border-t border-[#F1F5F9]">
              <label className="block text-xs font-medium text-[#0B1F17]">Deductions (kept by landlord)</label>
              <input
                type="number"
                min="0"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#15803D] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#116932] transition-colors duration-200 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefund(false)}
                  className="px-3 text-sm text-[#64748B] hover:text-[#0B1F17] transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

const MAINTENANCE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"];

function MaintenanceSection({ tenantId }) {
  const { data: requests, retry } = useAsync(() => getTenantMaintenanceRequests(tenantId), [tenantId]);

  async function handleStatusChange(id, status) {
    await updateMaintenanceRequestStatus(id, status);
    retry();
  }

  if (!requests || requests.length === 0) return null;

  return (
    <div className="mt-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="font-semibold text-[#0B1F17] text-sm">Maintenance Requests</h2>
      </div>
      <div className="divide-y divide-[#F1F5F9]">
        {requests.map((r) => (
          <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-[#0B1F17] truncate">{r.title}</p>
              {r.description && <p className="text-xs text-[#64748B] truncate">{r.description}</p>}
              <p className="text-xs text-[#94A3B8] mt-0.5">{formatDate(r.createdAt)}</p>
            </div>
            <select
              value={r.status}
              onChange={(e) => handleStatusChange(r.id, e.target.value)}
              className="text-xs border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40 shrink-0"
            >
              {MAINTENANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: tenant, loading: tLoading, error: tError, retry: tRetry } = useAsync(() => getTenantById(id), [id]);
  const { data: history, loading: hLoading, error: hError, retry: hRetry } = useAsync(() => getTenantPaymentHistory(id), [id]);
  const { data: kyc } = useAsync(() => getTenantKyc(id), [id]);
  const { data: notifications } = useAsync(() => getNotificationsForTenant(id), [id]);
  const [showEditLease, setShowEditLease] = useState(false);

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
              ...(tenant.serviceCharge > 0
                ? [
                    { label: "Service Charge", value: formatNaira(tenant.serviceCharge) },
                    { label: "Total Due", value: formatNaira(currentCycle.due + tenant.serviceCharge) },
                  ]
                : []),
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
            {tenant.serviceCharge > 0 && (
              <p className="text-xs text-[#94A3B8]">Service charge is billed separately from rent and isn't reflected in Balance/Credit above.</p>
            )}
            {currentCycle.creditApplied > 0 && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                {formatNaira(currentCycle.creditApplied)} credit applied from last cycle's overpayment.
              </p>
            )}
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

          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#0B1F17] text-sm">Lease & Guarantor</h2>
              <button
                onClick={() => setShowEditLease(true)}
                className="text-xs text-[#15803D] font-medium hover:underline"
              >
                Edit
              </button>
            </div>
            {tenant.leaseEndDate ? (
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">Lease Ends</span>
                <span className="text-[#0B1F17] font-medium">{formatDate(tenant.leaseEndDate)}</span>
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8]">No lease end date on record.</p>
            )}
            {tenant.leaseEndDate && daysUntil(tenant.leaseEndDate) <= 30 && daysUntil(tenant.leaseEndDate) >= 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                Lease ends in {daysUntil(tenant.leaseEndDate)} day{daysUntil(tenant.leaseEndDate) === 1 ? "" : "s"} — renewal due soon.
              </p>
            )}
            {tenant.guarantorName ? (
              <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
                {[
                  { label: "Guarantor", value: tenant.guarantorName },
                  { label: "Phone", value: tenant.guarantorPhone },
                  { label: "Relationship", value: tenant.guarantorRelationship },
                ]
                  .filter((f) => f.value)
                  .map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-[#64748B]">{label}</span>
                      <span className="text-[#0B1F17]">{value}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8]">No guarantor on record.</p>
            )}
          </div>

          <DepositCard tenantId={id} />

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

          <MaintenanceSection tenantId={id} />
        </div>
      </div>

      {showEditLease && (
        <EditLeaseModal tenant={tenant} onClose={() => setShowEditLease(false)} onSaved={() => tRetry()} />
      )}
    </div>
  );
}
