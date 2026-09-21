import type { Filter } from "mongodb";
import {
  ordersCol,
  orderItemsCol,
  purchasesCol,
  expensesCol,
  type OrderDoc,
} from "@/server/db";

export type ReportPeriod = "weekly" | "monthly" | "yearly";

function getPeriodStart(period: ReportPeriod, now: Date): Date {
  const start = new Date(now);
  if (period === "weekly") start.setDate(start.getDate() - 7);
  if (period === "monthly") start.setMonth(start.getMonth() - 1);
  if (period === "yearly") start.setFullYear(start.getFullYear() - 1);
  return start;
}

export async function getReport(period: ReportPeriod) {
  const end = new Date();
  const start = getPeriodStart(period, end);
  const orders = await ordersCol();
  const orderItems = await orderItemsCol();
  const purchases = await purchasesCol();
  const expenses = await expensesCol();
  const validOrderFilter: Filter<OrderDoc> = {
    createdAt: { $gte: start, $lt: end },
    status: { $ne: "CANCELLED" },
  };

  const [sales, orderCount, topProducts, purchaseTotal, expenseTotal] =
    await Promise.all([
      orders
        .aggregate<{ _id: null; total: number; subtotal: number }>([
          { $match: validOrderFilter },
          {
            $group: {
              _id: null,
              total: { $sum: "$total" },
              subtotal: { $sum: "$subtotal" },
            },
          },
        ])
        .toArray(),
      orders.countDocuments(validOrderFilter),
      orderItems
        .aggregate<{
          _id: string;
          name: string;
          quantity: number;
          revenue: number;
        }>([
          {
            $lookup: {
              from: "orders",
              localField: "orderId",
              foreignField: "_id",
              as: "order",
            },
          },
          { $unwind: "$order" },
          { $match: validOrderFilter },
          {
            $group: {
              _id: "$menuItemId",
              name: { $first: "$name" },
              quantity: { $sum: "$quantity" },
              revenue: { $sum: { $multiply: ["$price", "$quantity"] } },
            },
          },
          { $sort: { quantity: -1, revenue: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
      purchases
        .aggregate<{ _id: null; total: number }>([
          { $match: { purchasedAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      expenses
        .aggregate<{ _id: null; total: number }>([
          { $match: { spentAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
    ]);

  const revenue = sales[0]?.total ?? 0;
  const purchaseTotalAmount = purchaseTotal[0]?.total ?? 0;
  const expenseTotalAmount = expenseTotal[0]?.total ?? 0;
  const costs = purchaseTotalAmount + expenseTotalAmount;
  const estimatedProfit = revenue - costs;
  const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;
  const estimatedProfitMargin =
    revenue > 0 ? (estimatedProfit / revenue) * 100 : 0;

  return {
    period,
    from: start.toISOString(),
    to: end.toISOString(),
    orderCount,
    revenue,
    purchases: purchaseTotalAmount,
    expenses: expenseTotalAmount,
    costs,
    averageOrderValue,
    estimatedProfit,
    estimatedProfitMargin,
    topProducts: topProducts.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      quantity: product.quantity,
      revenue: product.revenue,
    })),
  };
}
