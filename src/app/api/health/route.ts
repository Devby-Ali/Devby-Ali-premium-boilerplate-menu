import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  return apiSuccess({
    ok: true,
    message: "Premium Menu API is healthy",
    timestamp: new Date().toISOString(),
  });
}
