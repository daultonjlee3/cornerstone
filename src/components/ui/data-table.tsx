import type { HTMLAttributes, ReactNode } from "react";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className = "" }: DataTableProps) {
  return (
    <div className={`ui-table-shell ${className}`}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, className = "" }: DataTableProps) {
  return <table className={`w-full text-left text-sm ${className}`}>{children}</table>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/55 text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className = "" }: DataTableProps) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

type TrProps = {
  children: ReactNode;
  className?: string;
  clickable?: boolean;
} & HTMLAttributes<HTMLTableRowElement>;

export function Tr({ children, className = "", clickable = false, ...rest }: TrProps) {
  return (
    <tr
      {...rest}
      className={`border-b border-[var(--card-border)]/90 last:border-0 hover:bg-[var(--background)]/52 ${
        clickable ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "" }: DataTableProps) {
  return <td className={`px-4 py-3.5 align-top text-[var(--foreground)] ${className}`}>{children}</td>;
}

export function TableToolbar({ children, className = "" }: DataTableProps) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--card-border)] bg-white/75 p-3 ${className}`}
    >
      {children}
    </div>
  );
}

export function TableEmptyState({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <Tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
        {message}
      </td>
    </Tr>
  );
}

export function TablePagination({
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
    <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--card-border)] bg-white/70 px-3 py-2.5">
      <p className="text-xs text-[var(--muted)]">
        Showing {showingFrom}-{showingTo} of {totalRows}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--foreground)] disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-xs text-[var(--muted)]">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--foreground)] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
