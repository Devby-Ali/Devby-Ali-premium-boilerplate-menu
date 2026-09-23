import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6 py-16 lg:px-8">
      <div className="glass-panel w-full rounded-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground">
          صفحه‌ی مورد نظر در پنل یافت نشد
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          شاید این مسیر در فاز MVP هنوز در دسترس نیست یا به‌روزرسانی شده است.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-105"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    </main>
  );
}
