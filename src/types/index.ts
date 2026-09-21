// src/types/index.ts
// قرارداد دامنه — هم‌راستا با prisma/schema.prisma (مقادیر enum عین Schema)

// ─────────────────────────────────────────────
//  RBAC
// ─────────────────────────────────────────────
export type RoleName = "SuperAdmin" | "Manager" | "Staff";

// ─────────────────────────────────────────────
//  User
// ─────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: RoleName;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** داده‌ای که در کوکی نشست HMAC ذخیره می‌شود */
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: RoleName;
}

// ─────────────────────────────────────────────
//  Menu
// ─────────────────────────────────────────────
export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  sortOrder: number;
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
  scheduleDays: number[];
  items?: MenuItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  /** قیمت به ریال (IRR) */
  price: number;
  currency: string;
  imageUrl?: string | null;
  categoryId: string;
  category?: MenuCategory;
  inStock: boolean;
  isFeatured: boolean;
  isActive: boolean;
  preparationTime?: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Table & QR
// ─────────────────────────────────────────────
export interface Table {
  id: string;
  number: number;
  /** UUID v4 ثابت — پایه‌ی مسیر /t/[token] */
  token: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Waiter Call
// ─────────────────────────────────────────────
export type WaiterCallStatus = "PENDING" | "ACKNOWLEDGED" | "RESOLVED";

export interface WaiterCall {
  id: string;
  tableId: string;
  table?: Table;
  userId?: string | null;
  status: WaiterCallStatus;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Reservation
// ─────────────────────────────────────────────
export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface ReservationSlotConfig {
  startHour: number;
  endHour: number;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  tableId: string;
  table?: Table;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Order & OrderItem
// ─────────────────────────────────────────────
export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type DeliveryType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem?: Pick<MenuItem, "id" | "name" | "imageUrl">;
  name: string;
  /** snapshot قیمت به ریال */
  price: number;
  quantity: number;
  currency: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId?: string | null;
  user?: Pick<User, "id" | "name" | "email">;
  tableId?: string | null;
  table?: Pick<Table, "id" | "number">;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string | null;
  deliveryType: DeliveryType;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Payment (آماده‌ی زرین‌پال / شاپرک — بدون منطق فعال در MVP)
// ─────────────────────────────────────────────
export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  amount: number;
  currency: string;
  authority: string;
  refId?: string | null;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Cart (فاز آینده — فقط ساختار داده)
// ─────────────────────────────────────────────
export type CartStatus = "ACTIVE" | "ABANDONED" | "CONVERTED";

export interface CartItem {
  id: string;
  cartId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  createdAt: string;
}

export interface Cart {
  id: string;
  userId?: string | null;
  tableId?: string | null;
  status: CartStatus;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Settings
// ─────────────────────────────────────────────
export interface SiteSettings {
  id: string;
  siteName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: "light" | "dark" | "system";
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  reservationSlots: ReservationSlotConfig[];
}

// ─────────────────────────────────────────────
//  API
// ─────────────────────────────────────────────
export interface ApiResponse<T = undefined> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
