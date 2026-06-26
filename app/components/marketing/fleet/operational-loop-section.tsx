"use client";

import { FLEET_OPERATIONAL_LOOP } from "@/lib/fleet-marketing-site";
import { FleetSectionHeader } from "./feature-block";
import { ArrowDown } from "lucide-react";

export function OperationalLoopSection() {
  return (
    <div>
      <FleetSectionHeader
        eyebrow="The Operational Loop"
        title="Continuous intelligence for every dispatch decision"
        description="Cornerstone continuously analyzes your operations and recommends the next best action — then measures outcomes and improves over time."
        centered
      />

      <div className="fm-operational-loop mt-12 lg:mt-16">
        <div className="mx-auto max-w-2xl">
          {FLEET_OPERATIONAL_LOOP.map((item, index) => (
            <div key={item.step} className="fm-operational-loop__step" style={{ animationDelay: `${index * 120}ms` }}>
              <div className="fm-operational-loop__node">
                <span className="fm-operational-loop__index">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="fm-operational-loop__title">{item.step}</h3>
              </div>
              <p className="fm-operational-loop__description">{item.description}</p>
              {index < FLEET_OPERATIONAL_LOOP.length - 1 ? (
                <div className="fm-operational-loop__connector" aria-hidden>
                  <ArrowDown className="h-5 w-5 text-teal-400/60" />
                </div>
              ) : (
                <div className="fm-operational-loop__loop-back" aria-hidden>
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-400/70">
                    ↻ Continuous loop
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop horizontal flow */}
        <div className="fm-operational-loop__desktop hidden lg:block">
          <div className="relative mx-auto max-w-6xl">
            <div className="absolute left-[8%] right-[8%] top-8 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
            <div className="grid grid-cols-6 gap-4">
              {FLEET_OPERATIONAL_LOOP.map((item, index) => (
                <div
                  key={item.step}
                  className="fm-operational-loop__desktop-step"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="fm-operational-loop__desktop-node">
                    <span className="text-[10px] font-bold text-teal-400/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-1 text-sm font-bold text-[var(--foreground)]">{item.step}</p>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{item.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-teal-400/60">
              ↻ Continuous loop — Measure feeds back into Understand
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
