import { useAsync } from "../../hooks/useAsync";
import { getReliabilityScore, getShareableScoreLink } from "../../services/reliabilityService";
import Spinner from "./Spinner";
import ErrorMessage from "./ErrorMessage";
import Icon from "./Icon";
import ShareLinkButton from "./ShareLinkButton";

const TIER_COLOR = {
  Excellent: "text-emerald-600",
  Good: "text-[#15803D]",
  Fair: "text-amber-600",
  "Needs Improvement": "text-red-600",
};

export default function ReliabilityScoreCard({ tenantId, shareable = true }) {
  const { data, loading, error, retry } = useAsync(() => getReliabilityScore(tenantId), [tenantId]);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="star" className="w-4 h-4 text-[#C9A84C]" />
        <h2 className="font-semibold text-[#0B1F17] text-sm">Rent Reliability Score</h2>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={retry} />}

      {data && (
        <>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-[#0B1F17]">{data.score}</span>
            <span className={`text-sm font-medium ${TIER_COLOR[data.tier] || "text-[#64748B]"}`}>{data.tier}</span>
          </div>
          <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden mt-3">
            <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${data.score}%` }} />
          </div>
          <p className="text-xs text-[#64748B] mt-3">
            {data.onTimeCount} on-time · {data.partialCount} partial · {data.missedCount} missed — across{" "}
            {data.cyclesTracked} {data.cyclesTracked === 1 ? "cycle" : "cycles"} tracked
          </p>
          {shareable && (
            <div className="mt-4">
              <ShareLinkButton getLink={() => getShareableScoreLink(tenantId)} label="Share Score" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
