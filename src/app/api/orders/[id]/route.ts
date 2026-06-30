import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, customers, workOrders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId));
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const workOrdersList = await db.select().from(workOrders).where(eq(workOrders.orderId, orderId));

    return NextResponse.json({ order, customer, items, workOrders: workOrdersList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const [updated] = await db
      .update(orders)
      .set(data)
      .where(eq(orders.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(orders).where(eq(orders.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
