import type { HTMLAttributes, ReactNode } from "react";
import {
  TablePaginationBar,
  TableShell,
  TableToolbar as DesignTableToolbar,
} from "@/src/components/design-system";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className = "" }: DataTableProps) {
  return <TableShell className={className}>{children}</TableShell>;
}

export function Table({ children, className = "" }: DataTableProps) {
  return <table className={`w-full text-left text-sm ${className}`}>{children}</table>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--surface-border-subtle)] bg-[var(--surface-default)] cs-text-micro cs-text-muted">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className = "" }: DataTableProps) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>
  );
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
      className={`border-b border-[var(--surface-border-subtle)] last:border-0 transition-colors duration-[var(--duration-fast)] hover:bg-[var(--surface-default)] ${
        clickable ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "" }: DataTableProps) {
  return (
    <td className={`px-4 py-3 align-top cs-text-body text-[var(--text-primary)] ${className}`}>
      {children}
    </td>
  );
}

export function TableToolbar({ children, className = "" }: DataTableProps) {
  return <DesignTableToolbar className={className}>{children}</DesignTableToolbar>;
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
      <td colSpan={colSpan} className="px-4 py-10 text-center cs-text-caption cs-text-muted">
        {message}
      </td>
    </Tr>
  );
}

export function TablePagination(props: {
  page: number;
  totalPages: number;
  totalRows: number;
  showingFrom: number;
  showingTo: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return <TablePaginationBar {...props} />;
}
