import { NextRequest, NextResponse } from "next/server";
import { getMenuItemBySlug } from "@/lib/menu-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const item = await getMenuItemBySlug(slug);

    if (!item) {
      return NextResponse.json(
        { error: "آیتم منو یافت نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        id: item.id,
        title: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        currency: item.currency,
        category: item.category?.slug ?? "",
        categoryName: item.category?.name ?? "",
        featured: item.isFeatured,
        prepTime: item.preparationTime,
        ingredients: item.tags ?? [],
        story: item.description,
      },
    });
  } catch (error) {
    console.error("[MENU SLUG API ERROR]", error);
    return NextResponse.json(
      { error: "دریافت جزئیات آیتم با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
