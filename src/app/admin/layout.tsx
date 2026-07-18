import { redirect } from "next/navigation";

import { getSessionFromCookie } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
