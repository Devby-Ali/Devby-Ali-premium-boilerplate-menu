// src/app/admin/(panel)/tables/page.tsx
// صفحه مدیریت میزها — ایجاد، ویرایش، حذف + نمایش QR Code

"use client";

import * as React from "react";
import {
  LayoutGrid,
  Plus,
  QrCode,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import QRCode from "qrcode";

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
import { useTableStore } from "@/store/table-store";
import type { Table } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TableStats {
  total: number;
  active: number;
  inactive: number;
}

interface TableDraft {
  number: string;
  capacity: string;
  isActive: boolean;
}

const createDraft = (): TableDraft => ({
  number: "",
  capacity: "2",
  isActive: true,
});

// ─── QR Code Dialog ──────────────────────────────────────────────────────────

interface QrDialogProps {
  table: Table;
  baseUrl: string;
  onClose: () => void;
}

function QrDialog({ table, baseUrl, onClose }: QrDialogProps) {
  // مسیر رسمی منوی QR — مشتری با اسکن کد وارد /t/[token] می‌شود
  const qrUrl = `${baseUrl}/t/${table.token}`;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // رندر QR Code روی canvas به محض باز شدن dialog
  React.useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#1c1917", // stone-900
        light: "#ffffff",
      },
    });
  }, [qrUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `table-${table.number}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-sm rounded-md p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-6 text-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              QR Code
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              میز شماره {table.number}
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              ظرفیت: {table.capacity} نفر
            </p>
          </div>

          {/* Canvas — qrcode کتابخانه مستقیم روی canvas رندر می‌کند */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:ring-stone-700">
            <canvas ref={canvasRef} />
          </div>

          <div className="w-full rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800">
            <p className="break-all text-xs text-stone-500 dark:text-stone-400">
              {qrUrl}
            </p>
          </div>

          <div className="flex w-full gap-3">
            <Button type="button" className="flex-1" onClick={handleDownload}>
              <Download className="ml-2 h-4 w-4" />
              دانلود PNG
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              بستن
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminTablesPage() {
  const { tables, setTables, addTable, updateTable, removeTable } =
    useTableStore();

  const [stats, setStats] = React.useState<TableStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<TableDraft>(createDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showComposer, setShowComposer] = React.useState(false);
  const [qrTable, setQrTable] = React.useState<Table | null>(null);

  // آدرس پایه سایت برای QR Code
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // ─── بارگذاری داده‌ها ──────────────────────────────────────────────────────

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [tablesRes, statsRes] = await Promise.all([
        fetch("/api/admin/tables"),
        fetch("/api/admin/tables?stats=true"),
      ]);

      if (!tablesRes.ok || !statsRes.ok) {
        throw new Error("خطا در دریافت داده‌ها");
      }

      const [tablesPayload, statsPayload] = await Promise.all([
        tablesRes.json(),
        statsRes.json(),
      ]);

      setTables(tablesPayload.data as Table[]);
      setStats(statsPayload.data as TableStats);
    } catch {
      setFeedback("در حال حاضر امکان بارگذاری داده‌های میزها وجود ندارد.");
    } finally {
      setLoading(false);
    }
  }, [setTables]);

  React.useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, [loadData]);

  // ─── reset form ───────────────────────────────────────────────────────────

  const resetComposer = () => {
    setDraft(createDraft());
    setEditingId(null);
    setShowComposer(false);
    setFeedback(null);
  };

  // ─── ایجاد / ویرایش میز ──────────────────────────────────────────────────

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const number = parseInt(draft.number, 10);
    const capacity = parseInt(draft.capacity, 10);

    if (isNaN(number) || number <= 0) {
      setFeedback("شماره میز باید عدد مثبت باشد.");
      return;
    }
    if (isNaN(capacity) || capacity < 1 || capacity > 20) {
      setFeedback("ظرفیت میز باید بین ۱ تا ۲۰ نفر باشد.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/tables", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { id: editingId, number, capacity, isActive: draft.isActive }
            : { number, capacity, isActive: draft.isActive },
        ),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      }

      const table = payload.data as Table;

      if (editingId) {
        updateTable(table);
        setFeedback("میز با موفقیت به‌روزرسانی شد.");
      } else {
        addTable(table);
        resetComposer();
        setFeedback("میز با موفقیت اضافه شد.");
        // آپدیت stats
        setStats((prev) =>
          prev
            ? {
                total: prev.total + 1,
                active: draft.isActive ? prev.active + 1 : prev.active,
                inactive: !draft.isActive ? prev.inactive + 1 : prev.inactive,
              }
            : prev,
        );
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── حذف میز ─────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این میز اطمینان دارید؟")) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/tables", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      }

      removeTable(id);
      setFeedback(payload.message ?? "میز با موفقیت حذف شد.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── ویرایش میز ──────────────────────────────────────────────────────────

  const handleEdit = (table: Table) => {
    setEditingId(table.id);
    setDraft({
      number: String(table.number),
      capacity: String(table.capacity),
      isActive: table.isActive,
    });
    setShowComposer(true);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* QR Code Dialog */}
      {qrTable && (
        <QrDialog
          table={qrTable}
          baseUrl={baseUrl}
          onClose={() => setQrTable(null)}
        />
      )}

      {/* Header */}
      <section className="admin-hero rounded-md p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          Table Manager
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          مدیریت میزها
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
          میزهای کافه را مدیریت کنید و برای هر میز QR Code اختصاصی تولید کنید.
        </p>
      </section>

      {/* Stats */}
      {stats && (
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "کل میزها", value: stats.total, icon: LayoutGrid },
            {
              label: "فعال",
              value: stats.active,
              icon: CheckCircle2,
              color: "text-emerald-600",
            },
            {
              label: "غیرفعال",
              value: stats.inactive,
              icon: XCircle,
              color: "text-rose-500",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-stone-700 dark:text-stone-300">
                    {label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${color ?? "text-stone-400"}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-stone-900 dark:text-stone-100">
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {tables.length} میز ثبت شده
        </p>
        <Button
          type="button"
          onClick={() => {
            resetComposer();
            setShowComposer(true);
          }}
          disabled={submitting}
        >
          <Plus className="ml-2 h-4 w-4" />
          افزودن میز
        </Button>
      </div>

      {/* Composer (Create / Edit Form) */}
      {showComposer && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "ویرایش میز" : "افزودن میز جدید"}
            </CardTitle>
            <CardDescription>
              اطلاعات میز را وارد کنید. QR Code پس از ثبت به صورت خودکار تولید
              می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* شماره میز */}
                <div className="space-y-2">
                  <Label htmlFor="table-number">شماره میز</Label>
                  <Input
                    id="table-number"
                    type="number"
                    min={1}
                    value={draft.number}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, number: e.target.value }))
                    }
                    placeholder="مثال: ۱"
                  />
                </div>

                {/* ظرفیت */}
                <div className="space-y-2">
                  <Label htmlFor="table-capacity">ظرفیت (نفر)</Label>
                  <Input
                    id="table-capacity"
                    type="number"
                    min={1}
                    max={20}
                    value={draft.capacity}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, capacity: e.target.value }))
                    }
                    placeholder="مثال: ۴"
                  />
                </div>

                {/* وضعیت فعال */}
                <div className="flex items-center gap-3 sm:col-span-2">
                  <input
                    id="table-active"
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <Label htmlFor="table-active" className="cursor-pointer">
                    میز فعال است
                  </Label>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "در حال ذخیره..."
                    : editingId
                      ? "ذخیره تغییرات"
                      : "افزودن میز"}
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

      {/* Feedback */}
      {feedback && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
          {feedback}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          در حال بارگذاری میزها…
        </p>
      )}

      {/* Tables Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <Card
            key={table.id}
            className={
              !table.isActive
                ? "opacity-60 ring-1 ring-rose-200 dark:ring-rose-900"
                : undefined
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-xl">
                    میز شماره {table.number}
                  </CardTitle>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    ظرفیت: {table.capacity} نفر
                  </p>
                </div>
                {/* وضعیت */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    table.isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}
                >
                  {table.isActive ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {table.isActive ? "فعال" : "غیرفعال"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* QR Token نمایشی */}
              <p className="truncate rounded-lg bg-stone-50 px-3 py-1.5 font-mono text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {table.token}
              </p>

              {/* دکمه‌ها */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setQrTable(table)}
                >
                  <QrCode className="ml-1.5 h-3.5 w-3.5" />
                  QR Code
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(table)}
                  disabled={submitting}
                >
                  ویرایش
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(table.id)}
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

        {!loading && tables.length === 0 && (
          <Card className="col-span-full p-8 text-center text-sm text-stone-500 dark:text-stone-400">
            هنوز میزی ثبت نشده است. از دکمه «افزودن میز» استفاده کنید.
          </Card>
        )}
      </section>
    </div>
  );
}
