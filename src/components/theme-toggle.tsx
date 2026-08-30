"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * هوک سفارشی برای تشخیص Mount شدن کامپوننت در کلاینت
 * به‌جای setState در بدنه اثر (که React Compiler ممنوع می‌داند) از
 * useSyncExternalStore استفاده می‌کنیم — subscribe اضافه‌ای لازم نیست چون
 * نتیجه همیشه true است و فقط برای تفکیک سرور/کلاینت به کار می‌رود.
 */
function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  // تا زمان Mount شدن، یک placeholder نامرئی رندر می‌کنیم
  if (!mounted) {
    return <div className="h-10 w-10" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:bg-muted dark:shadow-none",
        className,
      )}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
