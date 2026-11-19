// Bygger en .ics-fil med en gjentakende kalenderhendelse + varsel, siden en
// PWA ikke kan planlegge egne varsler på iOS.

const BYDAY = { mon: 'MO', tue: 'TU', wed: 'WE', thu: 'TH', fri: 'FR', sat: 'SA', sun: 'SU' };
const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatICSDateTimeUTC(date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}00Z`;
}

function nextOccurrence(from, days, hh, mm) {
  const wanted = new Set(days.map((d) => DAY_INDEX[d]));
  for (let i = 0; i < 8; i++) {
    const check = new Date(from);
    check.setDate(from.getDate() + i);
    check.setHours(hh, mm, 0, 0);
    if (wanted.has(check.getDay()) && check > from) return check;
  }
  // Skal ikke kunne skje når days ikke er tom, men gir et trygt fallback.
  const fallback = new Date(from);
  fallback.setHours(hh, mm, 0, 0);
  return fallback;
}

/**
 * days: array av 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'
 * time: 'HH:MM' i brukerens lokale tid
 */
export function buildReminderICS({ days, time }) {
  if (!days || !days.length) throw new Error('Velg minst én dag for påminnelsen.');
  const [hh, mm] = time.split(':').map(Number);
  const now = new Date();
  const start = nextOccurrence(now, days, hh, mm);
  const byday = days.map((d) => BYDAY[d]).join(',');
  const uid = `pust-reminder-${Date.now()}@pust-app`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pust//Pustestopptrening//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDateTimeUTC(new Date())}`,
    `DTSTART:${formatICSDateTimeUTC(start)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    'SUMMARY:Pust - pustestopptrening',
    'DESCRIPTION:Tid for en pustestopp-økt i Pust-appen.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Pust - tid for trening',
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];
  return lines.join('\r\n');
}

export function downloadICS(filename, icsContent) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
