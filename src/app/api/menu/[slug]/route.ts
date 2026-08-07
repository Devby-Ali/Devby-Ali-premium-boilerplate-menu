import { getMenuItemBySlug } from "@/data/menu";

export const dynamic = "force-static";
export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const resolvedParams = await params;
  const item = getMenuItemBySlug(resolvedParams.slug);

  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  return Response.json({ data: item });
}
