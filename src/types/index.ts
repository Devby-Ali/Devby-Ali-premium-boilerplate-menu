// ─────────────────────────────────────────────
//  Menu
// ─────────────────────────────────────────────
export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  items?: MenuItem[];
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
}

// ─────────────────────────────────────────────
//  Role & User
// ─────────────────────────────────────────────
export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: Role;
  isActive: boolean;
  createdAt: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string; // role name
  roleId?: string;
}

// ─────────────────────────────────────────────
//  Order & Payment
// ─────────────────────────────────────────────
export type OrderStatus = "pending" | "processing" | "ready" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed";
export type DeliveryType = "dine_in" | "takeaway" | "delivery";
export type GatewayProvider = "zarinpal" | "idpay" | "zibal";

export interface Order {
  id: string;
  userId?: string;
  user?: User;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  deliveryType: DeliveryType;
  paymentStatus: PaymentStatus;
  gateway?: GatewayProvider;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  order?: Order;
  provider: GatewayProvider;
  amount: number;
  currency: string;
  status: "pending" | "successful" | "failed";
  authority?: string;
  refId?: string;
  gatewayStatus?: string;
  callbackUrl?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
//  Cart
// ─────────────────────────────────────────────
export interface CartItem {
  menuItemId: string;
  quantity: number;
  price: number;
  name?: string; // snapshot of menu item name
}

export type CartStatus = "active" | "abandoned" | "converted";

export interface Cart {
  id: string;
  userId?: string;
  status: CartStatus;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  API
// ─────────────────────────────────────────────
export interface ApiResponse<T = undefined> {
  data?: T;
  error?: string;
  message?: string;
}
