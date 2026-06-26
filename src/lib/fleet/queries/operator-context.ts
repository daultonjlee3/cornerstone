import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetDispatchTruckLane } from "@/src/types/fleet";

export type FleetOperatorRecord = {
  id: string;
  name: string;
  certifications: string[];
  truck_qualifications: string[];
  is_active: boolean;
};

export type OperatorContextMaps = {
  operatorsById: Map<string, FleetOperatorRecord>;
  operatorsByName: Map<string, FleetOperatorRecord>;
  ptoOperatorIds: Set<string>;
  dailyHoursByOperator: Map<string, number>;
  weeklyHoursByOperator: Map<string, number>;
  truckToOperatorId: Map<string, string>;
};

function weekStartIso(day: string): string {
  const anchor = new Date(`${day}T12:00:00.000Z`);
  anchor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
  return anchor.toISOString().slice(0, 10);
}

export async function loadOperatorContextMaps(
  supabase: SupabaseClient,
  tenantId: string,
  boardDate: string
): Promise<OperatorContextMaps> {
  const operatorsById = new Map<string, FleetOperatorRecord>();
  const operatorsByName = new Map<string, FleetOperatorRecord>();
  const ptoOperatorIds = new Set<string>();
  const dailyHoursByOperator = new Map<string, number>();
  const weeklyHoursByOperator = new Map<string, number>();
  const truckToOperatorId = new Map<string, string>();

  const [{ data: operators }, { data: ptoRows }, { data: hourRows }, { data: trucks }] =
    await Promise.all([
      supabase
        .from("fleet_operators")
        .select("id, name, certifications, truck_qualifications, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("fleet_operator_time_off")
        .select("operator_id")
        .eq("tenant_id", tenantId)
        .lte("start_date", boardDate)
        .gte("end_date", boardDate),
      supabase
        .from("fleet_operator_hours_daily")
        .select("operator_id, date, committed_hours")
        .eq("tenant_id", tenantId)
        .gte("date", weekStartIso(boardDate))
        .lte("date", boardDate),
      supabase.from("trucks").select("id, capacity, notes").eq("tenant_id", tenantId),
    ]);

  for (const row of operators ?? []) {
    const op = row as {
      id: string;
      name: string;
      certifications: string[] | null;
      truck_qualifications: string[] | null;
      is_active: boolean;
    };
    const record: FleetOperatorRecord = {
      id: op.id,
      name: op.name,
      certifications: op.certifications ?? [],
      truck_qualifications: op.truck_qualifications ?? [],
      is_active: op.is_active,
    };
    operatorsById.set(op.id, record);
    operatorsByName.set(op.name.trim().toLowerCase(), record);
  }

  for (const row of ptoRows ?? []) {
    ptoOperatorIds.add((row as { operator_id: string }).operator_id);
  }

  for (const row of hourRows ?? []) {
    const operatorId = (row as { operator_id: string }).operator_id;
    const hours = Number((row as { committed_hours: number }).committed_hours) || 0;
    const date = (row as { date: string }).date;
    if (date === boardDate) {
      dailyHoursByOperator.set(operatorId, hours);
    }
    weeklyHoursByOperator.set(operatorId, (weeklyHoursByOperator.get(operatorId) ?? 0) + hours);
  }

  for (const row of trucks ?? []) {
    const truck = row as {
      id: string;
      capacity: Record<string, unknown> | null;
      notes: string | null;
    };
    const fromCapacity = truck.capacity?.primary_operator_id;
    if (typeof fromCapacity === "string" && operatorsById.has(fromCapacity)) {
      truckToOperatorId.set(truck.id, fromCapacity);
      continue;
    }
    const match = (truck.notes ?? "").match(/Primary operator:\s*(.+)/i);
    const name = match?.[1]?.trim().toLowerCase();
    if (name) {
      const op = operatorsByName.get(name);
      if (op) truckToOperatorId.set(truck.id, op.id);
    }
  }

  return {
    operatorsById,
    operatorsByName,
    ptoOperatorIds,
    dailyHoursByOperator,
    weeklyHoursByOperator,
    truckToOperatorId,
  };
}

export function enrichTruckLaneWithOperator(
  lane: FleetDispatchTruckLane,
  ctx: OperatorContextMaps
): FleetDispatchTruckLane {
  const operatorId = ctx.truckToOperatorId.get(lane.truck_id);
  if (!operatorId) return lane;

  const operator = ctx.operatorsById.get(operatorId);
  if (!operator) return { ...lane, operator_id: operatorId };

  return {
    ...lane,
    operator_id: operatorId,
    operator_name: operator.name,
    operator_certifications: operator.certifications,
    operator_truck_qualifications: operator.truck_qualifications,
    operator_daily_hours: ctx.dailyHoursByOperator.get(operatorId) ?? 0,
    operator_weekly_hours: ctx.weeklyHoursByOperator.get(operatorId) ?? 0,
    operator_on_pto: ctx.ptoOperatorIds.has(operatorId),
  };
}
