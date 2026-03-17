"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getEffectiveUserId } from "@/src/lib/auth-context";

export type TourActionResult = { error?: string };

/** Mark a tour as completed for the current (effective) user. */
export async function markTourComplete(tourId: string): Promise<TourActionResult> {
  const supabase = await createClient();
  const userId = await getEffectiveUserId(supabase);
  if (!userId) return { error: "Unauthorized." };

  const { error } = await supabase.from("tour_completions").upsert(
    { user_id: userId, tour_id: tourId, completed_at: new Date().toISOString() },
    { onConflict: "user_id,tour_id" }
  );
  if (error) return { error: error.message };
  return {};
}

/** Remove completion so the tour can run again (restart). */
export async function resetTour(tourId: string): Promise<TourActionResult> {
  const supabase = await createClient();
  const userId = await getEffectiveUserId(supabase);
  if (!userId) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("tour_completions")
    .delete()
    .eq("user_id", userId)
    .eq("tour_id", tourId);
  if (error) return { error: error.message };
  return {};
}

/** Fetch completed tour IDs for the current (effective) user. Used by layout to pass to TourProvider. */
export async function getCompletedTourIds(): Promise<string[]> {
  const supabase = await createClient();
  const userId = await getEffectiveUserId(supabase);
  if (!userId) return [];

  const { data } = await supabase
    .from("tour_completions")
    .select("tour_id")
    .eq("user_id", userId);
  const rows = (data ?? []) as { tour_id: string }[];
  return rows.map((r) => r.tour_id);
}
