"use client";

type DispatchKeyboardHintsProps = {
  recommendationCount: number;
  unassignedCount: number;
};

export function DispatchKeyboardHints({
  recommendationCount,
  unassignedCount,
}: DispatchKeyboardHintsProps) {
  if (recommendationCount === 0 && unassignedCount === 0) return null;

  return (
    <div className="dispatch-console__keyboard-hints" aria-hidden>
      <span>
        <kbd>A</kbd> accept
      </span>
      <span>
        <kbd>R</kbd> reject
      </span>
      <span>
        <kbd>J</kbd>/<kbd>K</kbd> jobs
      </span>
      <span>
        <kbd>[</kbd>/<kbd>]</kbd> recs
      </span>
      {recommendationCount > 1 ? (
        <span>
          <kbd>Ctrl+Shift+A</kbd> bulk
        </span>
      ) : null}
    </div>
  );
}
