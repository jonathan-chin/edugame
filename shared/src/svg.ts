/**
 * Server-side SVG renderers. These build plain SVG strings (no DOM, no chart library) so
 * the API can generate a question's graphics and ship the finished markup to any client.
 *
 * Colors are CSS custom properties, so an inline-injected SVG still adopts the client's
 * theme. One consistent visual style is used for all densities — variety comes from the
 * distribution *shapes*, not from the rendering.
 */

const PRIMARY = "var(--ion-color-primary, #5b8cff)";
const FILL = "var(--ion-color-primary, #5b8cff)";
const MUTED = "var(--muted, #9aa3c0)";
const AXIS = "rgba(255,255,255,0.25)";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function axisTicks(lo: number, hi: number, sx: (x: number) => number, y: number): string {
  const vals = [lo, lo + (hi - lo) * 0.25, (lo + hi) / 2, hi - (hi - lo) * 0.25, hi];
  return vals
    .map((v) => {
      const x = sx(v);
      return (
        `<line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(x)}" y2="${fmt(y + 4)}" stroke="${MUTED}" stroke-width="1"/>` +
        `<text x="${fmt(x)}" y="${fmt(y + 16)}" fill="${MUTED}" font-size="10" text-anchor="middle" font-family="sans-serif">${fmt(v)}</text>`
      );
    })
    .join("");
}

/** A filled density curve with a baseline axis. `pdf` is sampled across `domain`. */
export function densitySvg(pdf: (x: number) => number, domain: [number, number]): string {
  const W = 340;
  const H = 200;
  const PADX = 16;
  const PADTOP = 18;
  const AXISY = H - 30;
  const [lo, hi] = domain;
  const n = 180;

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = lo + ((hi - lo) * i) / (n - 1);
    xs.push(x);
    ys.push(pdf(x));
  }
  const maxY = Math.max(...ys, 1e-9);
  const sx = (x: number) => PADX + ((x - lo) / (hi - lo)) * (W - 2 * PADX);
  const sy = (y: number) => AXISY - (y / maxY) * (AXISY - PADTOP);

  let d = `M ${fmt(sx(xs[0]!))} ${fmt(AXISY)}`;
  for (let i = 0; i < n; i++) d += ` L ${fmt(sx(xs[i]!))} ${fmt(sy(ys[i]!))}`;
  d += ` L ${fmt(sx(xs[n - 1]!))} ${fmt(AXISY)} Z`;

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="distribution">` +
    `<line x1="${PADX}" y1="${AXISY}" x2="${W - PADX}" y2="${AXISY}" stroke="${AXIS}" stroke-width="1"/>` +
    `<path d="${d}" fill="${FILL}" fill-opacity="0.28" stroke="${PRIMARY}" stroke-width="2" stroke-linejoin="round"/>` +
    axisTicks(lo, hi, sx, AXISY) +
    `</svg>`
  );
}

export interface FiveNumber {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

/** A box-and-whisker plot (no outlier marks). */
export function boxPlotSvg(fn: FiveNumber, domain: [number, number]): string {
  const W = 320;
  const H = 118;
  const PAD = 20;
  const [lo, hi] = domain;
  const sx = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - 2 * PAD);
  const cy = 52;
  const boxTop = cy - 22;
  const boxH = 44;

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="box and whisker plot">` +
    // whiskers
    `<line x1="${fmt(sx(fn.min))}" y1="${cy}" x2="${fmt(sx(fn.q1))}" y2="${cy}" stroke="${PRIMARY}" stroke-width="2"/>` +
    `<line x1="${fmt(sx(fn.q3))}" y1="${cy}" x2="${fmt(sx(fn.max))}" y2="${cy}" stroke="${PRIMARY}" stroke-width="2"/>` +
    // whisker caps
    `<line x1="${fmt(sx(fn.min))}" y1="${cy - 12}" x2="${fmt(sx(fn.min))}" y2="${cy + 12}" stroke="${PRIMARY}" stroke-width="2"/>` +
    `<line x1="${fmt(sx(fn.max))}" y1="${cy - 12}" x2="${fmt(sx(fn.max))}" y2="${cy + 12}" stroke="${PRIMARY}" stroke-width="2"/>` +
    // box
    `<rect x="${fmt(sx(fn.q1))}" y="${boxTop}" width="${fmt(sx(fn.q3) - sx(fn.q1))}" height="${boxH}" rx="3" fill="${FILL}" fill-opacity="0.28" stroke="${PRIMARY}" stroke-width="2"/>` +
    // median
    `<line x1="${fmt(sx(fn.median))}" y1="${boxTop}" x2="${fmt(sx(fn.median))}" y2="${boxTop + boxH}" stroke="#eef1f8" stroke-width="2"/>` +
    axisTicks(lo, hi, sx, H - 26) +
    `</svg>`
  );
}
