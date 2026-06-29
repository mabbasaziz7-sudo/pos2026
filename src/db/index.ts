import { Pool, type QueryResultRow } from 'pg';
import bcrypt from 'bcryptjs';
import { SCHEMA, type ColumnDef, type ColType } from './schema';

// لا نتصل أو نتحقق من DATABASE_URL عند تحميل هذا الملف — فقط عند أول استخدام فعلي
// داخل معالج طلب (API route)، حتى لا يفشل بناء Next.js إن لم يكن المتغير متاحًا وقت البناء.
const globalForDb = globalThis as typeof globalThis & {
  __posPgPool?: Pool;
  __posSchemaReady?: Promise<void>;
};

function getPool(): Pool {
  if (!globalForDb.__posPgPool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) {
      throw new Error('DATABASE_URL غير مُعرَّف. أضف قاعدة بيانات Postgres من لوحة تحكم Vercel (Storage → Create Database).');
    }
    globalForDb.__posPgPool = new Pool({
      connectionString: url,
      ssl: url.includes('sslmode=disable') ? undefined : { rejectUnauthorized: false },
    });
  }
  return globalForDb.__posPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const pool = getPool();
  return pool.query<T>(sql, params);
}

function colSqlType(type: ColType): string {
  switch (type) {
    case 'serial': return 'SERIAL PRIMARY KEY';
    case 'fixedId': return 'INTEGER PRIMARY KEY';
    case 'text': return 'TEXT';
    case 'numeric': return 'NUMERIC(14,3)';
    case 'integer': return 'INTEGER';
    case 'boolean': return 'BOOLEAN';
    case 'timestamp': return 'TIMESTAMPTZ';
    case 'jsonb': return 'JSONB';
  }
}

function columnDdl(col: ColumnDef): string {
  let sql = `"${col.name}" ${colSqlType(col.type)}`;
  if (col.type !== 'serial' && col.type !== 'fixedId' && !col.nullable) sql += ' NOT NULL';
  if (col.default !== undefined) sql += ` DEFAULT ${col.default}`;
  if (col.unique) sql += ' UNIQUE';
  return sql;
}

async function ensureSchemaOnce(): Promise<void> {
  for (const [table, def] of Object.entries(SCHEMA)) {
    const cols = def.columns.map(columnDdl).join(', ');
    await query(`CREATE TABLE IF NOT EXISTS "${table}" (${cols})`);
    // إضافة أي أعمدة جديدة لم تكن موجودة في نسخ سابقة من المخطط دون حذف البيانات
    for (const col of def.columns) {
      if (col.type === 'serial' || col.type === 'fixedId') continue;
      await query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col.name}" ${colSqlType(col.type)}` +
          (col.default !== undefined ? ` DEFAULT ${col.default}` : '')
      );
    }
  }

  const userCount = await query('SELECT COUNT(*)::int AS c FROM "users"');
  if (userCount.rows[0].c === 0) {
    const hashed = await bcrypt.hash('admin123', 10);
    await query(
      'INSERT INTO "users" (name, username, password, role, permissions, "isActive", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
      ['مدير النظام', 'admin', hashed, 'admin', JSON.stringify(['all']), true]
    );
  }

  const catCount = await query('SELECT COUNT(*)::int AS c FROM "categories"');
  if (catCount.rows[0].c === 0) {
    const defaults = ['عام', 'مأكولات', 'مشروبات', 'إلكترونيات', 'ملابس'];
    for (const name of defaults) {
      await query('INSERT INTO "categories" (name, "createdAt") VALUES ($1, NOW())', [name]);
    }
  }

  const settingsCount = await query('SELECT COUNT(*)::int AS c FROM "settings"');
  if (settingsCount.rows[0].c === 0) {
    await query('INSERT INTO "settings" (id) VALUES (1)');
  }
}

export async function ensureSchema(): Promise<void> {
  if (!globalForDb.__posSchemaReady) {
    globalForDb.__posSchemaReady = ensureSchemaOnce().catch((err) => {
      globalForDb.__posSchemaReady = undefined; // اسمح بإعادة المحاولة في الطلب التالي إن فشلت
      throw err;
    });
  }
  return globalForDb.__posSchemaReady;
}
