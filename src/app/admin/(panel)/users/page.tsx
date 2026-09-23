// src/app/admin/(panel)/users/page.tsx
// مدیریت کاربران — فقط SuperAdmin. استراتژی: CSR چون داده وابسته به نشست است
// و عملیات CRUD با تأخیر لحظه‌ای انجام می‌شود.
"use client";

import * as React from "react";
import { Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RoleName } from "@/types";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: RoleName | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<RoleName, string> = {
  SuperAdmin: "مدیر ارشد",
  Manager: "مدیر",
  Staff: "کارمند",
};

const ROLE_OPTIONS = ["SuperAdmin", "Manager", "Staff"] as const;

interface FormDraft {
  name: string;
  email: string;
  phone: string;
  password: string;
  roleName: RoleName;
}

const emptyDraft = (): FormDraft => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  roleName: "Staff",
});

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [showComposer, setShowComposer] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<FormDraft>(emptyDraft);

  // refresh پس از هر عملیات — فقط از event handler ها فراخوانی می‌شود
  const refreshUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "خطا در دریافت کاربران");
      setUsers(payload.data as AdminUser[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت کاربران");
    } finally {
      setLoading(false);
    }
  }, []);

  // دریافت لیست کاربران در mount — setState ها پس از اولین await انجام می‌شوند
  React.useEffect(() => {
    const abort = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/admin/users", {
          credentials: "include",
          signal: abort.signal,
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error ?? "خطا در دریافت کاربران");
        setUsers(payload.data as AdminUser[]);
        setError(null);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "خطا در دریافت کاربران");
      } finally {
        setLoading(false);
      }
    })();

    return () => abort.abort();
  }, []);

  const resetComposer = () => {
    setShowComposer(false);
    setEditingId(null);
    setFeedback(null);
    setError(null);
  };

  const openCreate = () => {
    resetComposer();
    setShowComposer(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setDraft({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      roleName: user.role ?? "Staff",
    });
    setShowComposer(true);
    setFeedback(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const body = editingId
        ? {
            id: editingId,
            name: draft.name,
            email: draft.email,
            phone: draft.phone || null,
            // رمز خالی یعنی بدون تغییر در ویرایش
            ...(draft.password ? { password: draft.password } : {}),
            roleName: draft.roleName,
          }
        : { ...draft, phone: draft.phone || null };

      const res = await fetch("/api/admin/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      }

      setFeedback(payload.message ?? "انجام شد.");
      if (editingId) resetComposer();
      else {
        setDraft(emptyDraft());
      }
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      setFeedback(payload.message ?? "وضعیت کاربر تغییر کرد.");
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`حذف کاربر «${user.name}» قطعی است؟`)) return;

    setSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      setFeedback(payload.message ?? "کاربر حذف شد.");
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="admin-hero rounded-md p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          User Management
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          مدیریت کاربران
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
          ایجاد و ویرایش حساب‌های پنل با سه نقش مشخص: مدیر ارشد، مدیر و کارمند.
          این بخش فقط برای مدیر ارشد قابل دسترسی است.
        </p>
      </section>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {users.length} کاربر ثبت شده
        </p>
        <Button type="button" onClick={openCreate} disabled={submitting}>
          <Plus className="ml-2 h-4 w-4" />
          افزودن کاربر
        </Button>
      </div>

      {/* Composer */}
      {showComposer && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "ویرایش کاربر" : "افزودن کاربر جدید"}</CardTitle>
            <CardDescription>
              {editingId
                ? "برای حفظ رمز عبور فعلی، فیلد رمز را خالی بگذارید."
                : "رمز عبور باید حداقل ۸ کاراکتر باشد."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="user-name">نام و نام خانوادگی</Label>
                  <Input
                    id="user-name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-email">ایمیل</Label>
                  <Input
                    id="user-email"
                    type="email"
                    dir="ltr"
                    value={draft.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-phone">شماره موبایل (اختیاری)</Label>
                  <Input
                    id="user-phone"
                    type="tel"
                    dir="ltr"
                    value={draft.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-password">
                    رمز عبور {!editingId && "(الزامی)"}
                  </Label>
                  <Input
                    id="user-password"
                    type="password"
                    dir="ltr"
                    value={draft.password}
                    onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                    minLength={editingId ? undefined : 8}
                    required={!editingId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-role">نقش</Label>
                  <select
                    id="user-role"
                    value={draft.roleName}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, roleName: e.target.value as RoleName }))
                    }
                    className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "در حال ذخیره..."
                    : editingId
                      ? "ذخیره تغییرات"
                      : "افزودن کاربر"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetComposer}
                  disabled={submitting}
                >
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Feedback / error */}
      {feedback && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
          {feedback}
        </p>
      )}
      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          در حال بارگذاری کاربران…
        </p>
      )}

      {/* Users list */}
      <section className="grid gap-6">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                    <UserRound className="h-5 w-5 text-stone-500 dark:text-stone-300" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <p className="text-sm text-stone-500 dark:text-stone-400" dir="ltr">
                      {user.email}
                      {user.phone ? ` · ${user.phone}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user.role && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      <ShieldCheck className="h-3 w-3" />
                      {ROLE_LABELS[user.role]}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      user.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}
                  >
                    {user.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-stone-400">
                تاریخ عضویت:{" "}
                <span suppressHydrationWarning>
                  {new Date(user.createdAt).toLocaleDateString("fa-IR")}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(user)}
                  disabled={submitting}
                >
                  ویرایش
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(user)}
                  disabled={submitting}
                >
                  {user.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(user)}
                  disabled={submitting}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="ml-1.5 h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && users.length === 0 && (
          <Card className="p-8 text-center text-sm text-stone-500 dark:text-stone-400">
            هنوز کاربری ثبت نشده است.
          </Card>
        )}
      </section>
    </div>
  );
}
