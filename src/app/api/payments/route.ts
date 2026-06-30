import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, customers, invoices, suppliers } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const result = await db
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        customerId: payments.customerId,
        customerName: customers.name,
        supplierId: payments.supplierId,
        supplierName: suppliers.name,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        reference: payments.reference,
        notes: payments.notes,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .leftJoin(suppliers, eq(payments.supplierId, suppliers.id))
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .orderBy(desc(payments.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [payment] = await db.insert(payments).values(data).returning();

    // Update invoice paid amount
    if (data.invoiceId) {
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, data.invoiceId));
      if (invoice) {
        const newPaid = parseFloat(invoice.paid.toString()) + parseFloat(data.amount);
        const newRemaining = parseFloat(invoice.total.toString()) - newPaid;
        const status = newRemaining <= 0 ? "paid" : "partial";
        await db
          .update(invoices)
          .set({ paid: newPaid, remaining: newRemaining, status })
          .where(eq(invoices.id, data.invoiceId));
      }
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
