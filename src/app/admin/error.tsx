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
      <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-stone-900/80">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-stone-900 dark:text-stone-100">
          مشکلی در بارگذاری پنل رخ داد
        </h2>
        <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-stone-400">
          لطفاً دوباره تلاش کنید. در صورت نیاز، جلسه را مجدداً وارد کنید.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          تلاش مجدد
        </button>
      </div>
    </main>
  );
}
