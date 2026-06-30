import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const globalForDb = globalThis as typeof globalThis & {
  __sqliteDb?: Database.Database;
};

export const sqlite =
  globalForDb.__sqliteDb ?? new Database(process.env.SQLITE_DB_PATH ?? "sqlite.db");

if (process.env.NODE_ENV !== "production") {
  globalForDb.__sqliteDb = sqlite;
}

export const db = drizzle(sqlite);
