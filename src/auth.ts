import { Database } from "bun:sqlite";
import {
  proto,
  initAuthCreds,
  BufferJSON,
  makeCacheableSignalKeyStore,
} from "baileys";
import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  SignalDataSet,
} from "baileys";

export const useSQLiteAuthState = async (
  dbPath: string,
): Promise<{
  state: AuthenticationState;
  saveCreds: () => void;
  clearAll: () => void;
}> => {
  const db = new Database(dbPath, { create: true });
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA synchronous = NORMAL;");

  db.run(`
    CREATE TABLE IF NOT EXISTS auth_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const stmtGet = db.query<{ value: string }, [string]>(
    "SELECT value FROM auth_state WHERE key = ?",
  );
  const stmtUpsert = db.query(
    `INSERT INTO auth_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  const stmtDelete = db.query("DELETE FROM auth_state WHERE key = ?");
  const stmtClear = db.query("DELETE FROM auth_state");

  const readData = <T>(key: string): T | null => {
    const row = stmtGet.get(key);
    if (!row) return null;
    try {
      return JSON.parse(row.value, BufferJSON.reviver) as T;
    } catch {
      return null;
    }
  };

  const writeData = (key: string, value: unknown) => {
    const json = JSON.stringify(value, BufferJSON.replacer);
    stmtUpsert.run(key, json);
  };

  const removeData = (key: string) => {
    stmtDelete.run(key);
  };

  const writeBatch = db.transaction(
    (entries: Array<{ key: string; value: unknown | null }>) => {
      for (const { key, value } of entries) {
        if (value === null || value === undefined) {
          removeData(key);
        } else {
          writeData(key, value);
        }
      }
    },
  );

  const CREDS_KEY = "creds";
  const creds: AuthenticationCreds =
    readData<AuthenticationCreds>(CREDS_KEY) ?? initAuthCreds();

  const rawKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const data: { [id: string]: SignalDataTypeMap[T] } = {};
      for (const id of ids) {
        let value = readData<any>(`${type}-${id}`);

        if (type === "app-state-sync-key" && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value);
        }
        if (value) {
          data[id] = value;
        }
      }
      return data;
    },
    set: async (data: SignalDataSet) => {
      const entries: Array<{ key: string; value: unknown | null }> = [];
      for (const category in data) {
        for (const id in data[category as keyof typeof data]) {
          const value = (data as any)[category][id];
          entries.push({ key: `${category}-${id}`, value });
        }
      }
      if (entries.length) {
        writeBatch(entries);
      }
    },
    clear: async () => {
      stmtClear.run();
    },
  };

  const keys = makeCacheableSignalKeyStore(rawKeyStore);

  return {
    state: {
      creds,
      keys,
    },
    saveCreds: () => {
      writeData(CREDS_KEY, creds);
    },
    clearAll: () => {
      stmtClear.run();
    },
  };
};
