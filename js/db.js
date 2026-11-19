// Tynn IndexedDB-wrapper. Ingen avhengigheter. Alle funksjoner returnerer Promises.

const DB_NAME = 'pust-db';
const DB_VERSION = 1;

export const STORES = {
  SETTINGS: 'settings',
  PB_HISTORY: 'pbHistory',
  CUSTOM_TABLES: 'customTables',
  SESSIONS: 'sessions',
};

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PB_HISTORY)) {
        db.createObjectStore(STORES.PB_HISTORY, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOM_TABLES)) {
        db.createObjectStore(STORES.CUSTOM_TABLES, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        db.createObjectStore(STORES.SESSIONS, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(storeName, key) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return wrap(tx.objectStore(storeName).get(key));
}

export async function dbGetAll(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return wrap(tx.objectStore(storeName).getAll());
}

export async function dbPut(storeName, value) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const result = await wrap(tx.objectStore(storeName).put(value));
  return result;
}

export async function dbDelete(storeName, key) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  return wrap(tx.objectStore(storeName).delete(key));
}

export async function dbClear(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  return wrap(tx.objectStore(storeName).clear());
}

export async function dbBulkPut(storeName, values) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const value of values) store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function clearAllStores() {
  for (const name of Object.values(STORES)) {
    await dbClear(name);
  }
}

export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}
