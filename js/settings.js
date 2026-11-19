import { dbGet, dbPut, STORES } from './db.js';

const SETTINGS_ID = 'app';

export function defaultSettings() {
  return {
    id: SETTINGS_ID,
    pb: null, // { seconds, setAt }
    safetyConfirmedAt: null,
    speechEnabled: true,
    audioEnabled: true,
    defaultLevel: 'normal',
    onboardingComplete: false,
    guideSeenAt: null,
    reminderPrefs: { days: [], time: '19:00' },
    lastExportAt: null,
  };
}

export async function getSettings() {
  const existing = await dbGet(STORES.SETTINGS, SETTINGS_ID);
  if (!existing) {
    const fresh = defaultSettings();
    await dbPut(STORES.SETTINGS, fresh);
    return fresh;
  }
  return { ...defaultSettings(), ...existing, reminderPrefs: { ...defaultSettings().reminderPrefs, ...(existing.reminderPrefs || {}) } };
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch, id: SETTINGS_ID };
  await dbPut(STORES.SETTINGS, next);
  return next;
}
