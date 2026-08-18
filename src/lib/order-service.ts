// src/lib/order-service.ts
import { ObjectId } from "mongodb";
import { ordersCol, toObjectId, type OrderDoc } from "@/server/db";
import type { Order as OrderType } from "@/types";

function mapOrder(o: OrderDoc): OrderType {
  return {
    id: o._id.toHexString(),
    userId: o.userId?.toHexString() ?? null,
    tableId: o.tableId?.toHexString() ?? null,
    status: o.status as OrderType["status"],
    items: [],
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    currency: o.currency,
    notes: o.notes ?? null,
    deliveryType: o.deliveryType as OrderType["deliveryType"],
    paymentStatus: o.paymentStatus as OrderType["paymentStatus"],
    gateway: (o.gateway ?? null) as OrderType["gateway"],
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export async function getOrders(): Promise<OrderType[]> {
  const col = await ordersCol();
  const orders = await col.find({}).sort({ createdAt: -1 }).toArray();
  return orders.map(mapOrder);
}

export async function getOrdersByStatus(status: string): Promise<OrderType[]> {
  const col = await ordersCol();
  const orders = await col.find({ status }).sort({ createdAt: -1 }).toArray();
  return orders.map(mapOrder);
}

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<OrderType | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const col = await ordersCol();
  const updated = await col.findOneAndUpdate(
    { _id: objectId },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return updated ? mapOrder(updated) : null;
}

export async function getOrderStats() {
  const col = await ordersCol();
  const grouped = await col
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();
  const byStatus = new Map(grouped.map((g) => [g._id, g.count]));
  return {
    pending: byStatus.get("pending") ?? 0,
    processing: byStatus.get("processing") ?? 0,
    ready: byStatus.get("ready") ?? 0,
    delivered: byStatus.get("delivered") ?? 0,
    cancelled: byStatus.get("cancelled") ?? 0,
  };
}

export async function createOrder(input: {
  subtotal: number;
  total: number;
  tableId?: string | null;
  deliveryType?: string;
  notes?: string | null;
}): Promise<OrderType> {
  const col = await ordersCol();
  const now = new Date();
  const doc: OrderDoc = {
    _id: new ObjectId(),
    userId: null,
    tableId: input.tableId ? toObjectId(input.tableId) : null,
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
  await col.insertOne(doc);
  return mapOrder(doc);
}
