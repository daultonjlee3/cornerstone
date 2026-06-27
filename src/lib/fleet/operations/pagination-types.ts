export type FleetPaginatedResult<T> = {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  page: number;
  pageSize: number;
};

export type OperationsListQuery = {
  page: number;
  pageSize: number;
  skip: number;
  cursor: string | null;
  date?: string;
  branchId?: string | null;
  severity?: string | null;
  status?: string | null;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export function parseOperationsListQuery(
  searchParams: URLSearchParams,
  defaults?: { pageSize?: number; skip?: number }
): OperationsListQuery {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? String(defaults?.pageSize ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const skip = Math.max(
    0,
    Number.parseInt(searchParams.get("skip") ?? String(defaults?.skip ?? 0), 10) || defaults?.skip || 0
  );
  const cursor = searchParams.get("cursor")?.trim() || null;
  const dateParam = searchParams.get("date")?.trim();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
  const branchId = searchParams.get("branchId")?.trim() || null;
  const severity = searchParams.get("severity")?.trim() || null;
  const status = searchParams.get("status")?.trim() || null;

  return { page, pageSize, skip, cursor, date, branchId, severity, status };
}

export function slicePaginated<T>(
  items: T[],
  query: Pick<OperationsListQuery, "page" | "pageSize" | "skip">
): FleetPaginatedResult<T> {
  const offset = query.skip + (query.page - 1) * query.pageSize;
  const pageItems = items.slice(offset, offset + query.pageSize);
  const totalCount = items.length;
  const hasMore = offset + pageItems.length < totalCount;
  const last = pageItems[pageItems.length - 1] as { id?: string } | undefined;

  return {
    items: pageItems,
    totalCount,
    hasMore,
    nextCursor: hasMore && last?.id ? last.id : null,
    page: query.page,
    pageSize: query.pageSize,
  };
}
