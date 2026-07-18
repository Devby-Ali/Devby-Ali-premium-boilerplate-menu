import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(47,107,79,0.2),_transparent_60%)] px-6 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
        404
      </p>
      <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-100">
        صفحه مورد نظر یافت نشد
      </h1>
      <p className="mt-3 max-w-md text-base text-stone-600 dark:text-stone-300">
        ممکن است مسیر اشتباه باشد یا صفحه در حال آماده‌سازی باشد.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        بازگشت به خانه
      </Link>
    </main>
  );
}
