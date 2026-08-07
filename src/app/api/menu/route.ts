import { NextRequest } from "next/server";

import { getMenuItemsByCategory } from "@/data/menu";

export const dynamic = "force-static";
export const revalidate = 300;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category") ?? "all";
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const items = getMenuItemsByCategory(category).filter((item) => {
    if (!query) {
      return true;
    }

    const haystack = [item.title, item.description, item.ingredients.join(" ")]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  return Response.json({ data: items });
}
