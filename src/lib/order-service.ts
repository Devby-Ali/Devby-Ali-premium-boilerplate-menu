// src/lib/order-service.ts
// Data service for orders with Prisma + in-memory fallback.

import type { Order } from "@prisma/client";
import { getPrismaClient } from "@/server/prisma";
import type { Order as OrderType } from "@/types";

// ------------------------------------------------------------------
// In-memory store
// ------------------------------------------------------------------
const memOrders: Map<string, Order> = new Map();
let memNextId = 1;

function nextMemOrderId(): string {
  return `ord_mem_${memNextId++}`;
}

// Seed some demo orders
if (memOrders.size === 0) {
  const demoOrders: Omit<Order, "id" | "createdAt" | "updatedAt" | "payments" | "user">[] = [
    { userId: null, status: "pending", subtotal: 38000, discount: 0, total: 38000, currency: "IRR", notes: null, deliveryType: "dine_in", paymentStatus: "pending", gateway: null },
    { userId: null, status: "processing", subtotal: 110000, discount: 0, total: 110000, currency: "IRR", notes: null, deliveryType: "takeaway", paymentStatus: "paid", gateway: null },
    { userId: null, status: "pending", subtotal: 65000, discount: 0, total: 65000, currency: "IRR", notes: null, deliveryType: "dine_in", paymentStatus: "pending", gateway: null },
  ];
  demoOrders.forEach((o) => {
    const id = nextMemOrderId();
    const now = new Date();
    memOrders.set(id, { ...o, id, createdAt: now, updatedAt: now } as Order);
  });
}

// ------------------------------------------------------------------
// Prisma availability check
// ------------------------------------------------------------------
let prismaAvailable: boolean | null = null;

async function isPrismaAvailable(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    prismaAvailable = true;
  } catch {
    prismaAvailable = false;
  }
  return prismaAvailable;
}

// ------------------------------------------------------------------
// Type mapper
// ------------------------------------------------------------------
function mapOrder(o: Order): OrderType {
  return {
    id: o.id,
    userId: o.userId ?? undefined,
    status: o.status as OrderType["status"],
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    currency: o.currency,
    deliveryType: o.deliveryType as OrderType["deliveryType"],
    paymentStatus: o.paymentStatus as OrderType["paymentStatus"],
    gateway: o.gateway as OrderType["gateway"] | undefined,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

// ------------------------------------------------------------------
// Order methods
// ------------------------------------------------------------------
export async function getOrders(): Promise<OrderType[]> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });
    return orders.map(mapOrder);
  }
  return [...memOrders.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(mapOrder);
}

export async function getOrdersByStatus(status: string): Promise<OrderType[]> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const orders = await prisma.order.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
    return orders.map(mapOrder);
  }
  return [...memOrders.values()]
    .filter((o) => o.status === status)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(mapOrder);
}

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<OrderType | null> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });
    return mapOrder(order);
  }
  const existing = memOrders.get(id);
  if (!existing) return null;
  existing.status = status;
  existing.updatedAt = new Date();
  memOrders.set(id, existing);
  return mapOrder(existing);
}

export async function getOrderStats() {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const [pending, processing, ready, delivered, cancelled] = await Promise.all([
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.count({ where: { status: "processing" } }),
      prisma.order.count({ where: { status: "ready" } }),
      prisma.order.count({ where: { status: "delivered" } }),
      prisma.order.count({ where: { status: "cancelled" } }),
    ]);
    return { pending, processing, ready, delivered, cancelled };
  }
  const all = [...memOrders.values()];
  return {
    pending: all.filter((o) => o.status === "pending").length,
    processing: all.filter((o) => o.status === "processing").length,
    ready: all.filter((o) => o.status === "ready").length,
    delivered: all.filter((o) => o.status === "delivered").length,
    cancelled: all.filter((o) => o.status === "cancelled").length,
  };
}

export async function createOrder(input: {
  subtotal: number;
  total: number;
  deliveryType?: string;
  notes?: string | null;
}): Promise<OrderType> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const order = await prisma.order.create({
      data: {
        subtotal: input.subtotal,
        total: input.total,
        deliveryType: input.deliveryType ?? "dine_in",
        notes: input.notes ?? null,
      },
    });
    return mapOrder(order);
  }
  const id = nextMemOrderId();
  const now = new Date();
  const order: Order = {
    id,
    userId: null,
    status: "pending",
    subtotal: input.subtotal,
    discount: 0,
    total: input.total,
    currency: "IRR",
    notes: input.notes ?? null,
    deliveryType: input.deliveryType ?? "dine_in",
    paymentStatus: "pending",
    gateway: null,
    createdAt: now,
    updatedAt: now,
  };
  memOrders.set(id, order);
  return mapOrder(order);
}
