"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import http from "@/lib/http";

export function AuthHydrator() {
  const { setUser, markHydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // فقط اگر کاربر قبلاً لاگین نکرده باشد (در استور) تلاش می‌کنیم
    if (!isAuthenticated) {
      http
        .get("/auth/me")
        .then((data: any) => {
          // API پاسخ { data: UserSession } را برمی‌گرداند
          setUser(data as any);
        })
        .catch(() => {
          // اگر 401 یا خطا، یعنی لاگین نیست؛ session خالی می‌شود
          setUser(null);
        })
        .finally(() => {
          markHydrated();
        });
    } else {
      // اگر قبلاً در استور user وجود دارد (مثلاً از localStorage هیدریت شده)، فقط hydrated کنیم
      markHydrated();
    }
  }, [isAuthenticated, setUser, markHydrated]);

  return null; // هیچ UI ای رندر نمی‌کند
}
