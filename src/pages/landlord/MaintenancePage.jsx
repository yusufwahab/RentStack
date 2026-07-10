import { Link } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getAllMaintenanceRequests, updateMaintenanceRequestStatus } from "../../services/maintenanceService";
import Spinner from "../../components/ui/Spinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { formatDate } from "../../utils/format";

const EMPTY_STATE_IMAGE = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80&auto=format&fit=crop";
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"];

export default function MaintenancePage() {
  const { data: requests, loading, error, retry } = useAsync(getAllMaintenanceRequests);

  async function handleStatusChange(id, status) {
    await updateMaintenanceRequestStatus(id, status);
    retry();
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-xl font-semibold text-[#0B1F17] mb-6">Maintenance Requests</h1>

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={retry} />}

      {!loading && !error && requests && requests.length === 0 && (
        <EmptyState image={EMPTY_STATE_IMAGE} message="No maintenance requests yet." />
      )}

      {!loading && !error && requests && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-[#0B1F17]">{r.title}</p>
                  <Link to={`/tenants/${r.tenantId}`} className="text-xs text-[#15803D] hover:underline">
                    {r.tenantName} · {r.unit}
                  </Link>
                  {r.description && <p className="text-sm text-[#64748B] mt-2">{r.description}</p>}
                  <p className="text-xs text-[#94A3B8] mt-2">{formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <StatusBadge status={r.status} />
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r.id, e.target.value)}
                    className="text-xs border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
