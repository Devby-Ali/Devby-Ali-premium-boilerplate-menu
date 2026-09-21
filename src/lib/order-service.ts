// src/lib/order-service.ts
import { ObjectId } from "mongodb";
import {
  getDb,
  getMongoClient,
  menuItemsCol,
  orderItemsCol,
  ordersCol,
  tablesCol,
  toObjectId,
  type MenuItemDoc,
  type OrderDoc,
  type OrderItemDoc,
  type TableDoc,
} from "@/server/db";
import type { Order as OrderType, OrderStatus } from "@/types";

type OrderWithItems = OrderDoc & {
  items?: OrderItemDoc[];
  tableNumber?: number;
};

function mapOrder(o: OrderWithItems): OrderType & { tableNumber?: number } {
  return {
    id: o._id.toHexString(),
    userId: o.userId?.toHexString() ?? null,
    tableId: o.tableId?.toHexString() ?? null,
    status: o.status,
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
    deliveryType: o.deliveryType,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    tableNumber: o.tableNumber,
  };
}

async function attachOrderDetails(
  orders: OrderDoc[],
): Promise<OrderWithItems[]> {
  if (orders.length === 0) return [];
  const orderIds = orders.map((order) => order._id);
  const tableIds = orders.flatMap((order) =>
    order.tableId ? [order.tableId] : [],
  );
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

export async function getOrders(): Promise<
  (OrderType & { tableNumber?: number })[]
> {
  const col = await ordersCol();
  const orders = await col.find({}).sort({ createdAt: -1 }).toArray();
  return (await attachOrderDetails(orders)).map(mapOrder);
}

export async function getOrdersByStatus(
  status: OrderStatus,
): Promise<OrderType[]> {
  const col = await ordersCol();
  const orders = await col.find({ status }).sort({ createdAt: -1 }).toArray();
  return (await attachOrderDetails(orders)).map(mapOrder);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
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
    PENDING: byStatus.get("PENDING") ?? 0,
    PROCESSING: byStatus.get("PROCESSING") ?? 0,
    READY: byStatus.get("READY") ?? 0,
    DELIVERED: byStatus.get("DELIVERED") ?? 0,
    CANCELLED: byStatus.get("CANCELLED") ?? 0,
  };
}

export async function createDineInOrder(input: {
  tableId: string;
  items: { menuItemId: string; quantity: number }[];
  notes?: string | null;
}): Promise<OrderType & { tableNumber?: number }> {
  const tableId = toObjectId(input.tableId);
  if (!tableId) throw new Error("TABLE_NOT_FOUND");

  const normalizedItems = input.items
    .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0)
    .map((item) => ({ ...item, objectId: toObjectId(item.menuItemId) }));

  if (
    normalizedItems.length === 0 ||
    normalizedItems.some((item) => !item.objectId)
  ) {
    throw new Error("INVALID_ITEMS");
  }

  const client = await getMongoClient();
  const session = client.startSession();

  try {
    return await session.withTransaction(
      async () => {
        const db = await getDb();
        const tables = db.collection<TableDoc>("tables");
        const menuItems = db.collection<MenuItemDoc>("menu_items");
        const orders = db.collection<OrderDoc>("orders");
        const orderItems = db.collection<OrderItemDoc>("order_items");

        const table = await tables.findOne(
          { _id: tableId, isActive: true },
          { session },
        );
        if (!table) throw new Error("TABLE_NOT_FOUND");

        const itemIds = normalizedItems.map((item) => item.objectId!);
        const availableMenuItems = await menuItems
          .find(
            {
              _id: { $in: itemIds },
              isActive: true,
              inStock: true,
            },
            { session },
          )
          .toArray();

        if (availableMenuItems.length !== normalizedItems.length) {
          throw new Error("ITEM_NOT_AVAILABLE");
        }

        const menuItemMap = new Map(
          availableMenuItems.map((item) => [item._id.toHexString(), item]),
        );

        const orderItemsDraft = normalizedItems.map((item) => {
          const menuItem = menuItemMap.get(item.menuItemId);
          if (!menuItem || !menuItem.inStock) {
            throw new Error("ITEM_NOT_AVAILABLE");
          }
          return { menuItem, quantity: item.quantity };
        });

        const subtotal = orderItemsDraft.reduce(
          (total, item) => total + item.menuItem.price * item.quantity,
          0,
        );
        const now = new Date();
        const doc: OrderDoc = {
          _id: new ObjectId(),
          userId: null,
          tableId,
          status: "PENDING",
          subtotal,
          discount: 0,
          total: subtotal,
          currency: "IRR",
          notes: input.notes ?? null,
          deliveryType: "DINE_IN",
          createdAt: now,
          updatedAt: now,
        };

        await orders.insertOne(doc, { session });

        const itemDocuments: OrderItemDoc[] = orderItemsDraft.map(
          ({ menuItem, quantity }) => ({
            _id: new ObjectId(),
            orderId: doc._id,
            menuItemId: menuItem._id,
            name: menuItem.name,
            price: menuItem.price,
            quantity,
            currency: menuItem.currency,
            createdAt: now,
          }),
        );

        await orderItems.insertMany(itemDocuments, { session });

        return mapOrder({
          ...doc,
          items: itemDocuments,
          tableNumber: table.number,
        });
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Transaction") ||
        error.message.includes("transaction"))
    ) {
      // Fallback to the original non-transactional path only when the deployment
      // environment does not support multi-document transactions.
      const fallbackTable = await (
        await tablesCol()
      ).findOne({
        _id: tableId,
        isActive: true,
      });
      if (!fallbackTable) throw new Error("TABLE_NOT_FOUND");

      const fallbackItems = await (
        await menuItemsCol()
      )
        .find({
          _id: { $in: normalizedItems.map((item) => item.objectId!) },
          isActive: true,
          inStock: true,
        })
        .toArray();

      if (fallbackItems.length !== normalizedItems.length) {
        throw new Error("ITEM_NOT_AVAILABLE");
      }

      const itemMap = new Map(
        fallbackItems.map((item) => [item._id.toHexString(), item]),
      );
      const fallbackOrderItems = normalizedItems.map((item) => {
        const menuItem = itemMap.get(item.menuItemId);
        if (!menuItem || !menuItem.inStock) {
          throw new Error("ITEM_NOT_AVAILABLE");
        }
        return { menuItem, quantity: item.quantity };
      });

      const subtotal = fallbackOrderItems.reduce(
        (total, item) => total + item.menuItem.price * item.quantity,
        0,
      );
      const now = new Date();
      const doc: OrderDoc = {
        _id: new ObjectId(),
        userId: null,
        tableId,
        status: "PENDING",
        subtotal,
        discount: 0,
        total: subtotal,
        currency: "IRR",
        notes: input.notes ?? null,
        deliveryType: "DINE_IN",
        createdAt: now,
        updatedAt: now,
      };

      const orders = await ordersCol();
      await orders.insertOne(doc);

      const itemDocuments: OrderItemDoc[] = fallbackOrderItems.map(
        ({ menuItem, quantity }) => ({
          _id: new ObjectId(),
          orderId: doc._id,
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          currency: menuItem.currency,
          createdAt: now,
        }),
      );

      await (await orderItemsCol()).insertMany(itemDocuments);

      return mapOrder({
        ...doc,
        items: itemDocuments,
        tableNumber: fallbackTable.number,
      });
    }

    throw error;
  } finally {
    session.endSession();
  }
}
