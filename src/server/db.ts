// src/server/db.ts
import { MongoClient, ObjectId, type Db, type Collection } from "mongodb";
import { env } from "@/lib/env";

// ------------------------------------------------------------------
// Document types — mirror prisma/schema.prisma models 1:1
// ------------------------------------------------------------------

export interface RoleDoc {
  _id: ObjectId;
  name: string;
  description?: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  roleId?: ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategoryDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: ObjectId | null;
  isActive: boolean;
  sortOrder: number;
  scheduleStart?: Date | null;
  scheduleEnd?: Date | null;
  scheduleDays: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  categoryId: ObjectId;
  isFeatured: boolean;
  isActive: boolean;
  preparationTime?: number | null;
  tags: string[];
  stockCount?: number | null; // null = نامحدود
  isUnlimited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// هر میز یک qrToken ثابت (UUID) دارد — پایه‌ی QR Code
export interface TableDoc {
  _id: ObjectId;
  number: number;
  qrToken: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// snapshot از name/price در لحظه‌ی ثبت سفارش — بدون فیلد updatedAt (طبق Schema)
export interface OrderItemDoc {
  _id: ObjectId;
  orderId: ObjectId;
  menuItemId: ObjectId;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  createdAt: Date;
}

export interface OrderDoc {
  _id: ObjectId;
  userId?: ObjectId | null;
  tableId?: ObjectId | null;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string | null;
  deliveryType: string;
  paymentStatus: string;
  gateway?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentDoc {
  _id: ObjectId;
  orderId: ObjectId;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  authority?: string | null;
  refId?: string | null;
  gatewayStatus?: string | null;
  callbackUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// guestName/guestPhone الزامی هستند — Reservation فاقد userId است
export interface ReservationDoc {
  _id: ObjectId;
  tableId: ObjectId;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  startTime: Date;
  endTime: Date;
  status: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaiterCallDoc {
  _id: ObjectId;
  tableId: ObjectId;
  userId?: ObjectId | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartDoc {
  _id: ObjectId;
  userId?: ObjectId | null;
  status: string;
  items?: unknown; // Json — { menuItemId, quantity, price, name }[]
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaAssetDoc {
  _id: ObjectId;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  ownerType: string;
  ownerId: string;
  createdAt: Date;
}

export interface SettingDoc {
  _id: ObjectId;
  siteName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogDoc {
  _id: ObjectId;
  action: string;
  actorId?: ObjectId | null;
  details?: unknown;
  createdAt: Date;
}

// ------------------------------------------------------------------
// Client singleton
// ------------------------------------------------------------------

const globalForMongo = globalThis as unknown as {
  mongoClientPromise: Promise<MongoClient> | undefined;
  mongoIndexesEnsured: boolean | undefined;
};

function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(env.DATABASE_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    globalForMongo.mongoClientPromise = client.connect();
  }
  return globalForMongo.mongoClientPromise;
}

function getDatabaseName(): string {
  try {
    const url = new URL(
      env.DATABASE_URL.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:")
    );
    const name = url.pathname.replace(/^\//, "").split("/")[0];
    if (name) return decodeURIComponent(name);
  } catch {
    // fall through
  }
  return "premium-boilerplate-menu";
}

async function ensureIndexes(db: Db): Promise<void> {
  if (globalForMongo.mongoIndexesEnsured) return;
  globalForMongo.mongoIndexesEnsured = true;

  await Promise.all([
    // Role — @@unique(name)
    db.collection("roles").createIndex({ name: 1 }, { unique: true }),

    // User — @@unique(email), @@unique(phone)
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ phone: 1 }, { unique: true, sparse: true }),

    // MenuCategory — @@unique(slug)
    db.collection("menu_categories").createIndex({ slug: 1 }, { unique: true }),

    // MenuItem — @@unique(slug), @@index(categoryId)
    db.collection("menu_items").createIndex({ slug: 1 }, { unique: true }),
    db.collection("menu_items").createIndex({ categoryId: 1 }),
    // ایندکس عملکردی اضافه (خارج از Schema) برای کوئری‌های پرکاربرد صفحه‌ی منو
    db.collection("menu_items").createIndex({ isActive: 1, isFeatured: 1 }),

    // Table — @@unique(number), @@unique(qrToken)
    db.collection("tables").createIndex({ number: 1 }, { unique: true }),
    db.collection("tables").createIndex({ qrToken: 1 }, { unique: true }),

    // WaiterCall — @@index(tableId)
    db.collection("waiter_calls").createIndex({ tableId: 1 }),
    db.collection("waiter_calls").createIndex({ status: 1 }), // اضافه (پنل گارسون)

    // Reservation — @@index(tableId), @@index([startTime, endTime])
    db.collection("reservations").createIndex({ tableId: 1 }),
    db.collection("reservations").createIndex({ startTime: 1, endTime: 1 }),
    db.collection("reservations").createIndex({ status: 1 }), // اضافه

    // Order — @@index(userId), @@index(tableId)
    db.collection("orders").createIndex({ userId: 1 }),
    db.collection("orders").createIndex({ tableId: 1 }),
    db.collection("orders").createIndex({ status: 1 }), // اضافه (پنل مدیریت سفارش‌ها)

    // OrderItem — @@index(orderId), @@index(menuItemId)
    db.collection("order_items").createIndex({ orderId: 1 }),
    db.collection("order_items").createIndex({ menuItemId: 1 }),

    // Payment — @@index(orderId)
    db.collection("payments").createIndex({ orderId: 1 }),

    // Cart — @@index(userId)
    db.collection("carts").createIndex({ userId: 1 }),

    // AuditLog — بدون ایندکس صریح در Schema؛ برای گزارش‌گیری اضافه شده
    db.collection("audit_logs").createIndex({ actorId: 1 }),
    db.collection("audit_logs").createIndex({ createdAt: 1 }),
  ]).catch((error) => {
    globalForMongo.mongoIndexesEnsured = false;
    console.error("[DB] Failed to ensure indexes:", error);
  });
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(getDatabaseName());
  await ensureIndexes(db);
  return db;
}

// ------------------------------------------------------------------
// Typed collection accessors
// ------------------------------------------------------------------

export async function rolesCol(): Promise<Collection<RoleDoc>> {
  return (await getDb()).collection<RoleDoc>("roles");
}
export async function usersCol(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}
export async function menuCategoriesCol(): Promise<Collection<MenuCategoryDoc>> {
  return (await getDb()).collection<MenuCategoryDoc>("menu_categories");
}
export async function menuItemsCol(): Promise<Collection<MenuItemDoc>> {
  return (await getDb()).collection<MenuItemDoc>("menu_items");
}
export async function tablesCol(): Promise<Collection<TableDoc>> {
  return (await getDb()).collection<TableDoc>("tables");
}
export async function ordersCol(): Promise<Collection<OrderDoc>> {
  return (await getDb()).collection<OrderDoc>("orders");
}
export async function orderItemsCol(): Promise<Collection<OrderItemDoc>> {
  return (await getDb()).collection<OrderItemDoc>("order_items");
}
export async function paymentsCol(): Promise<Collection<PaymentDoc>> {
  return (await getDb()).collection<PaymentDoc>("payments");
}
export async function reservationsCol(): Promise<Collection<ReservationDoc>> {
  return (await getDb()).collection<ReservationDoc>("reservations");
}
export async function waiterCallsCol(): Promise<Collection<WaiterCallDoc>> {
  return (await getDb()).collection<WaiterCallDoc>("waiter_calls");
}
export async function cartsCol(): Promise<Collection<CartDoc>> {
  return (await getDb()).collection<CartDoc>("carts");
}
export async function mediaAssetsCol(): Promise<Collection<MediaAssetDoc>> {
  return (await getDb()).collection<MediaAssetDoc>("media_assets");
}
export async function settingsCol(): Promise<Collection<SettingDoc>> {
  return (await getDb()).collection<SettingDoc>("settings");
}
export async function auditLogsCol(): Promise<Collection<AuditLogDoc>> {
  return (await getDb()).collection<AuditLogDoc>("audit_logs");
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
