"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  CalendarCheck2,
  BarChart3,
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
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard, permission: null },
  {
    href: "/admin/menu",
    label: "مدیریت منو",
    icon: List,
    permission: "manageMenu",
  },
  {
    href: "/admin/orders",
    label: "سفارش‌ها",
    icon: ShoppingBag,
    permission: "viewOrders",
  },
  {
    href: "/admin/waiter-calls",
    label: "فراخوان گارسون",
    icon: BellRing,
    permission: "handleWaiterCall",
  },
  {
    href: "/admin/tables",
    label: "میز ها",
    icon: CalendarCheck2,
    permission: "manageReservations",
  },
  {
    href: "/admin/reservations",
    label: "رزروها",
    icon: CalendarCheck2,
    permission: "manageReservations",
  },
  {
    href: "/admin/reports",
    label: "گزارش‌ها",
    icon: BarChart3,
    permission: "viewReports",
  },
  {
    href: "/admin/settings",
    label: "تنظیمات",
    icon: Settings,
    permission: "manageSettings",
  },
  {
    href: "/admin/users",
    label: "کاربران",
    icon: Users,
    permission: "manageUsers",
  },
] as const;

const ROLE_LABELS: Record<RoleName, string> = {
  SuperAdmin: "مدیر ارشد",
  Manager: "مدیر",
  Staff: "کارمند",
};

export function AdminShell({ children, initialSession }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
      <aside className="glass-panel w-full rounded-md p-4 lg:sticky lg:top-24 lg:h-fit lg:w-72">
        <div className="mb-5 border-b border-border/80 px-2 pb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-primary">
            Administrator
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            پنل مدیریت
          </h2>
        </div>

        <div className="mb-4 rounded-md border border-border/80 bg-surface-raised/80 p-3 text-sm text-muted-foreground shadow-[0_14px_28px_-24px_rgb(var(--shadow-color)/0.65)]">
          <p className="font-medium text-foreground">{user.name}</p>
          <p className="mt-0.5 text-xs">{user.email}</p>
          <p className="mt-1 text-xs font-medium text-primary">
            {ROLE_LABELS[role] ?? role}
          </p>
        </div>

        <nav className="space-y-1.5">
          {sections.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin" ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-sm border px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border-primary/20 bg-primary/10 text-primary shadow-[0_16px_30px_-24px_rgb(var(--shadow-color)/0.85)]"
                    : "border-transparent text-muted-foreground hover:border-border/80 hover:bg-muted hover:text-foreground"
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
          className="mt-6 w-full rounded-sm border border-border/80 bg-surface/70 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-secondary/40 hover:bg-secondary/10 hover:text-secondary"
        >
          خروج از پنل
        </button>
      </aside>

      <section className="flex-1 space-y-6">{children}</section>
    </div>
  );
}
