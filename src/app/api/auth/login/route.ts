import { NextRequest } from "next/server";

import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  if (
    email !== "admin@premiummenu.test" ||
    password !== env.ADMIN_INITIAL_PASSWORD
  ) {
    return Response.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = {
    id: "admin-1",
    name: "Admin User",
    email,
    role: "admin" as const,
  };

  await setSessionCookie(session);

  return Response.json({ message: "Authenticated", user: session });
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ message: "Logged out" });
}
