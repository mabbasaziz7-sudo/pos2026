import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salaries, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    let query = db
      .select({
        id: salaries.id,
        userId: salaries.userId,
        userName: users.name,
        position: users.position,
        month: salaries.month,
        baseSalary: salaries.baseSalary,
        bonuses: salaries.bonuses,
        deductions: salaries.deductions,
        total: salaries.total,
        paid: salaries.paid,
        paidAt: salaries.paidAt,
        notes: salaries.notes,
        createdAt: salaries.createdAt,
      })
      .from(salaries)
      .leftJoin(users, eq(salaries.userId, users.id))
      .$dynamic();

    if (month) {
      query = query.where(eq(salaries.month, month)) as any;
    }
    const result = await query.orderBy(desc(salaries.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const total =
      parseFloat(data.baseSalary || 0) +
      parseFloat(data.bonuses || 0) -
      parseFloat(data.deductions || 0);
    const [salary] = await db
      .insert(salaries)
      .values({ ...data, total: total.toString() })
      .returning();
    return NextResponse.json(salary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
