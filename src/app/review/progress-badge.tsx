import type { ReviewCounts } from "@/server/services/review.service";

// "3 to review · 12 approved", or "All approved".
export function ProgressBadge({ toReview, approved }: ReviewCounts) {
  if (toReview === 0 && approved > 0) {
    return <span className="text-sm font-bold text-green-700">✅ All {approved} approved</span>;
  }
  return (
    <span className="text-sm text-slate-600">
      <span className="font-bold text-amber-700">{toReview} to review</span> · {approved} approved
    </span>
  );
}
