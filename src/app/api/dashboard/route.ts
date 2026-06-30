import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import {
  orders,
  invoices,
  customers,
  products,
  rawMaterials,
  expenses,
  users,
  installments,
} from "@/db/schema";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.substring(0, 7) + "-01";

    // Today's sales
    const todaySalesResult = await db.all(sql`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM ${invoices}
      WHERE type = 'sale' AND invoice_date = ${today}
    `);

    // This month sales
    const monthSalesResult = await db.all(sql`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM ${invoices}
      WHERE type = 'sale' AND invoice_date >= ${monthStart}
    `);

    // This month expenses
    const monthExpensesResult = await db.all(sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM ${expenses}
      WHERE expense_date >= ${monthStart}
    `);

    // This month purchases
    const monthPurchasesResult = await db.all(sql`
      SELECT COALESCE(SUM(total), 0) as total
      FROM ${invoices}
      WHERE type = 'purchase' AND invoice_date >= ${monthStart}
    `);

    // Order counts
    const ordersCountResult = await db.all(sql`
      SELECT status, COUNT(*) as count
      FROM ${orders}
      GROUP BY status
    `);

    // Low stock
    const lowStockResult = await db.all(sql`
      SELECT COUNT(*) as products_count FROM ${products} WHERE quantity <= min_quantity
    `);
    const lowStockRawResult = await db.all(sql`
      SELECT COUNT(*) as raw_count FROM ${rawMaterials} WHERE quantity <= min_quantity
    `);

    // Total counts
    const countsResult = await db.all(sql`
      SELECT
        (SELECT COUNT(*) FROM ${customers}) as customers,
        (SELECT COUNT(*) FROM ${users} WHERE status = 1) as employees,
        (SELECT COUNT(*) FROM ${orders}) as orders,
        (SELECT COUNT(*) FROM ${products}) as products,
        (SELECT COUNT(*) FROM ${rawMaterials}) as raw_materials
    `);

    // Pending installments
    const installmentsResult = await db.all(sql`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM ${installments}
      WHERE paid = 0
    `);

    // Recent orders
    const recentOrders = await db.all(sql`
      SELECT o.*, c.name as customer_name
      FROM ${orders} o
      LEFT JOIN ${customers} c ON c.id = o.customer_id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // Monthly sales chart (last 6 months)
    const monthlyChartResult = await db.all(sql`
      SELECT
        strftime('%Y-%m', invoice_date) as month,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN total ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN type = 'purchase' THEN total ELSE 0 END), 0) as purchases
      FROM ${invoices}
      WHERE invoice_date >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', invoice_date)
      ORDER BY month
    `);

    return NextResponse.json({
      todaySales: todaySalesResult[0],
      monthSales: monthSalesResult[0],
      monthExpenses: monthExpensesResult[0],
      monthPurchases: monthPurchasesResult[0],
      ordersCount: ordersCountResult,
      lowStock: {
        products: lowStockResult[0],
        raw_materials: lowStockRawResult[0],
      },
      counts: countsResult[0],
      installments: installmentsResult[0],
      recentOrders: recentOrders,
      monthlyChart: monthlyChartResult,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
