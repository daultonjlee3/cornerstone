import type { BulkWorkOrderOpResult } from "../actions";

export function isFatalBulkError(
  r: BulkWorkOrderOpResult | { error: string }
): r is { error: string } {
  return "error" in r && typeof (r as { error: string }).error === "string" && !("succeeded" in r);
}

export type BulkFeedbackMessage = { type: "success" | "error" | "warning"; text: string };

/** User-facing summary for per-row bulk operations (assign, schedule, status, priority, delete). */
export function summarizeBulk(
  verbPhrase: string,
  r: BulkWorkOrderOpResult | { error: string },
  detail?: string
): BulkFeedbackMessage {
  if (isFatalBulkError(r)) {
    return { type: "error", text: r.error };
  }
  const { succeeded, failed } = r;
  const detailSuffix = detail ? ` ${detail}` : "";
  if (failed.length === 0) {
    return {
      type: "success",
      text: `${succeeded} work order${succeeded === 1 ? "" : "s"} ${verbPhrase}.${detailSuffix}`.trim(),
    };
  }
  if (succeeded === 0) {
    const first = failed[0]?.error ?? "Unknown error";
    return {
      type: "error",
      text: `None updated: ${first}${failed.length > 1 ? ` (+${failed.length - 1} more)` : ""}`,
    };
  }
  const errSample = failed
    .slice(0, 2)
    .map((f) => f.error)
    .join("; ");
  return {
    type: "warning",
    text: `${succeeded} work order${succeeded === 1 ? "" : "s"} ${verbPhrase}; ${failed.length} failed (${errSample}${failed.length > 2 ? "…" : ""}).${detailSuffix}`.trim(),
  };
}
