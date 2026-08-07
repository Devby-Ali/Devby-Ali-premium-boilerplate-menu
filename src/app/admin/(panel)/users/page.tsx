import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const users = [
  {
    name: "مدیر اصلی",
    role: "Admin",
    status: "Active",
    email: "admin@premiummenu.test",
    access: "دسترسی کامل به پنل",
  },
  {
    name: "نیلوفر",
    role: "Editor",
    status: "Pending",
    email: "nilofar@premiummenu.test",
    access: "ویرایش منو و تنظیمات برند",
  },
  {
    name: "میلاد",
    role: "Viewer",
    status: "Active",
    email: "milad@premiummenu.test",
    access: "مشاهده سفارش‌ها و گزارش‌ها",
  },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          User Access
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          کاربران و دسترسی‌ها
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
          این بخش برای نمایش نقش‌ها، وضعیت کاربران و سطح دسترسی آن‌ها در پنل
          طراحی شده است.
        </p>
      </section>

      <section className="grid gap-6">
        {users.map((user) => (
          <Card key={user.name}>
            <CardHeader>
              <CardTitle>{user.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-stone-600 dark:text-stone-400 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p>ایمیل: {user.email}</p>
                <p>دسترسی: {user.access}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  نقش: {user.role}
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  وضعیت: {user.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
