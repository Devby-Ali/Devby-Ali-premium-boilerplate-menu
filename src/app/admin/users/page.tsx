import { AdminShell } from "@/app/admin/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const users = [
  { name: "مدیر اصلی", role: "Admin", status: "Active" },
  { name: "نیلوفر", role: "Editor", status: "Pending" },
  { name: "میلاد", role: "Viewer", status: "Active" },
];

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
            User Access
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
            کاربران و دسترسی‌ها
          </h1>
        </section>

        <section className="grid gap-6">
          {users.map((user) => (
            <Card key={user.name}>
              <CardHeader>
                <CardTitle>{user.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-stone-600 dark:text-stone-400">
                <span>نقش: {user.role}</span>
                <span>وضعیت: {user.status}</span>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
