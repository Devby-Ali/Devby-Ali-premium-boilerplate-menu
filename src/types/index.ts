// src/types/index.ts

// ─────────────────────────────────────────────
//  RBAC
// ─────────────────────────────────────────────
export type RoleName = "SuperAdmin" | "Manager" | "Staff";

export interface Role {
  id: string;
  name: RoleName;
  description?: string | null;
  isDefault: boolean;
}

// ─────────────────────────────────────────────
//  User
// ─────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roleId?: string | null;
  role?: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// داده‌ای که در کوکی session ذخیره می‌شود
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  roleId: string;
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
  scheduleStart?: string | null; // ISO datetime
  scheduleEnd?: string | null;
  scheduleDays: number[];        // 0=شنبه … 6=جمعه
  items?: MenuItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  categoryId: string;
  category?: MenuCategory;
  isFeatured: boolean;
  isActive: boolean;
  preparationTime?: number | null;
  tags: string[];
  stockCount?: number | null; // null = نامحدود
  isUnlimited: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Table & QR
// ─────────────────────────────────────────────
export interface Table {
  id: string;
  number: number;
  qrToken: string; // UUID ثابت — پایه QR Code هر میز
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Waiter Call
// ─────────────────────────────────────────────
export type WaiterCallStatus = "pending" | "acknowledged" | "resolved";

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
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Reservation {
  id: string;
  tableId: string;
  table?: Table;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  startTime: string; // ISO datetime
  endTime: string;
  status: ReservationStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Order & OrderItem
// ─────────────────────────────────────────────
export type OrderStatus = "pending" | "processing" | "ready" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed";
export type DeliveryType = "dine_in" | "takeaway" | "delivery";
export type GatewayProvider = "zarinpal" | "idpay" | "zibal";

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem?: Pick<MenuItem, "id" | "name" | "imageUrl">;
  name: string;    // snapshot نام در زمان سفارش
  price: number;   // snapshot قیمت در زمان سفارش
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
  paymentStatus: PaymentStatus;
  gateway?: GatewayProvider | null;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Payment (Shaparak-ready)
// ─────────────────────────────────────────────
export type PaymentProviderStatus = "pending" | "successful" | "failed";

export interface Payment {
  id: string;
  orderId: string;
  provider: GatewayProvider;
  amount: number;
  currency: string;
  status: PaymentProviderStatus;
  authority?: string | null;  // کد یکتای شاپرک
  refId?: string | null;      // شماره پیگیری موفق
  gatewayStatus?: string | null;
  callbackUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  Cart (فاز آینده)
// ─────────────────────────────────────────────
export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type CartStatus = "active" | "abandoned" | "converted";

export interface Cart {
  id: string;
  userId?: string | null;
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
