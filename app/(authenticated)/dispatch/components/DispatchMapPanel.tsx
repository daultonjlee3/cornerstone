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
  assignmentPending?: boolean;
  onSelectTechnician: (technicianId: string | null) => void;
  onSelectWorkOrder: (workOrderId: string | null) => void;
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

function workOrderPinIcon(workOrder: DispatchWorkOrder) {
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin ${priorityClass(workOrder.priority)}">WO</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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
  assignmentPending = false,
  onSelectTechnician,
  onSelectWorkOrder,
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

  const propertyOptions = useMemo(() => {
    if (!filterState.companyId) return filterOptions.properties;
    return filterOptions.properties.filter((row) => row.company_id === filterState.companyId);
  }, [filterOptions.properties, filterState.companyId]);
  const buildingOptions = useMemo(() => {
    const scopedByCompany = filterState.companyId
      ? filterOptions.buildings.filter((row) => row.company_id === filterState.companyId)
      : filterOptions.buildings;
    if (!filterState.propertyId) return scopedByCompany;
    return scopedByCompany.filter((row) => row.property_id === filterState.propertyId);
  }, [filterOptions.buildings, filterState.companyId, filterState.propertyId]);

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

  return (
    <div className="flex h-full min-h-[500px] flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)]/90 p-3 shadow-[var(--shadow-soft)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Dispatch Map Intelligence
        </p>
        <span className="rounded-full border border-[var(--card-border)] bg-[var(--background)] px-2 py-0.5 text-[11px] text-[var(--muted-strong)]">
          {workOrderCoordinates.length} jobs · {technicianCoordinates.length} technicians
        </span>
      </div>

      <section className="mb-2 grid gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/55 p-2">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            type="date"
            className="ui-input"
            value={filterState.selectedDate}
            onChange={(event) => onPatchFilters({ selectedDate: event.target.value })}
          />
          <select
            className="ui-select"
            value={filterState.technicianId}
            onChange={(event) => onPatchFilters({ technicianId: event.target.value })}
          >
            <option value="">All technicians</option>
            {filterOptions.technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            className="ui-select"
            value={filterState.priority}
            onChange={(event) => onPatchFilters({ priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {filterOptions.priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={filterState.status}
            onChange={(event) => onPatchFilters({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {filterOptions.statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            className="ui-select"
            value={filterState.propertyId}
            onChange={(event) => onPatchFilters({ propertyId: event.target.value })}
          >
            <option value="">All properties</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>
                {property.property_name ?? property.name ?? property.id}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={filterState.buildingId}
            onChange={(event) => onPatchFilters({ buildingId: event.target.value })}
          >
            <option value="">All buildings</option>
            {buildingOptions.map((building) => (
              <option key={building.id} value={building.id}>
                {building.building_name ?? building.name ?? building.id}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="min-h-[300px] flex-1 overflow-hidden rounded-lg border border-[var(--card-border)]">
        <MapContainer
          center={[mapCenter.latitude, mapCenter.longitude]}
          zoom={zoomLevel}
          scrollWheelZoom
          className="h-full w-full"
        >
          <MapZoomWatcher />
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
                  icon={workOrderPinIcon(workOrder)}
                  eventHandlers={{
                    click: () => {
                      onSelectWorkOrder(workOrder.id);
                      onOpenWorkOrder(workOrder.id);
                    },
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
                          onClick={() => onOpenWorkOrder(workOrder.id)}
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
      </div>

      <section className="mt-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/55 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ui-select"
            value={selectedTechnicianId ?? ""}
            onChange={(event) =>
              onSelectTechnician(event.target.value ? event.target.value : null)
            }
          >
            <option value="">Select technician route</option>
            {workforce.technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={selectedWorkOrderId ?? ""}
            onChange={(event) =>
              onSelectWorkOrder(event.target.value ? event.target.value : null)
            }
          >
            <option value="">Select work order</option>
            {workOrders.map((workOrder) => (
              <option key={workOrder.id} value={workOrder.id}>
                {shortWorkOrderLabel(workOrder)} · {workOrder.priority ?? "medium"}
              </option>
            ))}
          </select>
          <Button
            type="button"
            disabled={!canAssignFromMap || assignmentPending}
            onClick={() => {
              if (!selectedWorkOrder || !selectedTechnician) return;
              onAssignFromMap(selectedWorkOrder.id, selectedTechnician.id);
            }}
          >
            {assignmentPending ? "Assigning…" : "Assign selected on map"}
          </Button>
        </div>

        {selectedRoute ? (
          <div className="mt-2 max-h-32 space-y-1 overflow-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
              Route segments ({selectedRoute.technicianName})
            </p>
            {selectedRoute.segments.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No geo-located assignments for this technician.</p>
            ) : (
              selectedRoute.segments.map((segment) => (
                <p key={`${segment.toWorkOrderId}-${segment.fromLabel}`} className="text-xs text-[var(--foreground)]">
                  {segment.fromLabel} → {segment.toWorkOrderNumber}: {segment.travelMinutes} min ·{" "}
                  {segment.distanceMiles.toFixed(1)} mi
                </p>
              ))
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
