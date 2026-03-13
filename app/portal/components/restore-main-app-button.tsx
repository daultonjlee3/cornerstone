"use client";

import { useActionState } from "react";
import { restoreMainAppAccessAction } from "../actions";

export function RestoreMainAppButton() {
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null): Promise<{ error?: string } | null> => {
      return restoreMainAppAccessAction(_prev);
    },
    null as { error?: string } | null
  );

  return (
    <form action={formAction} className="contents">
      <button
        type="submit"
        className="rounded-lg border border-amber-500 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-500/20"
      >
        Restore my main app access
      </button>
      {state?.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
