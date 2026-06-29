import { NextResponse } from 'next/server';
import { query, ensureSchema } from '@/db';
import {
  allowedColumns,
  badRequest,
  buildOrderBy,
  buildWhereFromSearchParams,
  PUBLIC_READ_TABLES,
  requireSession,
  serverError,
  stripSensitive,
  unauthorized,
  validateTable,
  type Req,
} from '@/lib/db-api-helpers';

export async function GET(req: Req, { params }: { params: Promise<{ table: string }> }) {
  try {
    const { table } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!PUBLIC_READ_TABLES.has(table) && !(await requireSession())) return unauthorized();
    await ensureSchema();

    const { searchParams } = new URL(req.url);
    const { clause, values } = buildWhereFromSearchParams(table, searchParams);
    const orderClause = buildOrderBy(table, searchParams);
    const result = await query(`SELECT * FROM "${table}" ${clause} ${orderClause}`, values);
    return NextResponse.json(result.rows.map((r: Record<string, unknown>) => stripSensitive(table, r)));
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Req, { params }: { params: Promise<{ table: string }> }) {
  try {
    const { table } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!(await requireSession())) return unauthorized();
    await ensureSchema();

    const body = await req.json();
    const rows: Record<string, unknown>[] = Array.isArray(body) ? body : [body];
    if (rows.length === 0) return badRequest('لا توجد بيانات');

    const cols = allowedColumns(table).filter((c) => c !== 'id');
    const ids: number[] = [];
    for (const row of rows) {
      const presentCols = cols.filter((c) => row[c] !== undefined);
      if (presentCols.length === 0) continue;
      const placeholders = presentCols.map((_, i) => `$${i + 1}`).join(', ');
      const colList = presentCols.map((c) => `"${c}"`).join(', ');
      const values = presentCols.map((c) => row[c]);
      const result = await query(
        `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) RETURNING id`,
        values
      );
      ids.push(result.rows[0]?.id);
    }
    return NextResponse.json(Array.isArray(body) ? { ids } : { id: ids[0] });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Req, { params }: { params: Promise<{ table: string }> }) {
  try {
    const { table } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!(await requireSession())) return unauthorized();
    await ensureSchema();

    const { searchParams } = new URL(req.url);
    const changes = await req.json();
    const cols = allowedColumns(table);
    const setCols = Object.keys(changes).filter((c) => cols.includes(c));
    if (setCols.length === 0) return badRequest('لا توجد حقول صحيحة للتحديث');

    const setClause = setCols.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
    const setValues = setCols.map((c) => changes[c]);
    const { clause, values: whereValues } = buildWhereFromSearchParams(table, searchParams, setCols.length + 1);
    if (!clause) return badRequest('يجب تحديد شرط للتحديث الجماعي');

    const result = await query(`UPDATE "${table}" SET ${setClause} ${clause}`, [...setValues, ...whereValues]);
    return NextResponse.json({ count: result.rowCount });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Req, { params }: { params: Promise<{ table: string }> }) {
  try {
    const { table } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!(await requireSession())) return unauthorized();
    await ensureSchema();

    await query(`DELETE FROM "${table}"`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
