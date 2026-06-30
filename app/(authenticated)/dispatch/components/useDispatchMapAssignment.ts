"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AssignmentSuggestResult,
  AssignmentValidationResult,
  CommitAssignmentResult,
} from "@/src/lib/fleet/dispatch/assignment-service";

export type AssignmentPanelMode =
  | "idle"
  | "confirm"
  | "invalid"
  | "loading";

export type AssignmentToast = {
  id: string;
  message: string;
  variant: "success" | "error";
};

type UseDispatchMapAssignmentArgs = {
  selectedDate: string;
  branchId: string | null;
  onAssigned: () => void | Promise<void>;
  onOptimisticAssign?: (truckId: string, jobId: string) => void;
};

export function useDispatchMapAssignment({
  selectedDate,
  branchId,
  onAssigned,
  onOptimisticAssign,
}: UseDispatchMapAssignmentArgs) {
  const [panelMode, setPanelMode] = useState<AssignmentPanelMode>("idle");
  const [validation, setValidation] = useState<AssignmentValidationResult | null>(null);
  const [suggestResult, setSuggestResult] = useState<AssignmentSuggestResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [toasts, setToasts] = useState<AssignmentToast[]>([]);
  const toastCounter = useRef(0);

  const pushToast = useCallback((message: string, variant: AssignmentToast["variant"]) => {
    const id = `toast-${++toastCounter.current}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissPanel = useCallback(() => {
    setPanelMode("idle");
    setValidation(null);
  }, []);

  const suggestForJob = useCallback(
    async (jobId: string) => {
      setPanelMode("loading");
      try {
        const res = await fetch("/api/fleet/dispatch/suggest-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, date: selectedDate, branchId }),
        });
        if (!res.ok) throw new Error("Unable to rank trucks for job.");
        const payload = (await res.json()) as AssignmentSuggestResult;
        setSuggestResult(payload);
        setValidation(payload.validation);
        setPanelMode("confirm");
        return payload;
      } catch {
        setPanelMode("idle");
        pushToast("Unable to load assignment recommendation.", "error");
        return null;
      }
    },
    [branchId, pushToast, selectedDate]
  );

  const suggestForTruck = useCallback(
    async (truckId: string) => {
      setPanelMode("loading");
      try {
        const res = await fetch("/api/fleet/dispatch/suggest-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ truckId, date: selectedDate, branchId }),
        });
        if (!res.ok) throw new Error("Unable to rank jobs for truck.");
        const payload = (await res.json()) as AssignmentSuggestResult;
        setSuggestResult(payload);
        setValidation(payload.validation);
        setPanelMode(payload.validation?.valid ? "confirm" : "idle");
        return payload;
      } catch {
        setPanelMode("idle");
        pushToast("Unable to load truck recommendations.", "error");
        return null;
      }
    },
    [branchId, pushToast, selectedDate]
  );

  const validatePair = useCallback(
    async (truckId: string, jobId: string, snapshotId?: string, options?: { silent?: boolean }) => {
      if (!options?.silent) setPanelMode("loading");
      try {
        const res = await fetch("/api/fleet/dispatch/validate-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            truckId,
            jobId,
            date: selectedDate,
            branchId,
            snapshotId,
          }),
        });
        const payload = (await res.json()) as AssignmentValidationResult;
        setValidation(payload);
        setPanelMode(payload.valid ? "confirm" : "invalid");
        return payload;
      } catch {
        setPanelMode("invalid");
        pushToast("Validation failed.", "error");
        return null;
      }
    },
    [branchId, pushToast, selectedDate]
  );

  const commitAssignment = useCallback(
    async (args: {
      truckId: string;
      jobId: string;
      validationId: string;
      snapshotId: string;
      assignmentSource: "manual_drag" | "ai_recommendation" | "map_click";
      recommendationId?: string | null;
    }) => {
      setCommitting(true);
      try {
        const res = await fetch("/api/fleet/dispatch/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...args,
            date: selectedDate,
            branchId,
          }),
        });
        const payload = (await res.json()) as CommitAssignmentResult | { error?: string };
        if (!res.ok) {
          throw new Error("error" in payload ? payload.error : "Assignment failed.");
        }
        const result = payload as CommitAssignmentResult;
        onOptimisticAssign?.(args.truckId, args.jobId);
        pushToast(`${result.unitNumber} assigned to ${result.jobTitle}.`, "success");
        setPanelMode("idle");
        setValidation(null);
        setSuggestResult(null);
        void onAssigned();
        return result;
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Assignment failed.", "error");
        return null;
      } finally {
        setCommitting(false);
      }
    },
    [branchId, onAssigned, onOptimisticAssign, pushToast, selectedDate]
  );

  return {
    panelMode,
    validation,
    suggestResult,
    committing,
    toasts,
    dismissPanel,
    dismissToast: (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    suggestForJob,
    suggestForTruck,
    validatePair,
    commitAssignment,
    setPanelMode,
    setValidation,
  };
}
