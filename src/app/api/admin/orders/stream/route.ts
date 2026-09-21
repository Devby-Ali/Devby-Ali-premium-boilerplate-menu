// src/app/api/admin/orders/stream/route.ts
// SSE سفارش‌ها — Polling سبک هر ۲٫۵ ثانیه + Heartbeat برای زنده‌ماندن اتصال
// نکته: در MVP به‌جای Change Streams (نیازمند Replica Set) از polling استفاده می‌شود.
import { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth";
import { getOrders } from "@/lib/order-service";
import { ordersCol } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["SuperAdmin", "Manager", "Staff"] as const;
const POLL_INTERVAL_MS = 2500;
// پراکسی‌های میانی (nginx/CDN) اتصال بی‌سر‌وصدای طولانی را می‌بندند؛ heartbeat جلوگیری می‌کند
const HEARTBEAT_INTERVAL_MS = 15_000;

export async function GET(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) {
    return Response.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastUpdate = new Date(0);
      let lastHeartbeat = Date.now();
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // استریم از سمت کلاینت بسته شده است
        }
      };

      request.signal.addEventListener("abort", close);

      const sendRaw = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      const send = (event: string, data: unknown) => {
        sendRaw(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      // retry به EventSource می‌گوید پس از قطع اتصال با چه تأخیری وصل شود
      sendRaw("retry: 5000\n\n");
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

        if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
          sendRaw(`: ping ${new Date().toISOString()}\n\n`);
          lastHeartbeat = Date.now();
        }

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, POLL_INTERVAL_MS);
          request.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
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
