import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { desc, like, or, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const lowStock = searchParams.get("lowStock");

    let query = db.select().from(products);
    if (search) {
      query = query.where(
        or(
          like(products.name, `%${search}%`),
          like(products.code, `%${search}%`)
        )
      ) as any;
    }
    if (lowStock === "1") {
      query = query.where(sql`${products.quantity} <= ${products.minQuantity}`) as any;
    }
    const result = await query.orderBy(desc(products.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [product] = await db.insert(products).values(data).returning();
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
