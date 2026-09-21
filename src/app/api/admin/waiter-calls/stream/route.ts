// src/app/api/admin/waiter-calls/stream/route.ts
// SSE فراخوان گارسون — Polling سبک هر ۲٫۵ ثانیه + Heartbeat
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { waiterCallsCol, tablesCol } from "@/server/db";
import type { WaiterCallStatus } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 2500;
const HEARTBEAT_INTERVAL_MS = 15_000;
const ALLOWED_ROLES = ["SuperAdmin", "Manager", "Staff"] as const;

interface WaiterCallEvent {
  id: string;
  tableId: string;
  tableNumber?: number | null;
  userId?: string | null;
  status: WaiterCallStatus;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  const session = await requireRole(ALLOWED_ROLES);
  if (!session) {
    return Response.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPoll = new Date(0);
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

      req.signal.addEventListener("abort", close);

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

      sendRaw("retry: 5000\n\n");
      send("connected", { timestamp: new Date().toISOString() });

      while (!closed) {
        try {
          const now = new Date();
          const col = await waiterCallsCol();

          // فقط رکوردهایی که از آخرین poll تغییر کرده‌اند
          const calls = await col
            .find({
              updatedAt: { $gt: lastPoll },
            })
            .sort({ updatedAt: -1 })
            .toArray();

          if (calls.length > 0) {
            // join با جدول tables برای شماره میز
            const tCol = await tablesCol();
            const tableIds = [...new Set(calls.map((c) => c.tableId))];
            const tables = await tCol
              .find({ _id: { $in: tableIds } })
              .project({ _id: 1, number: 1 })
              .toArray();
            const tableMap = new Map(tables.map((t) => [t._id.toHexString(), t.number]));

            const events: WaiterCallEvent[] = calls.map((c) => ({
              id: c._id.toHexString(),
              tableId: c.tableId.toHexString(),
              tableNumber: tableMap.get(c.tableId.toHexString()) ?? null,
              userId: c.userId?.toHexString() ?? null,
              status: c.status as WaiterCallStatus,
              createdAt: c.createdAt.toISOString(),
              updatedAt: c.updatedAt.toISOString(),
            }));

            send("waiter-calls", events);
          }

          lastPoll = now;
        } catch {
          send("error", { message: "خطا در دریافت داده" });
        }

        if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
          sendRaw(`: ping ${new Date().toISOString()}\n\n`);
          lastHeartbeat = Date.now();
        }

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, POLL_INTERVAL_MS);
          req.signal.addEventListener(
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
      "X-Accel-Buffering": "no", // غیرفعال‌سازی بافرینگ nginx
    },
  });
}
