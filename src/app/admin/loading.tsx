export default function AdminLoading() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-6 py-16 lg:px-8">
      <div className="glass-panel w-full max-w-md rounded-md p-8 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          در حال آماده‌سازی پنل ادمین...
        </p>
      </div>
    </main>
  );
}
