// Rene SVG-byggefunksjoner. Ingen biblioteker. Returnerer en SVG-streng som
// settes inn via innerHTML av visningen. Bruker CSS-variabler for farger slik
// at grafene følger appens tema.

const WIDTH = 320;
const HEIGHT = 160;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

function formatDateShort(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function emptySvg(text) {
  return `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="chart"><text x="${WIDTH / 2}" y="${HEIGHT / 2}" text-anchor="middle" class="chart-empty">${text}</text></svg>`;
}

/** points: [{at: ISO-streng, seconds: number}] */
export function buildLineChartSVG(points, { ariaLabel = '', emptyText = 'Ingen data ennå' } = {}) {
  if (!points.length) return emptySvg(emptyText);

  const x = scaleLinear([0, Math.max(1, points.length - 1)], [PAD.left, WIDTH - PAD.right]);
  const ys = points.map((p) => p.seconds);
  const yMax = Math.max(...ys, 1);
  const yMin = Math.min(0, ...ys);
  const y = scaleLinear([yMin, yMax], [HEIGHT - PAD.bottom, PAD.top]);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.seconds).toFixed(1)}`).join(' ');
  const dots = points
    .map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.seconds).toFixed(1)}" r="3.5" fill="var(--accent)" />`)
    .join('');

  return `
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${ariaLabel}" class="chart">
      <line x1="${PAD.left}" y1="${HEIGHT - PAD.bottom}" x2="${WIDTH - PAD.right}" y2="${HEIGHT - PAD.bottom}" class="chart-axis" />
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" />
      ${dots}
      <text x="${PAD.left}" y="${HEIGHT - 8}" class="chart-tick">${formatDateShort(points[0].at)}</text>
      <text x="${WIDTH - PAD.right}" y="${HEIGHT - 8}" text-anchor="end" class="chart-tick">${formatDateShort(points[points.length - 1].at)}</text>
      <text x="${PAD.left}" y="${PAD.top - 4}" class="chart-tick">${formatSeconds(yMax)}</text>
    </svg>
  `;
}

/** points: [{week: string, count: number}] */
export function buildBarChartSVG(points, { ariaLabel = 'Økter per uke', emptyText = 'Ingen data ennå' } = {}) {
  if (!points.length) return emptySvg(emptyText);

  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const x = scaleLinear([0, points.length], [PAD.left, WIDTH - PAD.right]);
  const y = scaleLinear([0, maxCount], [HEIGHT - PAD.bottom, PAD.top]);
  const barWidth = Math.max(6, (WIDTH - PAD.left - PAD.right) / points.length - 4);

  const bars = points
    .map((p, i) => {
      const barX = x(i) + 2;
      const barY = y(p.count);
      const barH = Math.max(0, HEIGHT - PAD.bottom - barY);
      return `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="var(--accent)" rx="2" />`;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${ariaLabel}" class="chart">
      <line x1="${PAD.left}" y1="${HEIGHT - PAD.bottom}" x2="${WIDTH - PAD.right}" y2="${HEIGHT - PAD.bottom}" class="chart-axis" />
      ${bars}
      <text x="${PAD.left}" y="${PAD.top - 4}" class="chart-tick">${maxCount}</text>
    </svg>
  `;
}
