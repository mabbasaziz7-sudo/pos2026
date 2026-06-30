import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, invoices, payments } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!customer) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

    // Get invoices
    const customerInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(sql`${invoices.invoiceDate} DESC`);

    // Get payments
    const customerPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(sql`${payments.paymentDate} DESC`);

    // Calculate balance
    const totalInvoiced = customerInvoices
      .filter((i) => i.type === "sale" || i.type === "return_purchase")
      .reduce((sum, i) => sum + parseFloat(i.total.toString()), 0);
    const totalPaid = customerInvoices
      .filter((i) => i.type === "sale")
      .reduce((sum, i) => sum + parseFloat(i.paid.toString()), 0);

    return NextResponse.json({
      customer,
      invoices: customerInvoices,
      payments: customerPayments,
      balance: totalInvoiced - totalPaid,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const [updated] = await db
      .update(customers)
      .set(data)
      .where(eq(customers.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(customers).where(eq(customers.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
