import type { ReactNode } from "react";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className = "" }: DataTableProps) {
  return <div className={`ui-table-shell ${className}`}><div className="overflow-x-auto">{children}</div></div>;
}

export function Table({ children, className = "" }: DataTableProps) {
  return <table className={`w-full text-left text-sm ${className}`}>{children}</table>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
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
};

export function Tr({ children, className = "", clickable = false }: TrProps) {
  return (
    <tr
      className={`border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--background)]/45 ${
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
