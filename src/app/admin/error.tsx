"use client";

import { AlertTriangle } from "lucide-react";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6 py-16 lg:px-8">
      <div className="glass-panel w-full rounded-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-secondary/12 text-secondary">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">
          مشکلی در بارگذاری پنل رخ داد
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          لطفاً دوباره تلاش کنید. در صورت نیاز، جلسه را مجدداً وارد کنید.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-105"
        >
          تلاش مجدد
        </button>
      </div>
    </main>
  );
}
