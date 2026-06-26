"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type EstimatorCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function EstimatorCard({ title, description, children, className = "" }: EstimatorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`fm-card rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)]/70 p-6 shadow-xl backdrop-blur-sm sm:p-8 ${className}`}
    >
      {title ? (
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </motion.div>
  );
}

export const estimatorInputClass =
  "w-full min-h-[48px] rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 px-4 py-3 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors focus:border-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-400/20";

export const estimatorLabelClass = "block text-sm font-semibold text-[var(--foreground)]";

export const estimatorHintClass = "mt-1.5 text-xs text-[var(--muted)]";
