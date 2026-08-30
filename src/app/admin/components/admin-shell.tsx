"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  LayoutDashboard,
  List,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import * as React from "react";

import http from "@/lib/http";
import { PERMISSIONS } from "@/lib/auth-edge";
import { useAuthStore } from "@/store/auth-store";
import type { RoleName, UserSession } from "@/types";

interface AdminShellProps {
  children: React.ReactNode;
  initialSession: UserSession;
}

const ALL_SECTIONS = [
  { href: "/admin",              label: "داشبورد",       icon: LayoutDashboard, permission: null              },
  { href: "/admin/menu",         label: "مدیریت منو",    icon: List,            permission: "manageMenu"      },
  { href: "/admin/orders",       label: "سفارش‌ها",      icon: ShoppingBag,     permission: "viewOrders"      },
  { href: "/admin/waiter-calls", label: "فراخوان گارسون", icon: BellRing,        permission: "handleWaiterCall"},
  { href: "/admin/settings",     label: "تنظیمات",       icon: Settings,        permission: "manageSettings"  },
  { href: "/admin/users",        label: "کاربران",       icon: Users,           permission: "manageUsers"     },
] as const;

const ROLE_LABELS: Record<RoleName, string> = {
  SuperAdmin: "مدیر ارشد",
  Manager:    "مدیر",
  Staff:      "کارمند",
};

export function AdminShell({ children, initialSession }: AdminShellProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const storeUser = useAuthStore((s) => s.user);
  const setUser   = useAuthStore((s) => s.setUser);
  const logout    = useAuthStore((s) => s.logout);

  // یک‌بار در mount، session سرور را به store تزریق می‌کنیم تا hydration mismatch نداشته باشیم
  React.useEffect(() => {
    if (!storeUser) setUser(initialSession);
  }, [storeUser, setUser, initialSession]);

  const user = storeUser ?? initialSession;
  const role = user.role as RoleName;

  const sections = ALL_SECTIONS.filter(({ permission }) => {
    if (!permission) return true;
    return (PERMISSIONS[permission] as readonly RoleName[]).includes(role);
  });

  const handleLogout = async () => {
    try {
      await http.delete("/auth/login");
    } catch {
      // ادامه می‌دهیم
    }
    logout();
    router.replace("/admin/login");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row lg:px-8">
      <aside className="w-full rounded-3xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:sticky lg:top-24 lg:h-fit lg:w-72">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
            Administrator
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-900 dark:text-stone-100">
            پنل مدیریت
          </h2>
        </div>

        <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-400">
          <p className="font-medium text-stone-900 dark:text-stone-100">{user.name}</p>
          <p className="mt-0.5 text-xs">{user.email}</p>
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {ROLE_LABELS[role] ?? role}
          </p>
        </div>

        <nav className="space-y-1">
          {sections.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin" ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
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
      </aside>

      <section className="flex-1 space-y-6">{children}</section>
    </div>
  );
}
