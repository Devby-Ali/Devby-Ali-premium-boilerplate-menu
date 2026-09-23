// scripts/seed.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Database seed (PRD FR-D05): roles, initial admin, settings, demo categories,
// demo menu items and demo orders.
//
// Uses the official `mongodb` driver — the same runtime as the app
// (see src/server/db.ts for why PrismaClient cannot serve MongoDB in v7).
//
// Usage:  npm run db:seed
// Idempotent: safe to run multiple times (upserts on unique keys).
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";

// Load .env (Node ≥ 20.12). Falls back to the local default.
try {
  process.loadEnvFile?.(".env");
} catch {
  // .env absent — rely on defaults below
}

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "mongodb://localhost:27017/premium-boilerplate-menu";
const ADMIN_INITIAL_EMAIL = (
  process.env.ADMIN_INITIAL_EMAIL ?? "admin@premiummenu.test"
).toLowerCase();
const ADMIN_INITIAL_PASSWORD =
  process.env.ADMIN_INITIAL_PASSWORD ?? "admin1234";

function getDatabaseName(url) {
  try {
    const parsed = new URL(
      url.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"),
    );
    const name = parsed.pathname.replace(/^\//, "").split("/")[0];
    if (name) return decodeURIComponent(name);
  } catch {
    /* fall through */
  }
  return "premium-boilerplate-menu";
}

/** Unicode-aware slugify — mirrors src/lib/slug.ts. */
function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

const now = () => new Date();

async function main() {
  const client = new MongoClient(DATABASE_URL, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const db = client.db(getDatabaseName(DATABASE_URL));

  console.log(`→ Connected to ${getDatabaseName(DATABASE_URL)}`);

  // ── Indexes (PRD §8.4) ──────────────────────────────────────────
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db
      .collection("users")
      .createIndex({ phone: 1 }, { unique: true, sparse: true }),
    db.collection("menu_categories").createIndex({ slug: 1 }, { unique: true }),
    db.collection("menu_items").createIndex({ slug: 1 }, { unique: true }),
    db.collection("menu_items").createIndex({ categoryId: 1 }),
    db.collection("menu_items").createIndex({ isActive: 1, isFeatured: 1 }),
    db.collection("orders").createIndex({ userId: 1 }),
    db.collection("orders").createIndex({ status: 1 }),
    db.collection("payments").createIndex({ orderId: 1 }),
    db.collection("carts").createIndex({ userId: 1 }),
    db.collection("audit_logs").createIndex({ actorId: 1 }),
    db.collection("audit_logs").createIndex({ createdAt: 1 }),
  ]);
  console.log("✓ Indexes ensured");

  // ── Initial admin user ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_INITIAL_PASSWORD, 12);
  await db.collection("users").findOneAndUpdate(
    { email: ADMIN_INITIAL_EMAIL },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        name: "Administrator",
        email: ADMIN_INITIAL_EMAIL,
        phone: null,
        passwordHash,
        role: "SuperAdmin",
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      },
    },
    { upsert: true },
  );
  console.log(`✓ Admin user: ${ADMIN_INITIAL_EMAIL}`);

  // ── Settings ────────────────────────────────────────────────────
  const settingsCount = await db.collection("settings").countDocuments();
  if (settingsCount === 0) {
    await db.collection("settings").insertOne({
      _id: new ObjectId(),
      siteName: "Premium Menu",
      logoUrl: null,
      primaryColor: "#2f6b4f",
      secondaryColor: "#8b233d",
      accentColor: "#f4e3b2",
      themeMode: "system",
      contactPhone: null,
      contactEmail: "hello@premiummenu.test",
      address: "تهران، خیابان ...",
      createdAt: now(),
      updatedAt: now(),
    });
    console.log("✓ Settings seeded");
  }

  // ── Categories ──────────────────────────────────────────────────
  const categories = [
    {
      slug: "hot-coffee",
      name: "قهوه گرم",
      description: "قهوه‌های تخصصی با دانه‌های تازه‌رُست و عصاره‌گیری دقیق.",
      sortOrder: 1,
    },
    {
      slug: "cold-drinks",
      name: "نوشیدنی سرد",
      description: "نوشیدنی‌های خنک، میوه‌ای و دست‌ساز برای روزهای گرم.",
      sortOrder: 2,
    },
    {
      slug: "desserts",
      name: "شیرینی و دسر",
      description: "دسرهای روزانه با مواد تازه و شیرینی متعادل.",
      sortOrder: 3,
    },
    {
      slug: "breakfast",
      name: "صبحانه و میان‌وعده",
      description: "بشقاب‌های سبک و تازه برای شروعی آرام و خوش‌طعم.",
      sortOrder: 4,
    },
    {
      slug: "signature",
      name: "امضای کافه",
      description: "ترکیب‌های اختصاصی که فقط در کافه ما پیدا می‌کنید.",
      sortOrder: 5,
    },
  ];
  const categoryIds = {};
  for (const cat of categories) {
    const doc = await db.collection("menu_categories").findOneAndUpdate(
      { slug: cat.slug },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          parentId: null,
          isActive: true,
          sortOrder: cat.sortOrder,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    categoryIds[cat.slug] = doc._id;
  }
  console.log("✓ Categories seeded");

  // ── Demo menu items ─────────────────────────────────────────────
  const menuItems = [
    {
      name: "Espresso Double Shot",
      category: "hot-coffee",
      price: 118000,
      preparationTime: 5,
      isFeatured: true,
      imageUrl:
        "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=1200&q=85",
      description:
        "دو شات اسپرسو با دانه ۱۰۰٪ عربیکای تازه‌رُست؛ بدنه‌ای غلیظ، کرمای پایدار و پایان طعمی شکلاتی.",
      tags: ["عربیکا", "شکلات تلخ", "بدون شیر"],
    },
    {
      name: "Saffron Rose Latte",
      category: "hot-coffee",
      price: 198000,
      preparationTime: 8,
      isFeatured: true,
      imageUrl:
        "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=1200&q=85",
      description:
        "اسپرسو، شیر بخارداده، زعفران قائنات و رایحه ظریف گل سرخ؛ متعادل، معطر و مناسب عصرهای آرام.",
      tags: ["زعفران", "گل سرخ", "شیر بخارداده"],
    },
    {
      name: "Vanilla Flat White",
      category: "hot-coffee",
      price: 185000,
      preparationTime: 7,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1200&q=85",
      description:
        "فلت‌وایت با میکروفوم ابریشمی، اسپرسوی روشن و مقدار کمی وانیل طبیعی برای شیرینی لطیف.",
      tags: ["وانیل طبیعی", "میکروفوم", "اسپرسو"],
    },
    {
      name: "Cardamom Turkish Coffee",
      category: "hot-coffee",
      price: 145000,
      preparationTime: 8,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85",
      description:
        "قهوه ترک آسیاب‌ریز با هل سبز و سرو سنتی؛ فنجانی کوچک با عطر عمیق و ماندگار.",
      tags: ["قهوه ترک", "هل", "سرو سنتی"],
    },
    {
      name: "Citrus Cold Brew",
      category: "cold-drinks",
      price: 215000,
      preparationTime: 6,
      isFeatured: true,
      imageUrl:
        "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=85",
      description:
        "کلدبرو ۱۸ساعته با تونیک مرکبات، پوست پرتقال و یخ شفاف؛ خنک، روشن و کم‌اسید.",
      tags: ["کلدبرو", "پرتقال", "تونیک"],
    },
    {
      name: "Berry Hibiscus Cooler",
      category: "cold-drinks",
      price: 225000,
      preparationTime: 7,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1200&q=85",
      description:
        "چای ترش دم‌سرد، توت‌های جنگلی، لیمو و آب گازدار؛ رنگی چشم‌نواز با طعمی ترش و تازه.",
      tags: ["چای ترش", "توت جنگلی", "لیمو"],
    },
    {
      name: "Mango Passion Smoothie",
      category: "cold-drinks",
      price: 248000,
      preparationTime: 9,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=1200&q=85",
      description:
        "انبه رسیده، پشن‌فروت، ماست یونانی و یخ؛ اسموتی غلیظ و استوایی بدون شربت مصنوعی.",
      tags: ["انبه", "پشن‌فروت", "ماست یونانی"],
    },
    {
      name: "Pistachio Basque Cheesecake",
      category: "desserts",
      price: 285000,
      preparationTime: 3,
      isFeatured: true,
      imageUrl:
        "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=85",
      description:
        "چیزکیک باسک با مغز نیم‌سوز، مرکز کرمی و لایه‌ای از کرم پسته؛ برش روزانه کافه.",
      tags: ["پسته", "کرم پنیر", "بافت کرمی"],
    },
    {
      name: "Dark Chocolate Tart",
      category: "desserts",
      price: 265000,
      preparationTime: 3,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=1200&q=85",
      description:
        "تارت شکلات تلخ ۷۰٪ با گاناش براق و نمک دریایی؛ انتخابی عمیق برای دوستداران شکلات.",
      tags: ["شکلات ۷۰٪", "گاناش", "نمک دریایی"],
    },
    {
      name: "Cinnamon Morning Roll",
      category: "desserts",
      price: 155000,
      preparationTime: 4,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=1200&q=85",
      description:
        "رول دارچینی تازه از فر با کره، دارچین سیلان و لعاب پنیر خامه‌ای سبک.",
      tags: ["دارچین سیلان", "تازه از فر", "پنیر خامه‌ای"],
    },
    {
      name: "Avocado Sourdough Toast",
      category: "breakfast",
      price: 295000,
      preparationTime: 12,
      isFeatured: true,
      imageUrl:
        "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&w=1200&q=85",
      description:
        "نان خمیرترش تست‌شده با آووکادو، تخم‌مرغ نیمرو، فلفل چیلی و سبزی‌های تازه.",
      tags: ["آووکادو", "تخم‌مرغ", "خمیرترش"],
    },
    {
      name: "Labneh Garden Plate",
      category: "breakfast",
      price: 265000,
      preparationTime: 10,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85",
      description:
        "لبنه چکیده، سبزی‌های فصل، زیتون، گردو و نان تازه؛ بشقابی سبک برای صبح‌های طولانی.",
      tags: ["لبنه", "زیتون", "گردو"],
    },
    {
      name: "Truffle Mushroom Panini",
      category: "breakfast",
      price: 335000,
      preparationTime: 15,
      isFeatured: false,
      imageUrl:
        "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=85",
      description:
        "نان چاباتا با قارچ تفت‌داده، پنیر گودا، پیاز کاراملی و سس ترافل.",
      tags: ["قارچ", "گودا", "ترافل"],
    },
    {
      name: "Rose Pistachio Milk Cake",
      category: "signature",
      price: 245000,
      preparationTime: 5,
      isFeatured: true,
      imageUrl:
        "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=85",
      description:
        "کیک شیری لطیف با خامه گل سرخ، پسته برشته و عطر هل؛ امضای شیرین کافه.",
      tags: ["گل سرخ", "پسته", "هل"],
    },
    {
      name: "Smoked Orange Tonic",
      category: "signature",
      price: 235000,
      preparationTime: 8,
      isFeatured: true,
      imageUrl:
        "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=85",
      description:
        "شربت پرتقال دودی، چای سیاه، تونیک و رزماری؛ نوشیدنی اختصاصی با پایان گیاهی.",
      tags: ["پرتقال دودی", "چای سیاه", "رزماری"],
    },
  ];

  for (const item of menuItems) {
    const slug = slugify(item.name);
    await db.collection("menu_items").findOneAndUpdate(
      { slug },
      {
        $set: {
          name: item.name,
          description: item.description,
          price: item.price,
          currency: "IRR",
          imageUrl: item.imageUrl,
          categoryId: categoryIds[item.category],
          inStock: true,
          isFeatured: item.isFeatured,
          isActive: true,
          preparationTime: item.preparationTime,
          tags: item.tags,
          updatedAt: now(),
        },
        $setOnInsert: { _id: new ObjectId(), slug, createdAt: now() },
      },
      { upsert: true },
    );
  }
  console.log(`✓ Menu items seeded (${menuItems.length})`);

  // ── Demo tables for QR showcase ─────────────────────────────────
  const tables = [
    { number: 1, capacity: 2 },
    { number: 2, capacity: 2 },
    { number: 3, capacity: 4 },
    { number: 4, capacity: 4 },
    { number: 5, capacity: 6 },
    { number: 6, capacity: 8 },
  ];
  for (const table of tables) {
    await db.collection("tables").findOneAndUpdate(
      { number: table.number },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          number: table.number,
          token: randomUUID(),
          capacity: table.capacity,
          isActive: true,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true },
    );
  }
  await db.collection("tables").createIndex({ token: 1 }, { unique: true });
  console.log(`✓ Tables seeded (${tables.length})`);

  // ── Demo orders (read-only admin preview — PRD UC-08) ───────────
  const ordersCount = await db.collection("orders").countDocuments();
  if (ordersCount === 0) {
    const demoOrders = [
      {
        status: "PENDING",
        total: 38000,
        deliveryType: "DINE_IN",
      },
      {
        status: "PROCESSING",
        total: 110000,
        deliveryType: "TAKEAWAY",
      },
      {
        status: "PENDING",
        total: 65000,
        deliveryType: "DINE_IN",
      },
    ].map((o) => ({
      _id: new ObjectId(),
      userId: null,
      status: o.status,
      subtotal: o.total,
      discount: 0,
      total: o.total,
      currency: "IRR",
      notes: null,
      deliveryType: o.deliveryType,
      createdAt: now(),
      updatedAt: now(),
    }));
    await db.collection("orders").insertMany(demoOrders);
    console.log(`✓ Demo orders seeded (${demoOrders.length})`);
  }

  await client.close();
  console.log("✔ Seed completed");
}

main().catch((error) => {
  console.error("✖ Seed failed:", error);
  process.exit(1);
});
