import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ data: session });
}
