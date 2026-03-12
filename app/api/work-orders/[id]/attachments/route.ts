import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { uploadWorkOrderAttachment } from "@/app/(authenticated)/work-orders/actions";

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
    fileDataUrl?: string;
    fileName?: string;
    mimeType?: string;
    caption?: string | null;
    technician_id?: string | null;
  };
  if (!body.fileDataUrl || !body.fileName || !body.mimeType) {
    return NextResponse.json(
      { error: "fileDataUrl, fileName, and mimeType are required." },
      { status: 400 }
    );
  }

  const result = await uploadWorkOrderAttachment(id, {
    fileDataUrl: body.fileDataUrl,
    fileName: body.fileName,
    mimeType: body.mimeType,
    caption: body.caption ?? null,
    technicianId: body.technician_id ?? null,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
