import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, invoices, payments } from "@/db/schema";
import { eq, sql, desc, like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    let query = db.select().from(customers);
    if (search) {
      query = query.where(
        or(
          like(customers.name, `%${search}%`),
          like(customers.phone, `%${search}%`),
          like(customers.email, `%${search}%`)
        )
      ) as any;
    }
    const result = await query.orderBy(desc(customers.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [customer] = await db.insert(customers).values(data).returning();
    return NextResponse.json(customer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
