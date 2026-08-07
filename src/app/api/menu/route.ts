import { NextRequest, NextResponse } from "next/server";
import { getMenuItems, getCategories } from "@/lib/menu-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") ?? undefined;
    const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

    const [items, categories] = await Promise.all([
      getMenuItems(),
      getCategories(),
    ]);

    let filtered = items;
    if (category && category !== "all") {
      filtered = items.filter(
        (item) => item.category?.slug === category,
      );
    }

    if (query) {
      filtered = filtered.filter((item) => {
        const haystack = [item.name, item.description, ...(item.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return NextResponse.json({
      data: filtered.map((item) => ({
        id: item.id,
        title: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        category: item.category?.slug ?? "",
        categoryName: item.category?.name ?? "",
        featured: item.isFeatured,
        prepTime: item.preparationTime,
        ingredients: item.tags ?? [],
        story: item.description,
      })),
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
      })),
    });
  } catch (error) {
    console.error("[MENU API ERROR]", error);
    return NextResponse.json(
      { error: "دریافت منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
