import { dbGetAll, dbBulkPut, clearAllStores, STORES } from './db.js';
import { updateSettings } from './settings.js';

const EXPORT_VERSION = 1;

export async function exportData() {
  const [settingsRows, pbHistory, customTables, sessions] = await Promise.all([
    dbGetAll(STORES.SETTINGS),
    dbGetAll(STORES.PB_HISTORY),
    dbGetAll(STORES.CUSTOM_TABLES),
    dbGetAll(STORES.SESSIONS),
  ]);
  const payload = {
    app: 'pust',
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settingsRows,
    pbHistory,
    customTables,
    sessions,
  };
  await updateSettings({ lastExportAt: payload.exportedAt });
  return payload;
}

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseImportFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Filen er ikke gyldig JSON.');
  }
  if (!data || data.app !== 'pust' || typeof data.exportVersion !== 'number') {
    throw new Error('Filen ser ikke ut til å være en gyldig Pust-sikkerhetskopi.');
  }
  return data;
}

export function countRecords(data) {
  return {
    settings: (data.settings || []).length,
    pbHistory: (data.pbHistory || []).length,
    customTables: (data.customTables || []).length,
    sessions: (data.sessions || []).length,
  };
}

export async function importData(data) {
  await clearAllStores();
  await dbBulkPut(STORES.SETTINGS, data.settings || []);
  await dbBulkPut(STORES.PB_HISTORY, data.pbHistory || []);
  await dbBulkPut(STORES.CUSTOM_TABLES, data.customTables || []);
  await dbBulkPut(STORES.SESSIONS, data.sessions || []);
}

export function daysSinceLastExport(lastExportAt) {
  if (!lastExportAt) return Infinity;
  const diffMs = Date.now() - new Date(lastExportAt).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
