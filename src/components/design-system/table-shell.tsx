import type { ReactNode } from "react";

type TableShellProps = {
  children: ReactNode;
  className?: string;
};

export function TableShell({ children, className = "" }: TableShellProps) {
  return (
    <div className={`cs-table-shell min-w-0 ${className}`}>
      <div className="cs-table-shell__scroll">{children}</div>
    </div>
  );
}

export function TableToolbar({ children, className = "" }: TableShellProps) {
  return <div className={`cs-table-toolbar ${className}`}>{children}</div>;
}

export function TablePaginationBar({
  page,
  totalPages,
  totalRows,
  showingFrom,
  showingTo,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  showingFrom: number;
  showingTo: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="cs-table-pagination">
      <p className="cs-text-caption cs-text-muted">
        Showing {showingFrom}–{showingTo} of {totalRows}
      </p>
      <div className="cs-table-pagination__controls">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="cs-table-pagination__button"
        >
          Previous
        </button>
        <span className="cs-text-caption cs-text-muted">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="cs-table-pagination__button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
