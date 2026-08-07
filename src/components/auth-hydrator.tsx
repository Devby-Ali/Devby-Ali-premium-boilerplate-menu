"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function AuthHydrator() {
  const { setUser, markHydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      markHydrated();
      return;
    }

    const hydratorAbort = new AbortController();
    let cancelled = false;

    fetch("/api/auth/me", {
      credentials: "include",
      signal: hydratorAbort.signal,
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setUser(null);
          return;
        }
        const payload = await res.json();
        setUser(payload?.data ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) markHydrated();
      });

    return () => {
      cancelled = true;
      hydratorAbort.abort();
    };
  }, [isAuthenticated, setUser, markHydrated]);

  return null;
}
