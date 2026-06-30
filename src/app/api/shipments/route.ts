import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shipments, customers, orders } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = db
      .select({
        id: shipments.id,
        shipmentNumber: shipments.shipmentNumber,
        orderId: shipments.orderId,
        orderNumber: orders.orderNumber,
        customerId: shipments.customerId,
        customerName: customers.name,
        carrier: shipments.carrier,
        trackingNumber: shipments.trackingNumber,
        shippingDate: shipments.shippingDate,
        estimatedArrival: shipments.estimatedArrival,
        shippingCost: shipments.shippingCost,
        status: shipments.status,
        address: shipments.address,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
      })
      .from(shipments)
      .leftJoin(customers, eq(shipments.customerId, customers.id))
      .leftJoin(orders, eq(shipments.orderId, orders.id))
      .$dynamic();

    if (status) {
      query = query.where(eq(shipments.status, status as any)) as any;
    }
    const result = await query.orderBy(desc(shipments.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(shipments);
    const shipmentNumber = `SHP-${String(countResult[0].count + 1).padStart(5, "0")}`;

    const [shipment] = await db
      .insert(shipments)
      .values({ ...data, shipmentNumber })
      .returning();
    return NextResponse.json(shipment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
