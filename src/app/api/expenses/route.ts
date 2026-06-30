import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    let query = db.select().from(expenses).$dynamic();
    if (startDate && endDate) {
      query = query.where(
        and(gte(expenses.expenseDate, startDate), lte(expenses.expenseDate, endDate))
      ) as any;
    }
    if (category) {
      query = query.where(eq(expenses.category, category)) as any;
    }
    const result = await query.orderBy(desc(expenses.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [expense] = await db.insert(expenses).values(data).returning();
    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
