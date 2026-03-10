import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { DataTable } from "@/src/components/ui/data-table";

type WorkloadPanelProps = {
  title: string;
  description: string;
  tableClassName?: string;
  children: React.ReactNode;
};

export function WorkloadPanel({
  title,
  description,
  tableClassName = "",
  children,
}: WorkloadPanelProps) {
  return (
    <Card className="min-h-0 flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <DataTable className={`shadow-none ${tableClassName}`}>{children}</DataTable>
      </CardContent>
    </Card>
  );
}
