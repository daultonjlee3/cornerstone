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
    <Card className="shrink-0">
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
