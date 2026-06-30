import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, productionSteps, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const woId = parseInt(id);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, woId));
    if (!wo) return NextResponse.json({ error: "أمر الشغل غير موجود" }, { status: 404 });

    const steps = await db
      .select({
        id: productionSteps.id,
        stepName: productionSteps.stepName,
        assignedTo: productionSteps.assignedTo,
        assignedName: users.name,
        status: productionSteps.status,
        startTime: productionSteps.startTime,
        endTime: productionSteps.endTime,
        notes: productionSteps.notes,
        order_index: productionSteps.order_index,
      })
      .from(productionSteps)
      .leftJoin(users, eq(productionSteps.assignedTo, users.id))
      .where(eq(productionSteps.workOrderId, woId))
      .orderBy(productionSteps.order_index);

    return NextResponse.json({ workOrder: wo, steps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const [updated] = await db
      .update(workOrders)
      .set(data)
      .where(eq(workOrders.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(workOrders).where(eq(workOrders.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
