import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, suppliers } from "@/db/schema";
import { desc, eq, sql, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    let query = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        type: invoices.type,
        customerId: invoices.customerId,
        customerName: customers.name,
        supplierId: invoices.supplierId,
        supplierName: suppliers.name,
        orderId: invoices.orderId,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        discount: invoices.discount,
        total: invoices.total,
        paid: invoices.paid,
        remaining: invoices.remaining,
        status: invoices.status,
        paymentMethod: invoices.paymentMethod,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(suppliers, eq(invoices.supplierId, suppliers.id))
      .$dynamic();

    if (type) {
      query = query.where(eq(invoices.type, type as any)) as any;
    }
    const result = await query.orderBy(desc(invoices.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { items, ...invoiceData } = data;

    const prefix = invoiceData.type === "sale" ? "INV" : invoiceData.type === "purchase" ? "PUR" : "RET";
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const invoiceNumber = `${prefix}-${String(countResult[0].count + 1).padStart(5, "0")}`;

    const [invoice] = await db
      .insert(invoices)
      .values({ ...invoiceData, invoiceNumber })
      .returning();

    if (items && items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map((item: any) => ({ ...item, invoiceId: invoice.id }))
      );
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
