import { getSettings } from './settings.js';
import { requestPersistentStorage } from './db.js';
import { initSpeech } from './speech.js';

import * as welcome from './views/welcome.js';
import * as pbtest from './views/pbtest.js';
import * as guide from './views/guide.js';
import * as safetyInfo from './views/safetyInfo.js';
import * as tableList from './views/tableList.js';
import * as tablePreview from './views/tablePreview.js';
import * as tableEditor from './views/tableEditor.js';
import * as relax from './views/relax.js';
import * as session from './views/session.js';
import * as summary from './views/summary.js';
import * as historyView from './views/historyView.js';
import * as reminders from './views/reminders.js';
import * as backupView from './views/backupView.js';
import * as settingsView from './views/settingsView.js';

// ?speed=N (kun til testing): gjør øktens klokke N ganger raskere. Klemmes til [1,50].
export const speedParam = (() => {
  const raw = Number(new URLSearchParams(location.search).get('speed'));
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(50, Math.max(1, raw));
})();

const viewRoot = document.getElementById('view-root');
const header = document.getElementById('app-header');
const titleEl = document.getElementById('app-title');
const backBtn = document.getElementById('app-back');
const bottomNav = document.getElementById('bottom-nav');

const VIEWS = {
  '/velkommen': welcome,
  '/pb-test': pbtest,
  '/veiledning': guide,
  '/sikkerhet-info': safetyInfo,
  '/tabeller': tableList,
  '/tabell': { mount: (root, ctx) => (ctx.params[0] === 'custom' ? tableEditor.mount(root, ctx) : tablePreview.mount(root, ctx)) },
  '/avslapning': relax,
  '/okt': session,
  '/oppsummering': summary,
  '/historikk': historyView,
  '/paminnelser': reminders,
  '/sikkerhetskopi': backupView,
  '/innstillinger': settingsView,
};

// chrome: 'none' (immersiv, ingen header/nav) | 'header' (header + tilbake-knapp) | 'nav' (header + bunnmeny)
const ROUTE_CONFIG = {
  '/velkommen': { chrome: 'none' },
  '/pb-test': { chrome: 'none' },
  '/veiledning': { chrome: 'header', title: 'Veiledning' },
  '/sikkerhet-info': { chrome: 'header', title: 'Sikkerhet' },
  '/tabeller': { chrome: 'nav', title: 'Pust' },
  '/tabell': { chrome: 'header', title: 'Tabell' },
  '/avslapning': { chrome: 'header', title: 'Avslapningspust' },
  '/okt': { chrome: 'none' },
  '/oppsummering': { chrome: 'header', title: 'Oppsummering' },
  '/historikk': { chrome: 'nav', title: 'Historikk' },
  '/paminnelser': { chrome: 'header', title: 'Påminnelser' },
  '/sikkerhetskopi': { chrome: 'header', title: 'Sikkerhetskopi' },
  '/innstillinger': { chrome: 'nav', title: 'Innstillinger' },
};

const ONBOARDING_ALLOWED = new Set(['/velkommen', '/pb-test', '/veiledning']);

let currentUnmount = null;
let renderToken = 0;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/tabeller';
  const segments = raw.split('/').filter(Boolean);
  return { path: '/' + (segments[0] || 'tabeller'), params: segments.slice(1) };
}

function applyChrome(config, path) {
  if (config.chrome === 'none') {
    header.hidden = true;
    bottomNav.hidden = true;
    viewRoot.classList.add('no-nav-padding');
    return;
  }
  header.hidden = false;
  titleEl.textContent = config.title || 'Pust';
  backBtn.hidden = config.chrome !== 'header';
  bottomNav.hidden = config.chrome !== 'nav';
  viewRoot.classList.toggle('no-nav-padding', config.chrome !== 'nav');
  for (const item of bottomNav.querySelectorAll('.bottom-nav__item')) {
    item.classList.toggle('active', item.dataset.route === '#' + path);
  }
}

async function render() {
  const myToken = ++renderToken;

  if (currentUnmount) {
    try {
      currentUnmount();
    } catch {
      // view-opprydding skal aldri stoppe navigasjonen
    }
    currentUnmount = null;
  }

  const settings = await getSettings();
  if (myToken !== renderToken) return; // en nyere navigasjon har startet i mellomtiden

  const { path, params } = parseHash();

  if (!settings.onboardingComplete && !ONBOARDING_ALLOWED.has(path)) {
    location.hash = '#/velkommen';
    return;
  }

  const config = ROUTE_CONFIG[path] || ROUTE_CONFIG['/tabeller'];
  const viewModule = VIEWS[path] || VIEWS['/tabeller'];

  applyChrome(config, path);

  viewRoot.innerHTML = '';
  const ctx = {
    params,
    settings,
    speed: speedParam,
    navigate: (hash) => {
      location.hash = hash;
    },
  };

  const result = await viewModule.mount(viewRoot, ctx);

  if (myToken !== renderToken) {
    // En nyere navigasjon skjedde mens denne visningen monterte seg - rydd den opp uten å ta over.
    if (typeof result === 'function') {
      try {
        result();
      } catch {
        // stille feil
      }
    }
    return;
  }

  currentUnmount = typeof result === 'function' ? result : null;
}

backBtn.addEventListener('click', () => history.back());
bottomNav.addEventListener('click', (e) => {
  const btn = e.target.closest('.bottom-nav__item');
  if (btn) location.hash = btn.dataset.route;
});

window.addEventListener('hashchange', render);

async function boot() {
  await requestPersistentStorage();
  initSpeech();
  if (!location.hash) {
    location.hash = '#/tabeller';
  } else {
    render();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // offline/service worker er en tilleggsfunksjon - appen skal virke uten også
    });
  }
}

boot();
