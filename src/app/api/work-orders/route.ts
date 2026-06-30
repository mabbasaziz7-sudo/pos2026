import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, productionSteps, users, orders, customers } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = db
      .select({
        id: workOrders.id,
        workOrderNumber: workOrders.workOrderNumber,
        orderId: workOrders.orderId,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        title: workOrders.title,
        description: workOrders.description,
        assignedTo: workOrders.assignedTo,
        assignedName: users.name,
        startDate: workOrders.startDate,
        dueDate: workOrders.dueDate,
        completedDate: workOrders.completedDate,
        status: workOrders.status,
        priority: workOrders.priority,
        estimatedCost: workOrders.estimatedCost,
        actualCost: workOrders.actualCost,
        notes: workOrders.notes,
        createdAt: workOrders.createdAt,
      })
      .from(workOrders)
      .leftJoin(users, eq(workOrders.assignedTo, users.id))
      .leftJoin(orders, eq(workOrders.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .$dynamic();

    if (status) {
      query = query.where(eq(workOrders.status, status as any)) as any;
    }
    const result = await query.orderBy(desc(workOrders.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { steps, ...woData } = data;

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(workOrders);
    const workOrderNumber = `WO-${String(countResult[0].count + 1).padStart(5, "0")}`;

    const [wo] = await db
      .insert(workOrders)
      .values({ ...woData, workOrderNumber })
      .returning();

    if (steps && steps.length > 0) {
      await db.insert(productionSteps).values(
        steps.map((step: any, idx: number) => ({
          ...step,
          workOrderId: wo.id,
          order_index: idx,
        }))
      );
    }

    return NextResponse.json(wo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
