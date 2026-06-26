/** Cornerstone proprietary marker HTML for legacy Leaflet surfaces */

const TRUCK_SVG = `<svg viewBox="0 0 24 32" fill="none" aria-hidden="true">
  <path d="M12 2.5v4.75" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
  <rect x="7.5" y="8.25" width="9" height="5.75" rx="2" fill="rgba(8,12,16,0.94)" stroke="currentColor" stroke-width="1.5"/>
  <rect x="5.5" y="14.25" width="13" height="11.75" rx="3" fill="rgba(8,12,16,0.94)" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="9" cy="24.75" r="2" fill="rgba(0,0,0,0.55)" stroke="currentColor" stroke-width="1"/>
  <circle cx="15" cy="24.75" r="2" fill="rgba(0,0,0,0.55)" stroke="currentColor" stroke-width="1"/>
</svg>`;

const JOB_SVG = `<svg viewBox="0 0 24 28" fill="none" aria-hidden="true">
  <path d="M12 3.25 18.75 7v9.5L12 22.75 5.25 16.5V7L12 3.25Z" fill="rgba(8,12,16,0.92)" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="12" cy="12.5" r="3.25" fill="currentColor" opacity="0.85"/>
</svg>`;

export function truckMarkerHtml(state: string, unitNumber: string): string {
  const label = unitNumber.replace(/^#?/, "").slice(0, 4);
  return `<span class="cs-truck-marker cs-truck-marker--${state}" data-state="${state}">
    <span class="cs-truck-marker__icon">${TRUCK_SVG}</span>
    <span class="cs-truck-marker__label">${label}</span>
  </span>`;
}

export function jobMarkerHtml(state: string, priority: string): string {
  const pri = priority === "urgent" || priority === "high" ? priority : "default";
  return `<span class="cs-job-marker cs-job-marker--${state} cs-job-marker--pri-${pri}" data-state="${state}">
    <span class="cs-job-marker__icon">${JOB_SVG}</span>
  </span>`;
}

export function clusterMarkerHtml(count: number, kind: "truck" | "job" | "mixed"): string {
  const label = count > 99 ? "99+" : String(count);
  return `<span class="cs-cluster cs-cluster--${kind}" style="--cs-cluster-size:32px">
    <span class="cs-cluster__ring cs-cluster__ring--outer"></span>
    <span class="cs-cluster__ring cs-cluster__ring--inner"></span>
    <span class="cs-cluster__core"><span class="cs-cluster__count">${label}</span></span>
  </span>`;
}
