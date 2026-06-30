import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotations, quotationItems, customers } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const result = await db
      .select({
        id: quotations.id,
        quoteNumber: quotations.quoteNumber,
        customerId: quotations.customerId,
        customerName: customers.name,
        quoteDate: quotations.quoteDate,
        validUntil: quotations.validUntil,
        subtotal: quotations.subtotal,
        tax: quotations.tax,
        discount: quotations.discount,
        total: quotations.total,
        status: quotations.status,
        notes: quotations.notes,
        createdAt: quotations.createdAt,
      })
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .orderBy(desc(quotations.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { items, ...quoteData } = data;

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(quotations);
    const quoteNumber = `QT-${String(countResult[0].count + 1).padStart(5, "0")}`;

    const [quote] = await db
      .insert(quotations)
      .values({ ...quoteData, quoteNumber })
      .returning();

    if (items && items.length > 0) {
      await db.insert(quotationItems).values(
        items.map((item: any) => ({ ...item, quotationId: quote.id }))
      );
    }

    return NextResponse.json(quote);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
