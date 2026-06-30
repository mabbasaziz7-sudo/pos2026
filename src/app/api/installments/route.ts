import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { installments, customers, invoices } from "@/db/schema";
import { desc, eq, sql, and, lte, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const paid = searchParams.get("paid");

    let query = db
      .select({
        id: installments.id,
        invoiceId: installments.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        customerId: installments.customerId,
        customerName: customers.name,
        installmentNumber: installments.installmentNumber,
        amount: installments.amount,
        dueDate: installments.dueDate,
        paidDate: installments.paidDate,
        paid: installments.paid,
        notes: installments.notes,
        createdAt: installments.createdAt,
      })
      .from(installments)
      .leftJoin(customers, eq(installments.customerId, customers.id))
      .leftJoin(invoices, eq(installments.invoiceId, invoices.id))
      .$dynamic();

    if (customerId) {
      query = query.where(eq(installments.customerId, parseInt(customerId))) as any;
    }
    if (paid === "true") {
      query = query.where(eq(installments.paid, true)) as any;
    } else if (paid === "false") {
      query = query.where(eq(installments.paid, false)) as any;
    }
    const result = await query.orderBy(installments.dueDate);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [installment] = await db.insert(installments).values(data).returning();
    return NextResponse.json(installment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
