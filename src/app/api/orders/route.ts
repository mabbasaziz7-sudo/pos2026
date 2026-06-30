import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, customers } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customers.name,
        orderDate: orders.orderDate,
        deliveryDate: orders.deliveryDate,
        status: orders.status,
        subtotal: orders.subtotal,
        tax: orders.tax,
        discount: orders.discount,
        total: orders.total,
        cost: orders.cost,
        profit: orders.profit,
        paid: orders.paid,
        remaining: orders.remaining,
        description: orders.description,
        notes: orders.notes,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .$dynamic();

    if (status) {
      query = query.where(eq(orders.status, status as any)) as any;
    }
    const result = await query.orderBy(desc(orders.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { items, ...orderData } = data;

    // Generate order number
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const orderNumber = `ORD-${String(countResult[0].count + 1).padStart(5, "0")}`;

    const [order] = await db
      .insert(orders)
      .values({ ...orderData, orderNumber })
      .returning();

    if (items && items.length > 0) {
      await db.insert(orderItems).values(
        items.map((item: any) => ({
          ...item,
          orderId: order.id,
        }))
      );
    }

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
