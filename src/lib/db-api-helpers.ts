import { NextRequest, NextResponse } from 'next/server';
import { SCHEMA, SENSITIVE_COLUMNS, TABLE_NAMES } from '@/db/schema';
import { getSessionFromCookies } from '@/lib/auth-server';

export function validateTable(table: string): string | null {
  return TABLE_NAMES.includes(table) ? table : null;
}

// لا تحتوي بيانات حساسة (اسم المتجر، الشعار...) ويحتاجها أيضًا من لم يسجّل الدخول بعد (شاشة الدخول)
export const PUBLIC_READ_TABLES = new Set(['settings']);

export function allowedColumns(table: string): string[] {
  return SCHEMA[table].columns.map((c) => c.name);
}

// أعمدة jsonb يجب تحويلها لنص JSON بأنفسنا قبل تمريرها لمكتبة pg — وإلا فإنها
// تُحوَّل تلقائيًا لصيغة Postgres ARRAY ({...}) بدل JSON، فيفشل الإدراج في العمود.
export function serializeForColumn(table: string, col: string, value: unknown): unknown {
  const def = SCHEMA[table].columns.find((c) => c.name === col);
  if (def?.type === 'jsonb' && value !== null && value !== undefined && typeof value !== 'string') {
    return JSON.stringify(value);
  }
  return value;
}

export function stripSensitive<T extends Record<string, unknown>>(table: string, row: T): T {
  const sensitive = SENSITIVE_COLUMNS[table];
  if (!sensitive) return row;
  const copy = { ...row };
  for (const col of sensitive) delete copy[col];
  return copy;
}

export async function requireSession() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound() {
  return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
}

export function serverError(err: unknown) {
  return NextResponse.json({ error: err instanceof Error ? err.message : 'خطأ غير متوقع' }, { status: 500 });
}

// يبني شرط WHERE من معاملات الاستعلام (field=value) مع التحقق من أن الحقول مسموحة
export function buildWhereFromSearchParams(
  table: string,
  searchParams: URLSearchParams,
  startIndex = 1
): { clause: string; values: unknown[] } {
  const cols = allowedColumns(table);
  const reserved = new Set(['orderBy', 'dir', 'limit']);
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = startIndex;
  for (const [key, value] of searchParams.entries()) {
    if (reserved.has(key)) continue;
    if (!cols.includes(key)) continue;
    conditions.push(`"${key}" = $${i}`);
    values.push(value);
    i++;
  }
  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

export function buildOrderBy(table: string, searchParams: URLSearchParams): string {
  const orderBy = searchParams.get('orderBy');
  const dir = (searchParams.get('dir') || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  if (!orderBy || !allowedColumns(table).includes(orderBy)) return '';
  return `ORDER BY "${orderBy}" ${dir}`;
}

export type Req = NextRequest;
