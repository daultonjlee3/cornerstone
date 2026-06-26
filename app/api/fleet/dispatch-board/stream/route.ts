import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { listDispatchSignalsSince } from "@/src/lib/fleet/dispatch-signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await can("fleet.view"))) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!auth.tenantId) {
    return new Response("No tenant", { status: 400 });
  }

  const tenantId = auth.tenantId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let cursor = new Date(Date.now() - 5000).toISOString();

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("connected", { tenant_id: tenantId, at: new Date().toISOString() });

      const poll = async () => {
        while (!request.signal.aborted) {
          try {
            const signals = await listDispatchSignalsSince(supabase, tenantId, cursor);
            for (const signal of signals) {
              send(signal.signal_type, {
                id: signal.id,
                ...signal.payload,
                created_at: signal.created_at,
              });
              cursor = signal.created_at;
            }
          } catch (error) {
            send("error", {
              message: error instanceof Error ? error.message : "stream_error",
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      };

      void poll().finally(() => {
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      });

      request.signal.addEventListener("abort", () => {
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
