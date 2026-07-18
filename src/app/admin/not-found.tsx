import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6 py-16 lg:px-8">
      <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          صفحه‌ی مورد نظر در پنل یافت نشد
        </h2>
        <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
          شاید این مسیر در فاز MVP هنوز در دسترس نیست یا به‌روزرسانی شده است.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    </main>
  );
}
