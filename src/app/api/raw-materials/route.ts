import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rawMaterials } from "@/db/schema";
import { desc, like, or, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const lowStock = searchParams.get("lowStock");

    let query = db.select().from(rawMaterials);
    if (search) {
      query = query.where(
        or(
          like(rawMaterials.name, `%${search}%`),
          like(rawMaterials.code, `%${search}%`)
        )
      ) as any;
    }
    if (lowStock === "1") {
      query = query.where(sql`${rawMaterials.quantity} <= ${rawMaterials.minQuantity}`) as any;
    }
    const result = await query.orderBy(desc(rawMaterials.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [material] = await db.insert(rawMaterials).values(data).returning();
    return NextResponse.json(material);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
