/**
 * Next.js page utility helpers.
 * Used by server-component pages to safely read searchParams and route params.
 */

/** Raw shape of Next.js page searchParams before type resolution. */
export type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * Resolve a Next.js searchParams prop that may be either a plain object (Pages
 * Router / static) or a Promise (App Router dynamic, Next.js 15+).
 *
 * Usage in page components:
 *   const params = await resolveSearchParams(searchParams);
 */
export async function resolveSearchParams(
  searchParams: SearchParams | Promise<SearchParams>
): Promise<SearchParams> {
  if (typeof (searchParams as Promise<SearchParams>)?.then === "function") {
    return (searchParams as Promise<SearchParams>);
  }
  return searchParams as SearchParams;
}

/**
 * Extract a single string value from searchParams, normalising arrays to their
 * first element and trimming whitespace. Returns null when absent or empty.
 *
 * Previously copy-pasted verbatim in preventive-maintenance/page.tsx and
 * assets/page.tsx. Use this shared version instead.
 */
export function getStringParam(
  params: SearchParams | null | undefined,
  key: string
): string | null {
  const value = params?.[key];
  if (value == null) return null;
  const raw = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  return raw?.trim() || null;
}
