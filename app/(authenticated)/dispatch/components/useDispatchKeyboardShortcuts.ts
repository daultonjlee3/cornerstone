"use client";

import { useEffect, useRef } from "react";
import type { FleetRecommendationInstance } from "@/src/types/fleet";
import type { AssignmentPanelMode } from "./useDispatchMapAssignment";

type UseDispatchKeyboardShortcutsArgs = {
  enabled?: boolean;
  recommendations: FleetRecommendationInstance[];
  activeRecommendationId: string | null;
  panelMode: AssignmentPanelMode;
  selectedJobId: string | null;
  unassignedJobIds: string[];
  onAcceptRecommendation: (id: string) => void;
  onDismissRecommendation: (id: string) => void;
  onConfirmAssignment: () => void;
  onCancelPanel: () => void;
  onSelectJob: (id: string | null) => void;
  onHighlightRecommendation: (rec: FleetRecommendationInstance | null) => void;
  onBulkAcceptRecommendations: () => void;
  onRefresh: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useDispatchKeyboardShortcuts({
  enabled = true,
  recommendations,
  activeRecommendationId,
  panelMode,
  selectedJobId,
  unassignedJobIds,
  onAcceptRecommendation,
  onDismissRecommendation,
  onConfirmAssignment,
  onCancelPanel,
  onSelectJob,
  onHighlightRecommendation,
  onBulkAcceptRecommendations,
  onRefresh,
}: UseDispatchKeyboardShortcutsArgs) {
  const recIndexRef = useRef(0);
  const jobIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === "a" && event.shiftKey) {
          event.preventDefault();
          onBulkAcceptRecommendations();
        }
        return;
      }

      const heroRec = recommendations[0] ?? null;
      const activeRec =
        recommendations.find((rec) => rec.id === activeRecommendationId) ?? heroRec;

      switch (event.key) {
        case "Enter":
          if (panelMode === "confirm") {
            event.preventDefault();
            onConfirmAssignment();
            return;
          }
          if (activeRec) {
            event.preventDefault();
            onAcceptRecommendation(activeRec.id);
          }
          break;

        case "a":
        case "A":
          if (activeRec) {
            event.preventDefault();
            onAcceptRecommendation(activeRec.id);
          }
          break;

        case "r":
        case "R":
        case "Backspace":
          if (panelMode === "confirm" || panelMode === "invalid") {
            event.preventDefault();
            onCancelPanel();
            return;
          }
          if (activeRec) {
            event.preventDefault();
            onDismissRecommendation(activeRec.id);
          }
          break;

        case "Escape":
          event.preventDefault();
          onCancelPanel();
          onSelectJob(null);
          onHighlightRecommendation(null);
          break;

        case "ArrowDown":
        case "j": {
          event.preventDefault();
          if (unassignedJobIds.length === 0) return;
          const idx = selectedJobId
            ? unassignedJobIds.indexOf(selectedJobId)
            : jobIndexRef.current;
          const next = Math.min(unassignedJobIds.length - 1, (idx < 0 ? 0 : idx) + 1);
          jobIndexRef.current = next;
          onSelectJob(unassignedJobIds[next] ?? null);
          break;
        }

        case "ArrowUp":
        case "k": {
          event.preventDefault();
          if (unassignedJobIds.length === 0) return;
          const idx = selectedJobId
            ? unassignedJobIds.indexOf(selectedJobId)
            : jobIndexRef.current;
          const prev = Math.max(0, (idx < 0 ? 0 : idx) - 1);
          jobIndexRef.current = prev;
          onSelectJob(unassignedJobIds[prev] ?? null);
          break;
        }

        case "ArrowRight":
        case "]": {
          if (recommendations.length === 0) return;
          event.preventDefault();
          const currentIdx = activeRec
            ? recommendations.findIndex((rec) => rec.id === activeRec.id)
            : recIndexRef.current;
          const next = Math.min(recommendations.length - 1, currentIdx + 1);
          recIndexRef.current = next;
          onHighlightRecommendation(recommendations[next] ?? null);
          break;
        }

        case "ArrowLeft":
        case "[": {
          if (recommendations.length === 0) return;
          event.preventDefault();
          const currentIdx = activeRec
            ? recommendations.findIndex((rec) => rec.id === activeRec.id)
            : recIndexRef.current;
          const prev = Math.max(0, currentIdx - 1);
          recIndexRef.current = prev;
          onHighlightRecommendation(recommendations[prev] ?? null);
          break;
        }

        case "?":
          event.preventDefault();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    recommendations,
    activeRecommendationId,
    panelMode,
    selectedJobId,
    unassignedJobIds,
    onAcceptRecommendation,
    onDismissRecommendation,
    onConfirmAssignment,
    onCancelPanel,
    onSelectJob,
    onHighlightRecommendation,
    onBulkAcceptRecommendations,
    onRefresh,
  ]);
}
