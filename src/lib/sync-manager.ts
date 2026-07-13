/**
 * Sync Manager — handles online/offline transitions.
 * • On reconnect: replays the sync queue to the server.
 * • On startup: pre-warms the Dexie cache with critical tables.
 * Exposes a tiny event bus so the UI can show sync progress.
 */
import { getOfflineDb, CACHEABLE_TABLES } from './offline-db';

// ── event bus ──────────────────────────────────────────────────────
type SyncEvent = 'statusChange';
type SyncStatus = { online: boolean; pending: number; syncing: boolean; lastSync: number | null };

const listeners = new Set<(s: SyncStatus) => void>();
let _status: SyncStatus = { online: true, pending: 0, syncing: false, lastSync: null };

function emit(patch: Partial<SyncStatus>) {
  _status = { ..._status, ...patch };
  listeners.forEach(fn => fn({ ..._status }));
}

export function onSyncStatus(fn: (s: SyncStatus) => void) {
  listeners.add(fn);
  fn({ ..._status }); // fire immediately
  return () => listeners.delete(fn);
}

export function getSyncStatus() { return { ..._status }; }

// ── helpers ────────────────────────────────────────────────────────
async function countPending() {
  const db = getOfflineDb();
  if (!db) return 0;
  return db.syncOps.count();
}

// ── process queue ─────────────────────────────────────────────────
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const db = getOfflineDb();
  if (!db) return { synced: 0, failed: 0 };

  const ops = await db.syncOps.orderBy('createdAt').toArray();
  if (ops.length === 0) return { synced: 0, failed: 0 };

  emit({ syncing: true });
  let synced = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      const res = await fetch(op.url, {
        method: op.method,
        headers: op.body ? { 'Content-Type': 'application/json' } : {},
        body: op.body,
      });

      if (res.ok) {
        // For POST: update local cache with real server ID
        if (op.method === 'POST' && op.localTempId) {
          try {
            const saved = await res.json();
            if (saved?.id && db.table(op.table)) {
              await db.table(op.table).delete(op.localTempId).catch(() => {});
              await db.table(op.table).put(saved).catch(() => {});
            }
          } catch { /* ignore parse errors */ }
        }
        await db.syncOps.delete(op.id!);
        synced++;
      } else {
        await db.syncOps.update(op.id!, { retries: (op.retries ?? 0) + 1 });
        failed++;
      }
    } catch {
      await db.syncOps.update(op.id!, { retries: (op.retries ?? 0) + 1 });
      failed++;
    }
  }

  emit({ syncing: false, lastSync: Date.now(), pending: await countPending() });
  return { synced, failed };
}

// ── refresh cache from server ─────────────────────────────────────
const PRIORITY_TABLES = ['products','customers','settings','categories','offers','coupons','priceTiers','loyaltyTiers','employees','warehouses'];

export async function refreshCache(tables: string[] = PRIORITY_TABLES) {
  const db = getOfflineDb();
  if (!db) return;

  for (const table of tables) {
    if (!CACHEABLE_TABLES.has(table)) continue;
    try {
      const res = await fetch(`/api/db/${table}?limit=5000`);
      if (!res.ok) continue;
      const rows = await res.json();
      if (!Array.isArray(rows)) continue;
      const t = db.table(table);
      await t.clear();
      if (rows.length > 0) await t.bulkPut(rows);
    } catch { /* ignore network errors */ }
  }
}

// ── init (call once on client mount) ─────────────────────────────
let initialized = false;

export function initSyncManager() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const isOnline = () => navigator.onLine;

  emit({ online: isOnline() });

  // On reconnect: sync queue then refresh
  window.addEventListener('online', async () => {
    emit({ online: true });
    const { synced } = await processSyncQueue();
    if (synced > 0) await refreshCache(PRIORITY_TABLES);
    emit({ pending: await countPending() });
  });

  window.addEventListener('offline', async () => {
    emit({ online: false, pending: await countPending() });
  });

  // Initial: count pending + pre-warm cache if online
  countPending().then(n => emit({ pending: n }));
  if (isOnline()) {
    refreshCache(PRIORITY_TABLES);
  }
}
