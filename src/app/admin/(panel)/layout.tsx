import { redirect } from "next/navigation";

import { AdminShell } from "@/app/admin/components/admin-shell";
import { getSessionFromCookie } from "@/lib/auth";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionFromCookie();

  if (!session) redirect("/admin/login");

  return <AdminShell initialSession={session}>{children}</AdminShell>;
}
