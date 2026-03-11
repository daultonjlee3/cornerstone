import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { addWorkOrderNote } from "@/app/(authenticated)/work-orders/actions";

type NoteType = "internal" | "customer_visible" | "completion";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    body?: string;
    note_type?: NoteType;
    technician_id?: string | null;
  };
  const noteBody = (body.body ?? "").trim();
  if (!noteBody) {
    return NextResponse.json({ error: "Note body is required." }, { status: 400 });
  }

  const noteType: NoteType =
    body.note_type === "customer_visible" || body.note_type === "completion"
      ? body.note_type
      : "internal";
  const result = await addWorkOrderNote(
    id,
    noteBody,
    noteType,
    body.technician_id ?? null
  );
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
