type PerfStage = {
  label: string;
  ms: number;
};

export type DispatchPerfReport = {
  label: string;
  totalMs: number;
  stages: PerfStage[];
};

export function createDispatchPerfTimer(label: string) {
  const start = performance.now();
  const stages: PerfStage[] = [];

  return {
    stage(name: string) {
      stages.push({ label: name, ms: Math.round(performance.now() - start) });
    },
    finish(extra?: Record<string, number>): DispatchPerfReport {
      const totalMs = Math.round(performance.now() - start);
      const report: DispatchPerfReport = { label, totalMs, stages };
      if (process.env.NODE_ENV === "development") {
        const rows = [
          ...stages.map((s) => `  ${s.label}: ${s.ms}ms`),
          ...(extra ? Object.entries(extra).map(([k, v]) => `  ${k}: ${v}ms`) : []),
          `  total: ${totalMs}ms`,
        ];
        console.info(`[Dispatch Performance] ${label}\n${rows.join("\n")}`);
      }
      return report;
    },
  };
}
