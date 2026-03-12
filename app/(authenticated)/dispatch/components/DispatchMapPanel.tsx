"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import type { DispatchWorkOrder } from "../types";
import type {
  DispatchFilterOptions,
  DispatchWorkforce,
} from "../dispatch-data";
import type { DispatchFilterState } from "../filter-state";
import {
  buildTechnicianRoute,
  clusterWorkOrders,
  hasCoordinate,
} from "../dispatch-map-utils";
import { Button } from "@/src/components/ui/button";

type DispatchMapPanelProps = {
  workOrders: DispatchWorkOrder[];
  workforce: DispatchWorkforce;
  filterState: DispatchFilterState;
  filterOptions: DispatchFilterOptions;
  selectedTechnicianId: string | null;
  selectedWorkOrderId: string | null;
  hoveredWorkOrderId?: string | null;
  assignmentPending?: boolean;
  onSelectTechnician: (technicianId: string | null) => void;
  onSelectWorkOrder: (workOrderId: string | null) => void;
  onHoverWorkOrder?: (workOrderId: string | null) => void;
  onOpenWorkOrderDrawer: (workOrderId: string) => void;
  onOpenWorkOrder: (workOrderId: string) => void;
  onAssignFromMap: (workOrderId: string, technicianId: string) => Promise<void>;
  onPatchFilters: (patch: Partial<DispatchFilterState>) => void;
};

function priorityClass(priority: string | null | undefined): string {
  const value = String(priority ?? "").toLowerCase();
  if (value === "emergency") return "dispatch-map-pin-emergency";
  if (value === "urgent") return "dispatch-map-pin-urgent";
  if (value === "high") return "dispatch-map-pin-high";
  if (value === "medium") return "dispatch-map-pin-medium";
  return "dispatch-map-pin-low";
}

function shortWorkOrderLabel(workOrder: DispatchWorkOrder): string {
  if (workOrder.work_order_number) return workOrder.work_order_number;
  if (workOrder.title) return workOrder.title.slice(0, 18);
  return `WO-${workOrder.id.slice(0, 6)}`;
}

function workOrderPinIcon(
  workOrder: DispatchWorkOrder,
  selected: boolean,
  hovered: boolean
) {
  const label = shortWorkOrderLabel(workOrder).replace(/^WO-?/i, "").slice(0, 8) || "WO";
  const stateClass = selected
    ? "dispatch-map-pin-selected"
    : hovered
      ? "dispatch-map-pin-hovered"
      : "";
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin ${priorityClass(workOrder.priority)} ${stateClass}">${label}</span>`,
    iconSize: selected ? [36, 36] : [30, 30],
    iconAnchor: selected ? [18, 18] : [15, 15],
  });
}

const technicianPinIcon = divIcon({
  className: "dispatch-map-pin-shell",
  html: '<span class="dispatch-map-pin dispatch-map-pin-technician">T</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function clusterPinIcon(count: number) {
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin dispatch-map-pin-cluster">${count}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function locationLine(workOrder: DispatchWorkOrder): string {
  const pieces = [
    workOrder.property_name,
    workOrder.building_name,
    workOrder.unit_name,
    workOrder.location,
  ].filter(Boolean);
  return pieces.join(" / ");
}

export function DispatchMapPanel({
  workOrders,
  workforce,
  filterState,
  filterOptions,
  selectedTechnicianId,
  selectedWorkOrderId,
  hoveredWorkOrderId = null,
  assignmentPending = false,
  onSelectTechnician,
  onSelectWorkOrder,
  onHoverWorkOrder,
  onOpenWorkOrderDrawer,
  onOpenWorkOrder,
  onAssignFromMap,
  onPatchFilters,
}: DispatchMapPanelProps) {
  function MapZoomWatcher() {
    const map = useMapEvents({
      zoomend: (event) => {
        setZoomLevel(event.target.getZoom());
      },
    });
    useEffect(() => {
      setZoomLevel(map.getZoom());
    }, [map]);
    return null;
  }

  /** After mount, tell Leaflet to re-measure the container (fixes blank map in combined view / dynamic layout). */
  function MapResizeOnMount() {
    const map = useMap();
    useEffect(() => {
      const t = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      return () => clearTimeout(t);
    }, [map]);
    return null;
  }

  /** Pan map to selected work order when selection changes from list or map. */
  function PanToSelectedWorkOrder() {
    const map = useMap();
    const selected = selectedWorkOrderId
      ? workOrderCoordinates.find((wo) => wo.id === selectedWorkOrderId)
      : null;
    useEffect(() => {
      if (!selected?.latitude || !selected?.longitude) return;
      map.setView(
        [selected.latitude as number, selected.longitude as number],
        Math.max(map.getZoom(), 14),
        { animate: true, duration: 0.35 }
      );
    }, [selected?.id, map]);
    return null;
  }

  function FitBoundsToDispatchPoints({
    points,
  }: {
    points: Array<{ latitude: number; longitude: number }>;
  }) {
    const map = useMap();
    const signature = points
      .map((point) => `${point.latitude.toFixed(4)}:${point.longitude.toFixed(4)}`)
      .join("|");
    const [appliedSignature, setAppliedSignature] = useState<string>("");
    useEffect(() => {
      if (points.length === 0) return;
      if (signature === appliedSignature) return;
      const bounds = latLngBounds(
        points.map((point) => [point.latitude, point.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
      setAppliedSignature(signature);
    }, [appliedSignature, map, points, signature]);
    return null;
  }

  const [zoomLevel, setZoomLevel] = useState(11);
  const [mapMounted, setMapMounted] = useState(false);
  useEffect(() => setMapMounted(true), []);

  const propertyOptions = useMemo(() => {
    if (!filterState.companyId) return filterOptions.properties;
    return filterOptions.properties.filter((row) => row.company_id === filterState.companyId);
  }, [filterOptions.properties, filterState.companyId]);

  const workOrderCoordinates = useMemo(
    () =>
      workOrders.filter((workOrder) =>
        hasCoordinate(workOrder.latitude, workOrder.longitude)
      ),
    [workOrders]
  );
  const technicianCoordinates = useMemo(
    () =>
      workforce.technicians.filter((technician) =>
        hasCoordinate(technician.latitude, technician.longitude)
      ),
    [workforce.technicians]
  );
  const mapCenter = useMemo(() => {
    const coordinatePool: Array<{ latitude: number; longitude: number }> = [];
    workOrderCoordinates.forEach((workOrder) => {
      coordinatePool.push({
        latitude: workOrder.latitude as number,
        longitude: workOrder.longitude as number,
      });
    });
    technicianCoordinates.forEach((technician) => {
      coordinatePool.push({
        latitude: technician.latitude as number,
        longitude: technician.longitude as number,
      });
    });
    if (coordinatePool.length === 0) return { latitude: 39.5, longitude: -98.35 };
    const latitude =
      coordinatePool.reduce((sum, point) => sum + point.latitude, 0) /
      coordinatePool.length;
    const longitude =
      coordinatePool.reduce((sum, point) => sum + point.longitude, 0) /
      coordinatePool.length;
    return { latitude, longitude };
  }, [technicianCoordinates, workOrderCoordinates]);

  const clusters = useMemo(
    () => clusterWorkOrders(workOrderCoordinates, zoomLevel),
    [workOrderCoordinates, zoomLevel]
  );
  const fitBoundsPoints = useMemo(
    () => [
      ...workOrderCoordinates.map((workOrder) => ({
        latitude: workOrder.latitude as number,
        longitude: workOrder.longitude as number,
      })),
      ...technicianCoordinates.map((technician) => ({
        latitude: technician.latitude as number,
        longitude: technician.longitude as number,
      })),
    ],
    [technicianCoordinates, workOrderCoordinates]
  );

  const selectedTechnician = useMemo(
    () =>
      workforce.technicians.find((technician) => technician.id === selectedTechnicianId) ?? null,
    [selectedTechnicianId, workforce.technicians]
  );
  const selectedWorkOrder = useMemo(
    () => workOrders.find((workOrder) => workOrder.id === selectedWorkOrderId) ?? null,
    [selectedWorkOrderId, workOrders]
  );
  const selectedRoute = useMemo(() => {
    if (!selectedTechnician) return null;
    return buildTechnicianRoute(selectedTechnician, workOrders, filterState.selectedDate);
  }, [filterState.selectedDate, selectedTechnician, workOrders]);

  const canAssignFromMap = Boolean(
    selectedWorkOrder &&
      selectedTechnician &&
      selectedWorkOrder.assigned_technician_id !== selectedTechnician.id
  );

  const compactSelect = "ui-select min-h-0 w-full min-w-0 py-1 text-[10px]";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex shrink-0 items-center justify-between gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Map
        </p>
        <span className="text-[9px] text-[var(--muted)]">
          {workOrderCoordinates.length} jobs · {technicianCoordinates.length} techs
        </span>
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-1">
        <select
          className={compactSelect}
          value={filterState.technicianId}
          onChange={(e) => onPatchFilters({ technicianId: e.target.value })}
          title="Focus technician"
        >
          <option value="">All techs</option>
          {filterOptions.technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          className={compactSelect}
          value={filterState.priority}
          onChange={(e) => onPatchFilters({ priority: e.target.value })}
          title="Priority"
        >
          <option value="">Priority</option>
          {filterOptions.priorities.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className={compactSelect}
          value={filterState.propertyId}
          onChange={(e) => onPatchFilters({ propertyId: e.target.value })}
          title="Property"
        >
          <option value="">Property</option>
          {propertyOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.property_name ?? p.name ?? p.id}</option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded border border-[var(--card-border)] bg-[var(--card)]/50" style={{ minHeight: 350 }}>
        {!mapMounted ? (
          <div className="flex h-full min-h-[350px] items-center justify-center text-[11px] text-[var(--muted)]">
            Loading map…
          </div>
        ) : (
        <MapContainer
          center={[mapCenter.latitude, mapCenter.longitude]}
          zoom={zoomLevel}
          minZoom={3}
          maxZoom={19}
          scrollWheelZoom
          className="h-full w-full"
        >
          <MapZoomWatcher />
          <MapResizeOnMount />
          <PanToSelectedWorkOrder />
          <FitBoundsToDispatchPoints points={fitBoundsPoints} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {clusters.map((cluster) => {
            if (cluster.workOrders.length === 1) {
              const workOrder = cluster.workOrders[0];
              return (
                <Marker
                  key={workOrder.id}
                  position={[workOrder.latitude as number, workOrder.longitude as number]}
                  icon={workOrderPinIcon(
                    workOrder,
                    selectedWorkOrderId === workOrder.id,
                    hoveredWorkOrderId === workOrder.id
                  )}
                  eventHandlers={{
                    click: () => {
                      onSelectWorkOrder(workOrder.id);
                      onOpenWorkOrderDrawer(workOrder.id);
                    },
                    mouseover: () => onHoverWorkOrder?.(workOrder.id),
                    mouseout: () => onHoverWorkOrder?.(null),
                  }}
                >
                  <Popup>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-800">
                        {shortWorkOrderLabel(workOrder)}
                      </p>
                      <p className="text-xs text-slate-700">
                        {workOrder.title ?? "Work order"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {workOrder.priority ?? "medium"} · {workOrder.status ?? "new"}
                      </p>
                      <p className="text-xs text-slate-600">{locationLine(workOrder)}</p>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          onClick={() => onOpenWorkOrderDrawer(workOrder.id)}
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          onClick={() => onOpenWorkOrder(workOrder.id)}
                        >
                          Open work order
                        </button>
                        {selectedTechnician &&
                        selectedTechnician.id !== workOrder.assigned_technician_id ? (
                          <button
                            type="button"
                            className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                            onClick={() => onAssignFromMap(workOrder.id, selectedTechnician.id)}
                          >
                            Assign to {selectedTechnician.name}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return (
              <Marker
                key={cluster.id}
                position={[cluster.latitude, cluster.longitude]}
                icon={clusterPinIcon(cluster.workOrders.length)}
              >
                <Popup>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-800">
                      {cluster.workOrders.length} nearby work orders
                    </p>
                    <div className="max-h-44 space-y-1 overflow-auto">
                      {cluster.workOrders.slice(0, 10).map((workOrder) => (
                        <button
                          key={workOrder.id}
                          type="button"
                          className="block w-full rounded border border-slate-200 px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            onSelectWorkOrder(workOrder.id);
                            onOpenWorkOrderDrawer(workOrder.id);
                          }}
                          onMouseEnter={() => onHoverWorkOrder?.(workOrder.id)}
                          onMouseLeave={() => onHoverWorkOrder?.(null)}
                        >
                          {shortWorkOrderLabel(workOrder)} · {workOrder.priority ?? "medium"} ·{" "}
                          {workOrder.status ?? "new"}
                        </button>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {technicianCoordinates.map((technician) => (
            <Marker
              key={technician.id}
              position={[technician.latitude as number, technician.longitude as number]}
              icon={technicianPinIcon}
              eventHandlers={{
                click: () => onSelectTechnician(technician.id),
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800">{technician.name}</p>
                  <p className="text-xs text-slate-600">
                    {technician.currentAssignments} assignments · {technician.workloadHoursToday.toFixed(1)}h
                  </p>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    onClick={() => onSelectTechnician(technician.id)}
                  >
                    Show route
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {selectedRoute && selectedRoute.orderedJobs.length > 0 ? (
            <Polyline
              positions={
                [
                  [selectedRoute.start.latitude, selectedRoute.start.longitude],
                  ...selectedRoute.orderedJobs.map(
                    (workOrder) =>
                      [
                        workOrder.latitude as number,
                        workOrder.longitude as number,
                      ] as [number, number]
                  ),
                ] as [number, number][]
              }
              pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.7 }}
            />
          ) : null}
        </MapContainer>
        )}
      </div>

      <section className="shrink-0 space-y-1.5 rounded-lg border border-[var(--card-border)]/80 bg-[var(--background)]/40 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            className="ui-select min-h-0 flex-1 min-w-0 py-1.5 text-sm"
            value={selectedTechnicianId ?? ""}
            onChange={(event) =>
              onSelectTechnician(event.target.value ? event.target.value : null)
            }
          >
            <option value="">Technician route</option>
            {workforce.technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
          <select
            className="ui-select min-h-0 flex-1 min-w-0 py-1.5 text-sm"
            value={selectedWorkOrderId ?? ""}
            onChange={(event) =>
              onSelectWorkOrder(event.target.value ? event.target.value : null)
            }
          >
            <option value="">Work order</option>
            {workOrders.map((workOrder) => (
              <option key={workOrder.id} value={workOrder.id}>
                {shortWorkOrderLabel(workOrder)} · {workOrder.priority ?? "medium"}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="shrink-0 text-[11px]"
            disabled={!canAssignFromMap || assignmentPending}
            onClick={() => {
              if (!selectedWorkOrder || !selectedTechnician) return;
              onAssignFromMap(selectedWorkOrder.id, selectedTechnician.id);
            }}
          >
            {assignmentPending ? "…" : "Assign"}
          </Button>
        </div>

        {selectedRoute ? (
          <div className="max-h-32 space-y-1 overflow-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Technician Route
            </p>
            {selectedRoute.orderedJobs.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No geo-located assignments for this technician.</p>
            ) : (
              <ul className="space-y-0.5">
                {selectedRoute.orderedJobs.map((wo) => {
                  const timeStr = wo.scheduled_start
                    ? new Date(wo.scheduled_start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
                    : "—";
                  const title = wo.title ?? wo.work_order_number ?? "Work order";
                  return (
                    <li key={wo.id} className="text-xs text-[var(--foreground)]">
                      {timeStr} – {title}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
