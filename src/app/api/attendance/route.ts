import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, users } from "@/db/schema";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        userName: users.name,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        workingHours: attendance.workingHours,
        notes: attendance.notes,
        createdAt: attendance.createdAt,
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.userId, users.id))
      .$dynamic();

    if (date) {
      query = query.where(eq(attendance.date, date)) as any;
    }
    if (userId) {
      query = query.where(eq(attendance.userId, parseInt(userId))) as any;
    }
    if (startDate && endDate) {
      query = query.where(
        and(gte(attendance.date, startDate), lte(attendance.date, endDate))
      ) as any;
    }

    const result = await query.orderBy(desc(attendance.date));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const [record] = await db.insert(attendance).values(data).returning();
    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
