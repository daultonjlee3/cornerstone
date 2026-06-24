export function buildFleetDispatchBoardQuery(
  selectedDate: string,
  branchId?: string | null
): string {
  const params = new URLSearchParams();
  params.set("date", selectedDate);
  if (branchId?.trim()) params.set("branch_id", branchId.trim());
  return params.toString();
}
