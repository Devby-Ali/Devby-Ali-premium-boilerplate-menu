// src/server/db.ts
// ─────────────────────────────────────────────────────────────────────────────
// MongoDB data-access layer (official `mongodb` Node.js driver).
//
// Why not PrismaClient at runtime?
// `prisma/schema.prisma` remains the canonical data model (and `prisma generate`
// still runs on postinstall), but Prisma 7.x ships **no MongoDB query compiler**
// (`prisma generate` emits query compilers for postgresql/mysql/sqlite/sqlserver/
// cockroachdb only, and the official driver-adapter list is SQL-only). A Prisma
// Client constructed for provider "mongodb" throws PrismaClientInitializationError
// at runtime. The officially supported, documented runtime for MongoDB today is
// the `mongodb` driver: https://www.mongodb.com/docs/drivers/node/current/
//
// The document types below mirror prisma/schema.prisma 1:1 so swapping the
// runtime back to Prisma later only touches this file + the services.
// ─────────────────────────────────────────────────────────────────────────────

import { MongoClient, ObjectId, type Db, type Collection } from "mongodb";

import { env } from "@/lib/env";

// ------------------------------------------------------------------
// Document types — mirror prisma/schema.prisma models.
// `_id` is the Mongo primary key; services expose it as `id: string`.
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

export interface OrderDoc {
  _id: ObjectId;
  userId?: ObjectId | null;
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

export interface CartDoc {
  _id: ObjectId;
  userId?: ObjectId | null;
  status: string;
  items?: unknown;
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
// Client singleton (cached on globalThis to survive Next.js dev HMR)
// ------------------------------------------------------------------

const globalForMongo = globalThis as unknown as {
  mongoClientPromise: Promise<MongoClient> | undefined;
  mongoIndexesEnsured: boolean | undefined;
};

function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(env.DATABASE_URL, {
      // Fail fast instead of hanging requests when MongoDB is unreachable.
      serverSelectionTimeoutMS: 5000,
    });
    globalForMongo.mongoClientPromise = client.connect();
  }
  return globalForMongo.mongoClientPromise;
}

/** Derive the database name from the connection string path. */
function getDatabaseName(): string {
  try {
    const url = new URL(env.DATABASE_URL.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"));
    const name = url.pathname.replace(/^\//, "").split("/")[0];
    if (name) return decodeURIComponent(name);
  } catch {
    // fall through to default
  }
  return "premium-boilerplate-menu";
}

/** Recommended indexes per PRD §8.4 — created once per process, idempotently. */
async function ensureIndexes(db: Db): Promise<void> {
  if (globalForMongo.mongoIndexesEnsured) return;
  globalForMongo.mongoIndexesEnsured = true;

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
  ]).catch((error) => {
    // Index creation must never take the app down (e.g. read-only user).
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
export async function mediaAssetsCol(): Promise<Collection<MediaAssetDoc>> {
  return (await getDb()).collection<MediaAssetDoc>("media_assets");
}
export async function settingsCol(): Promise<Collection<SettingDoc>> {
  return (await getDb()).collection<SettingDoc>("settings");
}
export async function ordersCol(): Promise<Collection<OrderDoc>> {
  return (await getDb()).collection<OrderDoc>("orders");
}
export async function paymentsCol(): Promise<Collection<PaymentDoc>> {
  return (await getDb()).collection<PaymentDoc>("payments");
}
export async function cartsCol(): Promise<Collection<CartDoc>> {
  return (await getDb()).collection<CartDoc>("carts");
}
export async function auditLogsCol(): Promise<Collection<AuditLogDoc>> {
  return (await getDb()).collection<AuditLogDoc>("audit_logs");
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Parse a string id into an ObjectId, returning null when invalid. */
export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
