// src/app/api/admin/waiter-calls/stream/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { waiterCallsCol, tablesCol } from "@/server/db";
import type { WaiterCallStatus } from "@/types";

const POLL_INTERVAL = 2500;
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
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPoll = new Date(0);
      let closed = false;

      req.signal.addEventListener("abort", () => {
        closed = true;
        controller.close();
      });

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      // ارسال رویداد اتصال اولیه
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
        } catch (err) {
          send("error", { message: "خطا در دریافت داده" });
        }

        // انتظار تا poll بعدی
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, POLL_INTERVAL);
          req.signal.addEventListener("abort", () => {
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
      "X-Accel-Buffering": "no", // غیرفعال‌سازی بافرینگ nginx
    },
  });
}
