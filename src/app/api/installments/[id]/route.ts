import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { installments, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const installmentId = parseInt(id);

    // If marking as paid, record a payment
    if (data.paid === true) {
      const [existing] = await db
        .select()
        .from(installments)
        .where(eq(installments.id, installmentId));
      if (existing && !existing.paid) {
        await db.insert(payments).values({
          invoiceId: existing.invoiceId,
          customerId: existing.customerId,
          amount: existing.amount,
          paymentDate: new Date().toISOString().split("T")[0],
          paymentMethod: "cash",
          reference: `دفعة قسط رقم ${existing.installmentNumber}`,
        });
      }
    }

    const [updated] = await db
      .update(installments)
      .set({ ...data, paidDate: data.paid ? new Date().toISOString().split("T")[0] : null })
      .where(eq(installments.id, installmentId))
      .returning();
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(installments).where(eq(installments.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
