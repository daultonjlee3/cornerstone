"use client";

import {
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  Map,
  Settings,
  Sparkles,
  Truck,
} from "lucide-react";

const METRICS = [
  { label: "Jobs Completed", value: "24", delta: "+18%" },
  { label: "Fleet Utilization", value: "82%", delta: "+9%" },
  { label: "On-Time Performance", value: "91%", delta: "+7%" },
  { label: "Contribution Margin", value: "$142K", delta: "+16%" },
] as const;

const MOBILE_RECS = [
  { title: "Reschedule Job", impact: "+$2,450 margin" },
  { title: "Reroute Driver", impact: "-12 mi deadhead" },
  { title: "Deploy Closer Unit", impact: "+1.8 hrs utilization" },
] as const;

export function FleetHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-8 rounded-3xl bg-teal-400/10 blur-3xl"
        aria-hidden
      />
      <div className="fm-dashboard relative overflow-hidden rounded-2xl border border-teal-400/20 bg-slate-950/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65),0_0_0_1px_rgba(45,212,191,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-teal-400" aria-hidden />
            <span className="text-sm font-semibold text-white">Fleet Command Center</span>
          </div>
          <span className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal-300">
            Live
          </span>
        </div>

        <div className="flex">
          <aside className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-white/10 py-4 sm:flex">
            {[LayoutDashboard, BarChart3, Map, AlertTriangle, Settings].map((Icon, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  i === 0 ? "bg-teal-400/15 text-teal-400" : "text-slate-500"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {METRICS.map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border border-white/10 bg-slate-900/80 p-2.5 sm:p-3"
                >
                  <p className="text-[10px] text-slate-400 sm:text-xs">{m.label}</p>
                  <p className="mt-0.5 text-base font-bold text-white sm:text-lg">{m.value}</p>
                  <p className="text-[10px] font-medium text-teal-400 sm:text-xs">{m.delta} vs yesterday</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-teal-400/25 bg-gradient-to-r from-teal-400/10 to-cyan-500/5 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white sm:text-sm">Top Recommendation</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-300 sm:text-xs">
                    Reschedule 3:00 PM job in Houston to tomorrow morning.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] sm:text-xs">
                    <span className="rounded bg-teal-400/15 px-1.5 py-0.5 text-teal-300">
                      +$2,450 Margin
                    </span>
                    <span className="rounded bg-teal-400/15 px-1.5 py-0.5 text-teal-300">
                      +2.1 hrs Utilization
                    </span>
                    <span className="rounded bg-teal-400/15 px-1.5 py-0.5 text-teal-300">
                      -18 mi Deadhead
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-slate-300">
                      View Details
                    </span>
                    <span className="rounded-md bg-teal-400 px-2 py-1 text-[10px] font-medium text-slate-950">
                      Apply
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-3 h-28 overflow-hidden rounded-lg border border-white/10 bg-slate-900/60 sm:h-32">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(45,212,191,0.08),transparent_50%)]" />
              <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              {[
                { x: "18%", y: "45%" },
                { x: "42%", y: "30%" },
                { x: "58%", y: "55%" },
                { x: "72%", y: "38%" },
                { x: "85%", y: "62%" },
              ].map((pos, i) => (
                <div
                  key={i}
                  className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-teal-400/20 ring-2 ring-teal-400/50"
                  style={{ left: pos.x, top: pos.y }}
                >
                  <Truck className="h-2.5 w-2.5 text-teal-400" aria-hidden />
                </div>
              ))}
              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                <path
                  d="M 60 50 Q 120 20 180 60 T 280 45"
                  fill="none"
                  stroke="rgba(45,212,191,0.35)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-2 -right-2 w-36 rounded-xl border border-white/15 bg-slate-900/95 p-2.5 shadow-xl sm:-right-4 sm:w-44">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
            Recommendations
          </p>
          <ul className="mt-2 space-y-2">
            {MOBILE_RECS.map((rec) => (
              <li
                key={rec.title}
                className="rounded-md border border-white/10 bg-slate-950/80 px-2 py-1.5"
              >
                <p className="text-[10px] font-medium text-white">{rec.title}</p>
                <p className="text-[9px] text-teal-400">{rec.impact}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute -bottom-6 -left-4 hidden h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/20 bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg sm:flex lg:-left-8 lg:h-20 lg:w-20">
          <Truck className="h-8 w-8 text-teal-400/80 lg:h-10 lg:w-10" aria-hidden />
        </div>
      </div>
    </div>
  );
}
