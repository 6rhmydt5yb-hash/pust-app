// Små delte hjelpefunksjoner brukt av flere views.

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatDateNo(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTimeNo(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const LEVEL_LABELS = { lett: 'Lett', normal: 'Normal', hard: 'Hard' };

export const TABLE_TYPE_LABELS = {
  co2: 'CO2-tabell',
  o2: 'O2-tabell',
  mix: 'Mix-tabell',
  wonka: 'Wonka-tabell',
  custom: 'Egendefinert',
  relax: 'Avslapningspust',
};

export const DAY_LABELS = { mon: 'Man', tue: 'Tir', wed: 'Ons', thu: 'Tor', fri: 'Fre', sat: 'Lør', sun: 'Søn' };
export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function openModal(innerHtml) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">${innerHtml}</div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  return { backdrop, modal: backdrop.querySelector('.modal'), close };
}

export function confirmModal({ title, body, confirmLabel = 'Bekreft', cancelLabel = 'Avbryt', danger = false }) {
  return new Promise((resolve) => {
    const { backdrop, close } = openModal(`
      <h2>${title}</h2>
      <p>${body}</p>
      <div class="btn-block-group">
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmLabel}</button>
        <button type="button" class="btn btn-secondary" id="modal-cancel">${cancelLabel}</button>
      </div>
    `);
    backdrop.querySelector('#modal-confirm').addEventListener('click', () => {
      close();
      resolve(true);
    });
    backdrop.querySelector('#modal-cancel').addEventListener('click', () => {
      close();
      resolve(false);
    });
  });
}
