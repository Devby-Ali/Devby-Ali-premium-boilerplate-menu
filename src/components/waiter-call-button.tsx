// src/components/waiter-call-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  tableId: string;
  tableNumber: number;
}

type CallState = "idle" | "loading" | "sent" | "error";

export function WaiterCallButton({ tableId, tableNumber }: Props) {
  const [state, setState] = useState<CallState>("idle");

  async function handleCall() {
    if (state === "loading" || state === "sent") return;
    setState("loading");

    try {
      const res = await fetch("/api/waiter-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });

      if (!res.ok) throw new Error();
      setState("sent");

      // بعد از ۱۰ ثانیه دوباره فعال می‌شود
      setTimeout(() => setState("idle"), 10_000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3_000);
    }
  }

  const label = {
    idle: "🛎 آماده سفارشم",
    loading: "در حال ارسال...",
    sent: "✓ گارسون در راه است",
    error: "خطا — دوباره تلاش کنید",
  }[state];

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <Button
        onClick={handleCall}
        disabled={state === "loading" || state === "sent"}
        size="lg"
        className={`rounded-md border border-white/20 px-8 shadow-lg transition-all ${
          state === "sent"
            ? "bg-primary hover:bg-primary text-primary-foreground"
            : state === "error"
              ? "bg-secondary hover:bg-secondary text-secondary-foreground"
              : ""
        }`}
      >
        {label}
      </Button>
      {state === "sent" && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          میز {tableNumber}
        </p>
      )}
    </div>
  );
}
