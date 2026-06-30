import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { desc, like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    let query = db.select().from(suppliers);
    if (search) {
      query = query.where(
        or(
          like(suppliers.name, `%${search}%`),
          like(suppliers.phone, `%${search}%`)
        )
      ) as any;
    }
    const result = await query.orderBy(desc(suppliers.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return NextResponse.json(supplier);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
