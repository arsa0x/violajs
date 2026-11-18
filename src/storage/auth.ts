import { Database } from "bun:sqlite";
import {
  atomicCallbacks,
  type AtomicRowView,
} from "@oxidezap/baileyrs/lib/Utils/atomic-store.js";
import type { AuthenticationState } from "@oxidezap/baileyrs";
import fs from "fs";
import path from "path";
import { createAuthenticationState } from "@oxidezap/baileyrs/lib/Compatibility/auth-state";

type BridgeStore = NonNullable<AuthenticationState["store"]>;

/**
 * SQLite-backed auth store for baileyrs (Rust/WASM engine).
 *
 * The engine owns creds + Signal state; the JS side only has to be a durable
 * (store, key) -> bytes table that also provides three atomic operations
 * (commitPatch, touchTcTokenSenderTimestamp, storeReceivedTcToken). Those three
 * are built by baileyrs' own `atomicCallbacks` helper on top of a real SQLite
 * transaction, so their semantics match the built-in stores.
 *
 * Use it as `makeWASocket({ auth: state })`. Do not run two processes against
 * the same database file.
 */
export const useSQLiteAuthState = async (
  dbPath: string,
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearAll: () => void;
  close: () => void;
}> => {
  fs.mkdirSync(dbPath, { recursive: true });
  const db = new Database(path.join(dbPath, "auth.sqlite"), { create: true });

  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA synchronous = FULL;");
  db.run("PRAGMA busy_timeout = 5000;");

  db.run(`
    CREATE TABLE IF NOT EXISTS bridge_store (
      store TEXT NOT NULL,
      key   TEXT NOT NULL,
      value BLOB NOT NULL,
      PRIMARY KEY (store, key)
    ) WITHOUT ROWID
  `);

  const stmtGet = db.query<{ value: Uint8Array }, [string, string]>(
    "SELECT value FROM bridge_store WHERE store = ? AND key = ?",
  );
  const stmtSet = db.query(
    `INSERT INTO bridge_store (store, key, value) VALUES (?, ?, ?)
     ON CONFLICT(store, key) DO UPDATE SET value = excluded.value`,
  );
  const stmtDel = db.query(
    "DELETE FROM bridge_store WHERE store = ? AND key = ?",
  );
  const stmtList = db.query<{ key: string }, [string, string, string]>(
    "SELECT key FROM bridge_store WHERE store = ? AND substr(key, 1, length(?)) = ?",
  );
  const stmtListEntries = db.query<
    { key: string; value: Uint8Array },
    [string, string, string]
  >(
    "SELECT key, value FROM bridge_store WHERE store = ? AND substr(key, 1, length(?)) = ?",
  );
  const stmtDelPrefix = db.query(
    "DELETE FROM bridge_store WHERE store = ? AND substr(key, 1, length(?)) = ?",
  );
  const stmtClear = db.query("DELETE FROM bridge_store");

  const read = (store: string, key: string): Uint8Array | undefined => {
    const row = stmtGet.get(store, key);
    return row ? new Uint8Array(row.value) : undefined;
  };

  const transaction = async (change: (rows: AtomicRowView) => void) => {
    db.transaction(() => {
      const rows: AtomicRowView = {
        get: (raw) => {
          const [s, k] = JSON.parse(raw) as [string, string];
          return read(s, k);
        },
        has: (raw) => rows.get(raw) !== undefined,
        set: (raw, value) => {
          const [s, k] = JSON.parse(raw) as [string, string];
          stmtSet.run(s, k, value);
          return rows;
        },
        delete: (raw) => {
          const [s, k] = JSON.parse(raw) as [string, string];
          const existed = read(s, k) !== undefined;
          stmtDel.run(s, k);
          return existed;
        },
      };
      change(rows);
    }).immediate();
  };

  const store: BridgeStore = {
    ...atomicCallbacks(transaction),

    async get(storeName, key) {
      return read(storeName, key) ?? null;
    },
    async set(storeName, key, value) {
      stmtSet.run(storeName, key, value);
    },
    async delete(storeName, key) {
      stmtDel.run(storeName, key);
    },

    async setMany(storeName, entries) {
      if (entries.length === 0) return;
      db.transaction(() => {
        for (const [key, value] of entries) stmtSet.run(storeName, key, value);
      }).immediate();
    },
    async getMany(storeName, keys) {
      const out: [string, Uint8Array][] = [];
      for (const key of keys) {
        const value = read(storeName, key);
        if (value) out.push([key, value]);
      }
      return out;
    },
    async deleteMany(storeName, keys) {
      if (keys.length === 0) return;
      db.transaction(() => {
        for (const key of keys) stmtDel.run(storeName, key);
      }).immediate();
    },

    async listKeys(storeName, prefix = "") {
      return stmtList.all(storeName, prefix, prefix).map((r) => r.key);
    },
    async listEntries(storeName, prefix = "") {
      return stmtListEntries
        .all(storeName, prefix, prefix)
        .map((r): [string, Uint8Array] => [r.key, new Uint8Array(r.value)]);
    },
    async deletePrefix(storeName, prefix) {
      return stmtDelPrefix.run(storeName, prefix, prefix).changes;
    },

    capabilities: { batch: true, enumerate: true, prefixDelete: true },

    async flush() {},
  };

  const state = await createAuthenticationState(store);

  return {
    state,
    saveCreds: async () => {},
    clearAll: () => {
      stmtClear.run();
    },
    close: () => {
      try {
        db.run("PRAGMA wal_checkpoint(TRUNCATE);");
        db.close();
      } catch {}
    },
  };
};
