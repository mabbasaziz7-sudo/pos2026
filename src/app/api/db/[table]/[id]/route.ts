import { NextResponse } from 'next/server';
import { query, ensureSchema } from '@/db';
import {
  allowedColumns,
  badRequest,
  notFound,
  PUBLIC_READ_TABLES,
  requireSession,
  serializeForColumn,
  serverError,
  stripSensitive,
  unauthorized,
  validateTable,
  type Req,
} from '@/lib/db-api-helpers';

export async function GET(_req: Req, { params }: { params: Promise<{ table: string; id: string }> }) {
  try {
    const { table, id } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!PUBLIC_READ_TABLES.has(table) && !(await requireSession())) return unauthorized();
    await ensureSchema();

    const result = await query(`SELECT * FROM "${table}" WHERE id = $1 LIMIT 1`, [id]);
    if (!result.rows[0]) return notFound();
    return NextResponse.json(stripSensitive(table, result.rows[0]));
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Req, { params }: { params: Promise<{ table: string; id: string }> }) {
  try {
    const { table, id } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!(await requireSession())) return unauthorized();
    await ensureSchema();

    const changes = await req.json();
    const cols = allowedColumns(table);
    const setCols = Object.keys(changes).filter((c) => cols.includes(c) && c !== 'id');
    if (setCols.length === 0) return badRequest('لا توجد حقول صحيحة للتحديث');

    const setClause = setCols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
    const values = setCols.map((c) => serializeForColumn(table, c, changes[c]));
    const result = await query(`UPDATE "${table}" SET ${setClause} WHERE id = $1 RETURNING id`, [id, ...values]);
    if (!result.rows[0]) return notFound();
    return NextResponse.json({ id: result.rows[0].id });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Req, { params }: { params: Promise<{ table: string; id: string }> }) {
  try {
    const { table, id } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!(await requireSession())) return unauthorized();
    await ensureSchema();

    const body = await req.json();
    const cols = allowedColumns(table).filter((c) => c !== 'id');
    const presentCols = cols.filter((c) => body[c] !== undefined);
    const colList = presentCols.map((c) => `"${c}"`).join(', ');
    const placeholders = presentCols.map((_, i) => `$${i + 2}`).join(', ');
    const updateClause = presentCols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
    const values = presentCols.map((c) => serializeForColumn(table, c, body[c]));

    await query(
      `INSERT INTO "${table}" (id${colList ? ', ' + colList : ''}) VALUES ($1${placeholders ? ', ' + placeholders : ''})
       ON CONFLICT (id) DO UPDATE SET ${updateClause || '"id" = EXCLUDED."id"'}`,
      [id, ...values]
    );
    return NextResponse.json({ id: Number(id) });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Req, { params }: { params: Promise<{ table: string; id: string }> }) {
  try {
    const { table, id } = await params;
    if (!validateTable(table)) return badRequest('جدول غير معروف');
    if (!(await requireSession())) return unauthorized();
    await ensureSchema();

    await query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
