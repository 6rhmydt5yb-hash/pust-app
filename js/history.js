import { dbGetAll, dbPut, STORES } from './db.js';
import { updateSettings } from './settings.js';

export async function recordPB(seconds, source, sessionId = null) {
  const entry = { seconds, source, recordedAt: new Date().toISOString(), sessionId };
  await dbPut(STORES.PB_HISTORY, entry);
  await updateSettings({ pb: { seconds, setAt: entry.recordedAt } });
  return entry;
}

export async function getPbHistory() {
  const rows = await dbGetAll(STORES.PB_HISTORY);
  return rows.sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
}

export async function saveSession(session) {
  return dbPut(STORES.SESSIONS, session);
}

export async function getSessionsNewestFirst() {
  const rows = await dbGetAll(STORES.SESSIONS);
  return rows.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export async function getSessionsChronological() {
  const rows = await dbGetAll(STORES.SESSIONS);
  return rows.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

export async function getSessionById(id) {
  const rows = await dbGetAll(STORES.SESSIONS);
  return rows.find((s) => s.id === id) || null;
}

// --- Aggregeringer for grafer (rene funksjoner, lette å teste manuelt) ---

export function pbOverTime(pbHistoryRows) {
  return pbHistoryRows.map((r) => ({ at: r.recordedAt, seconds: r.seconds }));
}

function isoWeekKey(dateInput) {
  const date = new Date(dateInput);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-U${String(weekNo).padStart(2, '0')}`;
}

export function sessionsPerWeek(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const key = isoWeekKey(s.startedAt);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([week, count]) => ({ week, count }));
}

export function firstContractionOverTime(sessions) {
  const points = [];
  for (const s of sessions) {
    for (const r of s.rounds || []) {
      if (r.firstContractionAtMs != null) {
        points.push({ at: s.startedAt, seconds: Math.round(r.firstContractionAtMs / 1000) });
      }
    }
  }
  return points;
}
