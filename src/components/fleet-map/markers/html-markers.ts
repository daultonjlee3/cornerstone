export function truckMarkerHtml(state: string, unitNumber: string): string {
  const label = unitNumber.replace(/^#?/, "").slice(0, 4);
  return `<span class="opmap-truck opmap-truck--${state}" data-state="${state}">
    <span class="opmap-truck__ring"></span>
    <span class="opmap-truck__core">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <path d="M4 14h1.5a2 2 0 1 0 4 0H10l2-4h5v4h1.5a2 2 0 1 0 4 0H22V9l-2.5-4h-7L10 9H4v5z" stroke-linejoin="round"/>
      </svg>
      <span class="opmap-truck__label">${label}</span>
    </span>
  </span>`;
}

export function jobMarkerHtml(state: string, priority: string): string {
  const pri = priority === "urgent" || priority === "high" ? priority : "default";
  return `<span class="opmap-job opmap-job--${state} opmap-job--pri-${pri}" data-state="${state}">
    <span class="opmap-job__diamond"></span>
    <span class="opmap-job__icon">◆</span>
  </span>`;
}

export function clusterMarkerHtml(count: number, kind: "truck" | "job" | "mixed"): string {
  return `<span class="opmap-cluster opmap-cluster--${kind}">
    <span class="opmap-cluster__count">${count}</span>
  </span>`;
}
