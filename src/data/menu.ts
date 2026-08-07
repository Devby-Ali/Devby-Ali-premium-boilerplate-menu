export interface MenuItemData {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  category: "coffee" | "dessert" | "savory" | "signature";
  badge?: string;
  featured?: boolean;
  prepTime?: number;
  ingredients: string[];
  story: string;
}

export type MenuCategorySlug = (typeof menuCategories)[number]["slug"];

export const menuCategories = [
  { slug: "all", label: "همه" },
  { slug: "coffee", label: "کافی‌شاپ" },
  { slug: "dessert", label: "دسر" },
  { slug: "savory", label: "اشنایی" },
  { slug: "signature", label: "ویژه" },
] as const;

export const menuItems: MenuItemData[] = [
  {
    id: "1",
    title: "Espresso Noir",
    slug: "espresso-noir",
    description:
      "اسپرسوی حرفه‌ای با عطر دانه‌های برشته‌شده و کرم نرمی که در هر لقمه حس لوکس ایجاد می‌کند.",
    price: 38000,
    category: "coffee",
    badge: "پرفروش",
    featured: true,
    prepTime: 6,
    ingredients: ["دانه اسپرسو", "شیر گرم", "کرم وانیلی"],
    story:
      "این آیتم برای مشتریانی طراحی شده که به طعم‌های عمیق و ظاهری مدرن علاقه دارند.",
  },
  {
    id: "2",
    title: "Velvet Latte",
    slug: "velvet-latte",
    description: "لاته وانیلی با شیر تازه و لایه‌ای ظریف از طعم شیرین و خاکی.",
    price: 65000,
    category: "coffee",
    prepTime: 8,
    ingredients: ["شیر تازه", "اسپرسو", "وانیل", "دارچین"],
    story:
      "این نوشیدنی، انتخابی آرام و لوکس برای شروع روز یا استراحت عصرانه است.",
  },
  {
    id: "3",
    title: "Golden Herb Pasta",
    slug: "golden-herb-pasta",
    description:
      "پاستا با سس گیاهی، سبزی معطر و بافتی کاملاً متعادل و پر طراوت.",
    price: 110000,
    category: "savory",
    badge: "ویژه امروز",
    prepTime: 14,
    ingredients: ["پاستا", "سس گیاهی", "ریحان", "پارمزان"],
    story:
      "یک انتخاب مناسب برای مشتریانی که به غذاهای آرام و خوش‌عطر علاقه دارند.",
  },
  {
    id: "4",
    title: "Rosemary Citrus Tart",
    slug: "rosemary-citrus-tart",
    description: "تارت روشن و معطر با طعم مرکبات و پایه‌ی کرمی و ظریف.",
    price: 54000,
    category: "dessert",
    prepTime: 10,
    ingredients: ["خمیر تارت", "پودینگ لیمو", "ریحان", "شکر قهوه‌ای"],
    story:
      "تعمق طعم و کیفیت ظاهری این دسر، تجربه‌ای خاص برای پایان وعده غذایی است.",
  },
  {
    id: "5",
    title: "Midnight Bloom",
    slug: "midnight-bloom",
    description:
      "نوشیدنی ویژه با طعم گلدار، تند و آرام که برای شب‌های آرام طراحی شده است.",
    price: 72000,
    category: "signature",
    featured: true,
    prepTime: 7,
    ingredients: ["چای سیاه", "اسطوخودوس", "عسل", "لیمو"],
    story: "این ترکیب برای مشتریانی است که دنبال تجربه‌ای متفاوت و لوکس هستند.",
  },
  {
    id: "6",
    title: "Cedar Garden Toast",
    slug: "cedar-garden-toast",
    description:
      "تست با سس زیتون و سبزی‌های تازه، مناسب برای وعده‌های سبک و حرفه‌ای.",
    price: 47000,
    category: "savory",
    prepTime: 9,
    ingredients: ["نان دانه‌ای", "سس زیتون", "گوجه", "سبزی تازه"],
    story:
      "یک گزینه سبک برای مشتریانی که به ترکیبات سالم و خوش‌طعم اهمیت می‌دهند.",
  },
];

export function formatPrice(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

export function getMenuItemBySlug(slug: string) {
  return menuItems.find((item) => item.slug === slug) ?? null;
}

export function getFeaturedMenuItems() {
  return menuItems.filter((item) => item.featured);
}

export function getMenuItemsByCategory(category: MenuCategorySlug | string) {
  if (category === "all") {
    return menuItems;
  }

  return menuItems.filter((item) => item.category === category);
}
