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

// Load .env (Node ≥ 20.12). Falls back to the local default.
try {
  process.loadEnvFile?.(".env");
} catch {
  // .env absent — rely on defaults below
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? "mongodb://localhost:27017/premium-boilerplate-menu";
const ADMIN_INITIAL_EMAIL = (
  process.env.ADMIN_INITIAL_EMAIL ?? "admin@premiummenu.test"
).toLowerCase();
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD ?? "admin1234";

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
  const client = new MongoClient(DATABASE_URL, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(getDatabaseName(DATABASE_URL));

  console.log(`→ Connected to ${getDatabaseName(DATABASE_URL)}`);

  // ── Indexes (PRD §8.4) ──────────────────────────────────────────
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ phone: 1 }, { unique: true, sparse: true }),
    db.collection("roles").createIndex({ name: 1 }, { unique: true }),
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

  // ── Role: admin (RBAC foundation — PRD FR-D04) ──────────────────
  const roleResult = await db.collection("roles").findOneAndUpdate(
    { name: "admin" },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        name: "admin",
        description: "Administrator",
        isDefault: true,
        createdAt: now(),
        updatedAt: now(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  const adminRole = roleResult;
  console.log("✓ Role: admin");

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
        roleId: adminRole._id,
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
    { slug: "coffee", name: "کافی‌شاپ", sortOrder: 1 },
    { slug: "dessert", name: "دسر", sortOrder: 2 },
    { slug: "savory", name: "اشنایی", sortOrder: 3 },
    { slug: "signature", name: "ویژه", sortOrder: 4 },
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
          description: `${cat.name} از منوی دیجیتال`,
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
      name: "Espresso Noir",
      title: "اسپرسو نوار",
      category: "coffee",
      price: 98000,
      preparationTime: 5,
      isFeatured: true,
      description:
        "اسپرسوی پرفشار با دانه‌های عربیکای تازه‌بوای‌شده؛ بدنه‌ای غلیظ و کرمای مخملی.",
      tags: ["دانه عربیکا", "تازه دم", "بدون شیر"],
    },
    {
      name: "Saffron Latte",
      title: "لاته زعفرانی",
      category: "coffee",
      price: 145000,
      preparationTime: 8,
      isFeatured: true,
      description:
        "ترکیب لطیف اسپرسو، شیر بخارداده و زعفران اصل قائنات با عصاره گلاب.",
      tags: ["زعفران", "شیر بخارداده", "گلاب"],
    },
    {
      name: "Saffron Cheesecake",
      title: "چیزکیک زعفرانی",
      category: "dessert",
      price: 165000,
      preparationTime: 10,
      isFeatured: false,
      description:
        "چیزکیک پخته‌شده با کرم زعفران و پودر پسته؛ همراه با سس گل سرخ.",
      tags: ["زعفران", "پسته", "کرم پنیر"],
    },
    {
      name: "Herb Panini",
      title: "پانینی سبزیجات",
      category: "savory",
      price: 185000,
      preparationTime: 15,
      isFeatured: false,
      description:
        "پانینی گریل‌شده با سبزیجات تازه باغی، پنیر موتزارلا و سس پستو خانگی.",
      tags: ["سبزیجات تازه", "موتزارلا", "پستو"],
    },
  ];

  for (const item of menuItems) {
    const slug = slugify(item.name);
    await db.collection("menu_items").findOneAndUpdate(
      { slug },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          name: item.name,
          slug,
          description: item.description,
          price: item.price,
          currency: "IRR",
          imageUrl: null,
          categoryId: categoryIds[item.category],
          isFeatured: item.isFeatured,
          isActive: true,
          preparationTime: item.preparationTime,
          tags: item.tags,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true },
    );
  }
  console.log(`✓ Menu items seeded (${menuItems.length})`);

  // ── Demo orders (read-only admin preview — PRD UC-08) ───────────
  const ordersCount = await db.collection("orders").countDocuments();
  if (ordersCount === 0) {
    const demoOrders = [
      { status: "pending", total: 38000, deliveryType: "dine_in", paymentStatus: "pending" },
      { status: "processing", total: 110000, deliveryType: "takeaway", paymentStatus: "paid" },
      { status: "pending", total: 65000, deliveryType: "dine_in", paymentStatus: "pending" },
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
      paymentStatus: o.paymentStatus,
      gateway: null,
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
