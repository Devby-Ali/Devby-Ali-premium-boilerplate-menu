// src/server/db.ts
// لایه‌ی دسترسی Native Driver — قرارداد فیلدها 1:1 با prisma/schema.prisma
import { MongoClient, ObjectId, type Db, type Collection } from "mongodb";
import { env } from "@/lib/env";
import type {
  CartStatus,
  DeliveryType,
  OrderStatus,
  PaymentStatus,
  ReservationSlotConfig,
  ReservationStatus,
  RoleName,
  WaiterCallStatus,
} from "@/types";

// ------------------------------------------------------------------
// Document types
// ------------------------------------------------------------------

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  role: RoleName;
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
  scheduledFrom?: Date | null;
  scheduledTo?: Date | null;
  scheduleDays: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string | null;
  /** ریال (IRR) */
  price: number;
  currency: string;
  imageUrl?: string | null;
  categoryId: ObjectId;
  inStock: boolean;
  isFeatured: boolean;
  isActive: boolean;
  preparationTime?: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TableDoc {
  _id: ObjectId;
  number: number;
  token: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string | null;
  deliveryType: DeliveryType;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentDoc {
  _id: ObjectId;
  orderId: ObjectId;
  provider: string;
  amount: number;
  currency: string;
  authority: string;
  refId?: string | null;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationDoc {
  _id: ObjectId;
  tableId: ObjectId;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaiterCallDoc {
  _id: ObjectId;
  tableId: ObjectId;
  userId?: ObjectId | null;
  status: WaiterCallStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartDoc {
  _id: ObjectId;
  userId?: ObjectId | null;
  tableId?: ObjectId | null;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemDoc {
  _id: ObjectId;
  cartId: ObjectId;
  menuItemId: ObjectId;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  createdAt: Date;
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
  reservationSlots: ReservationSlotConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseDoc {
  _id: ObjectId;
  title: string;
  amount: number;
  currency: string;
  purchasedAt: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseDoc {
  _id: ObjectId;
  title: string;
  amount: number;
  currency: string;
  spentAt: Date;
  notes?: string | null;
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

/** بازه‌های پیش‌فرض مطابق img_3.jpg */
export const DEFAULT_RESERVATION_SLOTS: ReservationSlotConfig[] = [
  { startHour: 8, endHour: 10, isActive: true },
  { startHour: 10, endHour: 12, isActive: true },
  { startHour: 12, endHour: 14, isActive: true },
  { startHour: 14, endHour: 16, isActive: true },
  { startHour: 16, endHour: 18, isActive: true },
  { startHour: 18, endHour: 20, isActive: true },
  { startHour: 20, endHour: 22, isActive: true },
];

// ------------------------------------------------------------------
// Client singleton
// ------------------------------------------------------------------

const globalForMongo = globalThis as unknown as {
  mongoClientPromise: Promise<MongoClient> | undefined;
  mongoIndexesEnsured: boolean | undefined;
  mongoLegacyMigrated: boolean | undefined;
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
      env.DATABASE_URL.replace(/^mongodb\+srv:/, "https:").replace(
        /^mongodb:/,
        "http:",
      ),
    );
    const name = url.pathname.replace(/^\//, "").split("/")[0];
    if (name) return decodeURIComponent(name);
  } catch {
    // fall through
  }
  return "premium-boilerplate-menu";
}

/**
 * مهاجرت یک‌باره‌ی فیلدهای قدیمی Runtime به قرارداد Canonical Schema.
 * فقط فیلدهای شناخته‌شده‌ی ناسازگار را اصلاح می‌کند؛ داده‌ی سالم دست‌نخورده می‌ماند.
 */
async function migrateLegacyFields(db: Db): Promise<void> {
  if (globalForMongo.mongoLegacyMigrated) return;
  globalForMongo.mongoLegacyMigrated = true;

  try {
    // User.roleId → User.role
    const roles = await db.collection("roles").find({}).toArray();
    const roleById = new Map(
      roles.map((role) => [String(role._id), String(role.name)]),
    );
    const usersNeedingRole = await db
      .collection("users")
      .find({ role: { $exists: false }, roleId: { $exists: true } })
      .toArray();
    for (const user of usersNeedingRole) {
      const roleName = roleById.get(String(user.roleId));
      if (!roleName) continue;
      await db
        .collection("users")
        .updateOne(
          { _id: user._id },
          { $set: { role: roleName }, $unset: { roleId: "" } },
        );
    }

    // Category.scheduleStart/End → scheduledFrom/To
    await db
      .collection("menu_categories")
      .updateMany(
        { scheduleStart: { $exists: true }, scheduledFrom: { $exists: false } },
        [
          { $set: { scheduledFrom: "$scheduleStart" } },
          { $unset: "scheduleStart" },
        ],
      );
    await db
      .collection("menu_categories")
      .updateMany(
        { scheduleEnd: { $exists: true }, scheduledTo: { $exists: false } },
        [{ $set: { scheduledTo: "$scheduleEnd" } }, { $unset: "scheduleEnd" }],
      );

    // MenuItem.stockCount/isUnlimited → inStock
    const itemsNeedingStock = await db
      .collection("menu_items")
      .find({ inStock: { $exists: false } })
      .toArray();
    for (const item of itemsNeedingStock) {
      const isUnlimited =
        item.isUnlimited === true || item.isUnlimited === undefined;
      const stockCount =
        typeof item.stockCount === "number" ? item.stockCount : null;
      const inStock = isUnlimited || (stockCount !== null && stockCount > 0);
      await db.collection("menu_items").updateOne(
        { _id: item._id },
        {
          $set: { inStock },
          $unset: { stockCount: "", isUnlimited: "" },
        },
      );
    }

    // Table.qrToken → token
    await db
      .collection("tables")
      .updateMany({ qrToken: { $exists: true }, token: { $exists: false } }, [
        { $set: { token: "$qrToken" } },
        { $unset: "qrToken" },
      ]);

    // Order: حذف فیلدهای پرداخت توکار + نرمال‌سازی enum
    const statusMap: Record<string, string> = {
      pending: "PENDING",
      processing: "PROCESSING",
      ready: "READY",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      dine_in: "DINE_IN",
      takeaway: "TAKEAWAY",
      delivery: "DELIVERY",
      acknowledged: "ACKNOWLEDGED",
      resolved: "RESOLVED",
      confirmed: "CONFIRMED",
      completed: "COMPLETED",
      active: "ACTIVE",
      abandoned: "ABANDONED",
      converted: "CONVERTED",
      paid: "PAID",
      failed: "FAILED",
      refunded: "REFUNDED",
    };

    for (const [from, to] of Object.entries(statusMap)) {
      await db
        .collection("orders")
        .updateMany({ status: from }, { $set: { status: to } });
      await db
        .collection("orders")
        .updateMany({ deliveryType: from }, { $set: { deliveryType: to } });
      await db
        .collection("reservations")
        .updateMany({ status: from }, { $set: { status: to } });
      await db
        .collection("waiter_calls")
        .updateMany({ status: from }, { $set: { status: to } });
      await db
        .collection("carts")
        .updateMany({ status: from }, { $set: { status: to } });
      await db
        .collection("payments")
        .updateMany({ status: from }, { $set: { status: to } });
    }

    await db
      .collection("orders")
      .updateMany({}, { $unset: { paymentStatus: "", gateway: "" } });

    // Setting.reservationSlots پیش‌فرض
    await db
      .collection("settings")
      .updateMany(
        { reservationSlots: { $exists: false } },
        { $set: { reservationSlots: DEFAULT_RESERVATION_SLOTS } },
      );
  } catch (error) {
    globalForMongo.mongoLegacyMigrated = false;
    console.error("[DB] Legacy field migration failed:", error);
  }
}

async function ensureIndexes(db: Db): Promise<void> {
  if (globalForMongo.mongoIndexesEnsured) return;
  globalForMongo.mongoIndexesEnsured = true;

  await migrateLegacyFields(db);

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db
      .collection("users")
      .createIndex({ phone: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ role: 1 }),

    db.collection("menu_categories").createIndex({ slug: 1 }, { unique: true }),
    db.collection("menu_categories").createIndex({ parentId: 1 }),

    db.collection("menu_items").createIndex({ slug: 1 }, { unique: true }),
    db.collection("menu_items").createIndex({ categoryId: 1 }),
    db.collection("menu_items").createIndex({ isActive: 1, inStock: 1 }),

    db.collection("tables").createIndex({ number: 1 }, { unique: true }),
    db.collection("tables").createIndex({ token: 1 }, { unique: true }),

    db.collection("waiter_calls").createIndex({ tableId: 1, status: 1 }),

    db.collection("reservations").createIndex({ tableId: 1, startTime: 1 }),
    db.collection("reservations").createIndex({ startTime: 1, endTime: 1 }),

    db.collection("orders").createIndex({ userId: 1, createdAt: 1 }),
    db.collection("orders").createIndex({ tableId: 1, createdAt: 1 }),
    db.collection("orders").createIndex({ status: 1, createdAt: 1 }),

    db.collection("order_items").createIndex({ orderId: 1 }),
    db.collection("order_items").createIndex({ menuItemId: 1 }),

    db.collection("payments").createIndex({ orderId: 1 }),
    db.collection("payments").createIndex({ authority: 1 }),

    db.collection("carts").createIndex({ userId: 1, status: 1 }),
    db.collection("carts").createIndex({ tableId: 1, status: 1 }),
    db.collection("cart_items").createIndex({ cartId: 1 }),
    db.collection("cart_items").createIndex({ menuItemId: 1 }),

    db.collection("purchases").createIndex({ purchasedAt: 1 }),
    db.collection("expenses").createIndex({ spentAt: 1 }),
    db.collection("media_assets").createIndex({ ownerType: 1, ownerId: 1 }),
    db.collection("audit_logs").createIndex({ actorId: 1, createdAt: 1 }),
  ]).catch((error) => {
    globalForMongo.mongoIndexesEnsured = false;
    console.error("[DB] Failed to ensure indexes:", error);
  });
}

export async function getMongoClient(): Promise<MongoClient> {
  return getClientPromise();
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

export async function usersCol(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}
export async function menuCategoriesCol(): Promise<
  Collection<MenuCategoryDoc>
> {
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
export async function cartItemsCol(): Promise<Collection<CartItemDoc>> {
  return (await getDb()).collection<CartItemDoc>("cart_items");
}
export async function mediaAssetsCol(): Promise<Collection<MediaAssetDoc>> {
  return (await getDb()).collection<MediaAssetDoc>("media_assets");
}
export async function settingsCol(): Promise<Collection<SettingDoc>> {
  return (await getDb()).collection<SettingDoc>("settings");
}
export async function purchasesCol(): Promise<Collection<PurchaseDoc>> {
  return (await getDb()).collection<PurchaseDoc>("purchases");
}
export async function expensesCol(): Promise<Collection<ExpenseDoc>> {
  return (await getDb()).collection<ExpenseDoc>("expenses");
}
export async function auditLogsCol(): Promise<Collection<AuditLogDoc>> {
  return (await getDb()).collection<AuditLogDoc>("audit_logs");
}

export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
