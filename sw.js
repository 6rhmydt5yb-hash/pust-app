// Service worker for Pust. Alle stier er relative, slik at appen virker både
// lokalt og publisert under en understi (f.eks. GitHub Pages /pust-app/).

const CACHE_NAME = 'pust-v1';

const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/db.js',
  'js/safety.js',
  'js/tables.js',
  'js/timer.js',
  'js/settings.js',
  'js/history.js',
  'js/charts.js',
  'js/speech.js',
  'js/audio.js',
  'js/wakelock.js',
  'js/ics.js',
  'js/backup.js',
  'js/dom.js',
  'js/sessionBridge.js',
  'js/views/welcome.js',
  'js/views/pbtest.js',
  'js/views/guide.js',
  'js/views/safetyInfo.js',
  'js/views/tableList.js',
  'js/views/tablePreview.js',
  'js/views/tableEditor.js',
  'js/views/relax.js',
  'js/views/session.js',
  'js/views/summary.js',
  'js/views/historyView.js',
  'js/views/reminders.js',
  'js/views/backupView.js',
  'js/views/settingsView.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
