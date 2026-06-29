import { NextResponse } from 'next/server';
import { query, ensureSchema } from '@/db';
import { getSessionFromCookies } from '@/lib/auth-server';

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ user: null });

    await ensureSchema();
    const result = await query('SELECT * FROM "users" WHERE id = $1 LIMIT 1', [session.id]);
    const user = result.rows[0];
    if (!user || !user.isActive) return NextResponse.json({ user: null });

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'خطأ' }, { status: 500 });
  }
}
