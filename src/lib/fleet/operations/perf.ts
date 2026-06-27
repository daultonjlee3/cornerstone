type Stage = { label: string; ms: number };

export function createOperationsPerfTimer(label: string) {
  const start = performance.now();
  const stages: Stage[] = [];

  return {
    stage(name: string) {
      stages.push({ label: name, ms: Math.round(performance.now() - start) });
    },
    finish(extra?: Record<string, string | number>) {
      const totalMs = Math.round(performance.now() - start);
      if (process.env.NODE_ENV === "development") {
        const rows = [
          ...stages.map((s) => `  ${s.label}: ${s.ms}ms`),
          ...(extra ? Object.entries(extra).map(([k, v]) => `  ${k}: ${v}`) : []),
          `  total: ${totalMs}ms`,
        ];
        console.info(`[Operations Performance] ${label}\n${rows.join("\n")}`);
      }
      return { label, totalMs, stages };
    },
  };
}

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    if (process.env.NODE_ENV === "development") {
      console.info(`[Operations Performance] ${label}: ${Math.round(performance.now() - start)}ms`);
    }
  }
}
