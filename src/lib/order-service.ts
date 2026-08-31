// src/lib/order-service.ts
import { ObjectId } from "mongodb";
import {
  menuItemsCol,
  orderItemsCol,
  ordersCol,
  tablesCol,
  toObjectId,
  type OrderDoc,
  type OrderItemDoc,
} from "@/server/db";
import type { Order as OrderType } from "@/types";

type OrderWithItems = OrderDoc & { items?: OrderItemDoc[]; tableNumber?: number };

function mapOrder(o: OrderWithItems): OrderType & { tableNumber?: number } {
  return {
    id: o._id.toHexString(),
    userId: o.userId?.toHexString() ?? null,
    tableId: o.tableId?.toHexString() ?? null,
    status: o.status as OrderType["status"],
    items: (o.items ?? []).map((item) => ({
      id: item._id.toHexString(),
      orderId: item.orderId.toHexString(),
      menuItemId: item.menuItemId.toHexString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      currency: item.currency,
      createdAt: item.createdAt.toISOString(),
    })),
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
    tableNumber: o.tableNumber,
  };
}

async function attachOrderDetails(orders: OrderDoc[]): Promise<OrderWithItems[]> {
  if (orders.length === 0) return [];
  const orderIds = orders.map((order) => order._id);
  const tableIds = orders.flatMap((order) => (order.tableId ? [order.tableId] : []));
  const [items, tables] = await Promise.all([
    (await orderItemsCol()).find({ orderId: { $in: orderIds } }).toArray(),
    (await tablesCol())
      .find({ _id: { $in: tableIds } })
      .project({ _id: 1, number: 1 })
      .toArray(),
  ]);
  const itemsByOrder = new Map<string, OrderItemDoc[]>();
  for (const item of items) {
    const key = item.orderId.toHexString();
    itemsByOrder.set(key, [...(itemsByOrder.get(key) ?? []), item]);
  }
  const tableMap = new Map(
    tables.map((table) => [table._id.toHexString(), table.number]),
  );
  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order._id.toHexString()) ?? [],
    tableNumber: order.tableId
      ? tableMap.get(order.tableId.toHexString())
      : undefined,
  }));
}

export async function getOrders(): Promise<(OrderType & { tableNumber?: number })[]> {
  const col = await ordersCol();
  const orders = await col.find({}).sort({ createdAt: -1 }).toArray();
  return (await attachOrderDetails(orders)).map(mapOrder);
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

export async function createDineInOrder(input: {
  tableId: string;
  items: { menuItemId: string; quantity: number }[];
  notes?: string | null;
}): Promise<OrderType & { tableNumber?: number }> {
  const tableId = toObjectId(input.tableId);
  if (!tableId) throw new Error("TABLE_NOT_FOUND");

  const table = await (await tablesCol()).findOne({ _id: tableId, isActive: true });
  if (!table) throw new Error("TABLE_NOT_FOUND");

  const normalizedItems = input.items
    .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0)
    .map((item) => ({ ...item, objectId: toObjectId(item.menuItemId) }));
  if (
    normalizedItems.length === 0 ||
    normalizedItems.some((item) => !item.objectId)
  ) {
    throw new Error("INVALID_ITEMS");
  }

  const menuItems = await (await menuItemsCol())
    .find({
      _id: { $in: normalizedItems.map((item) => item.objectId!) },
      isActive: true,
    })
    .toArray();
  if (menuItems.length !== normalizedItems.length) {
    throw new Error("ITEM_NOT_AVAILABLE");
  }

  const menuItemMap = new Map(
    menuItems.map((item) => [item._id.toHexString(), item]),
  );
  const orderItems = normalizedItems.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (
      !menuItem ||
      (!menuItem.isUnlimited &&
        (menuItem.stockCount ?? 0) < item.quantity)
    ) {
      throw new Error("ITEM_NOT_AVAILABLE");
    }
    return { menuItem, quantity: item.quantity };
  });

  const subtotal = orderItems.reduce(
    (total, item) => total + item.menuItem.price * item.quantity,
    0,
  );
  const orders = await ordersCol();
  const now = new Date();
  const doc: OrderDoc = {
    _id: new ObjectId(),
    userId: null,
    tableId,
    status: "pending",
    subtotal,
    discount: 0,
    total: subtotal,
    currency: "IRR",
    notes: input.notes ?? null,
    deliveryType: "dine_in",
    paymentStatus: "pending",
    gateway: null,
    createdAt: now,
    updatedAt: now,
  };
  await orders.insertOne(doc);

  const itemDocuments: OrderItemDoc[] = orderItems.map(({ menuItem, quantity }) => ({
    _id: new ObjectId(),
    orderId: doc._id,
    menuItemId: menuItem._id,
    name: menuItem.name,
    price: menuItem.price,
    quantity,
    currency: menuItem.currency,
    createdAt: now,
  }));

  try {
    await (await orderItemsCol()).insertMany(itemDocuments);
  } catch (error) {
    await orders.deleteOne({ _id: doc._id });
    throw error;
  }

  return mapOrder({
    ...doc,
    items: itemDocuments,
    tableNumber: table.number,
  });
}
