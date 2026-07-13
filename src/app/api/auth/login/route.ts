import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, ensureSchema } from '@/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, { status: 400 });
    }

    const result = await query('SELECT * FROM "users" WHERE username = $1 LIMIT 1', [username]);
    const user = result.rows[0];
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const token = createSessionToken({ id: user.id, role: user.role });
    await setSessionCookie(token);

    const now = new Date();
    await query('UPDATE "users" SET "lastLoginAt" = $1 WHERE id = $2', [now, user.id]);
    await query(
      'INSERT INTO "auditLogs" ("userId", "userName", "action", "tableName", "recordId", "details", "date") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.id, user.name, 'login', 'users', user.id, null, now]
    );

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'فشل تسجيل الدخول' }, { status: 500 });
  }
}
