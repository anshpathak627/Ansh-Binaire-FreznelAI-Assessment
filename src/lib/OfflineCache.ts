import { openDB, type IDBPDatabase } from "idb";
import type { ModelRecord } from "../types/model";

const DB_NAME = "model-search-cache";
const DB_VERSION = 1;
const STORE_GOOD = "models"; // verified-good cache
const STORE_TEMP = "models_temp"; // staging area for atomic swap
const META_STORE = "meta";
const KEY = "all-models";

/**
 * OfflineCache wraps IndexedDB (via the `idb` helper library) and implements
 * an atomic "write to temp key, verify, then swap" pattern:
 *
 *   1. New data is written to a TEMP object store first.
 *   2. Only once the write completes without throwing (and the caller has
 *      already confirmed the JSON parsed successfully upstream) do we copy
 *      the temp record over the GOOD object store, inside a single
 *      read-write transaction.
 *   3. If anything fails at any point, the previous GOOD copy is left
 *      completely untouched, so a partial/corrupt fetch can never clobber a
 *      working cached copy. Callers therefore always have *some* usable
 *      data available offline.
 */
export class OfflineCache {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_GOOD)) {
          db.createObjectStore(STORE_GOOD);
        }
        if (!db.objectStoreNames.contains(STORE_TEMP)) {
          db.createObjectStore(STORE_TEMP);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      },
    });
  }

  /** Stage new data in the temp store. Does not touch the good copy. */
  public async stage(models: ModelRecord[]): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE_TEMP, models, KEY);
  }

  /**
   * Atomically promote the staged (temp) data to be the new good copy, and
   * record a timestamp. Only call this after verifying the staged payload
   * is well-formed.
   */
  public async commitStaged(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction([STORE_TEMP, STORE_GOOD, META_STORE], "readwrite");
    const staged = await tx.objectStore(STORE_TEMP).get(KEY);
    if (staged) {
      await tx.objectStore(STORE_GOOD).put(staged, KEY);
      await tx.objectStore(META_STORE).put(Date.now(), "lastUpdated");
    }
    await tx.done;
  }

  public async getGood(): Promise<ModelRecord[] | undefined> {
    const db = await this.dbPromise;
    return db.get(STORE_GOOD, KEY);
  }

  public async getLastUpdated(): Promise<number | undefined> {
    const db = await this.dbPromise;
    return db.get(META_STORE, "lastUpdated");
  }
}

export const offlineCache = new OfflineCache();
