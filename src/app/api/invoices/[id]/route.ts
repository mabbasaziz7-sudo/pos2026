import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    let customer = null;
    let supplier = null;
    if (invoice.customerId) {
      [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId));
    }
    if (invoice.supplierId) {
      [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, invoice.supplierId));
    }

    return NextResponse.json({ invoice, items, customer, supplier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const [updated] = await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(invoices).where(eq(invoices.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
