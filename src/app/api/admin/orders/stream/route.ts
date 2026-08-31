import { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth";
import { getOrders } from "@/lib/order-service";
import { ordersCol } from "@/server/db";

const ALLOWED_ROLES = ["SuperAdmin", "Manager", "Staff"] as const;
const POLL_INTERVAL = 2500;

export async function GET(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) {
    return Response.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastUpdate = new Date(0);
      let closed = false;
      request.signal.addEventListener("abort", () => {
        closed = true;
        controller.close();
      });

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      send("connected", { timestamp: new Date().toISOString() });

      while (!closed) {
        try {
          const now = new Date();
          const changed = await (await ordersCol()).countDocuments({
            updatedAt: { $gt: lastUpdate },
          });
          if (changed > 0) send("orders", await getOrders());
          lastUpdate = now;
        } catch {
          send("stream-error", { message: "دریافت سفارش‌ها با خطا مواجه شد." });
        }

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, POLL_INTERVAL);
          request.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
