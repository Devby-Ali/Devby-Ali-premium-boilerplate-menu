export default function AdminLoading() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-6 py-16 lg:px-8">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <p className="mt-4 text-sm font-medium text-stone-600 dark:text-stone-300">
          در حال آماده‌سازی پنل ادمین...
        </p>
      </div>
    </main>
  );
}
