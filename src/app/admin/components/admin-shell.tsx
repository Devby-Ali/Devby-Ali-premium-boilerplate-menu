"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import * as React from "react";

import http, { getApiData } from "@/lib/http";
import { useAuthStore } from "@/store/auth-store";
import type { UserSession } from "@/types";

interface AdminShellProps {
  children: React.ReactNode;
  initialSession: UserSession;
}

const sections = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/menu", label: "مدیریت منو", icon: List },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingBag },
  { href: "/admin/settings", label: "تنظیمات", icon: Settings },
  { href: "/admin/users", label: "کاربران", icon: Users },
];

export function AdminShell({ children, initialSession }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  React.useEffect(() => {
    setUser(initialSession);
  }, [initialSession, setUser]);

  React.useEffect(() => {
    if (!isHydrated) return;

    getApiData<UserSession>(http.get("/auth/me")).then(setUser).catch(() => {
      logout();
      router.replace("/admin/login");
    });
  }, [isHydrated, logout, router, setUser]);

  const handleLogout = async () => {
    try {
      await http.delete("/auth/login");
    } catch {
      // Continue with client-side cleanup even if the API call fails.
    }

    logout();
    router.replace("/admin/login");
  };

  const displayUser = user ?? initialSession;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row lg:px-8">
      <aside className="w-full rounded-3xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:sticky lg:top-8 lg:h-fit lg:w-72">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
            Administrator
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-900 dark:text-stone-100">
            پنل مدیریت
          </h2>
        </div>

        <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-400">
          <p className="font-medium text-stone-900 dark:text-stone-100">
            {displayUser.name}
          </p>
          <p className="mt-1 text-xs">{displayUser.email}</p>
        </div>

        <nav className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive =
              section.href === "/admin"
                ? pathname === section.href
                : pathname.startsWith(section.href);

            return (
              <Link
                key={section.href}
                href={section.href}
                className={`flex items-center gap-3 rounded-full px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full rounded-full border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          خروج از پنل
        </button>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-600 dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-400">
          نقش فعلی: {displayUser.role}
          <br />
          حالت MVP آماده برای توسعه RBAC
        </div>
      </aside>

      <section className="flex-1 space-y-6">{children}</section>
    </div>
  );
}
