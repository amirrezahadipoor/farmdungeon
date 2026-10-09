// art/font2.js — رابطِ متنِ داخلِ بوم (S9.1): گلیف‌های متصلِ فارسی/لاتین از font_fa.js
// API ثابت: textW · drawText(outline/shadow) · drawTextC · drawTitle(C) — حاشیه‌ی بیرونیِ یکپارچه (سیلاب از لبه)
import { faShape, FA_H } from './font_fa.js';

const H = FA_H;
// ماسکِ رشته: ۱ = هسته — کش با سقف (رشته‌های پویا مثل اعدادِ شناور زیادند)
const _mk = new Map();
function maskOf(s) {
  let m = _mk.get(s);
  if (m) return m;
  const gs = faShape(s);
  let W = 0, minX = 0;
  { let x = 0; for (const g of gs) { minX = Math.min(minX, x + g.ox); W = Math.max(W, x + g.ox + g.w, x + g.adv); x += g.adv; } }
  const sh = -minX; W += sh;
  const a = new Uint8Array(Math.max(1, W) * H);
  let x = sh;
  for (const g of gs) {
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < g.w; xx++) if (g.a[yy * g.w + xx]) { const px = x + g.ox + xx; if (px >= 0 && px < W) a[yy * W + px] = 1; }
    x += g.adv;
  }
  let adv = sh; for (const g of gs) adv += g.adv;
  m = { W: Math.max(1, W), a, sh, adv };
  if (_mk.size > 256) _mk.clear();
  _mk.set(s, m);
  return m;
}
// حلقه‌ی بیرونی با ضخامتِ thick (فاصله‌ی چبیشف) فقط روی خانه‌های «بیرونِ شکل» (چشمه‌ی بسته پر نمی‌شود)
const _rg = new Map();
function ringOf(s, thick, cheb) {
  const key = s + '|' + thick + (cheb ? 'c' : 'p');
  let r = _rg.get(key);
  if (r) return r;
  const m = maskOf(s), p = thick + 1, W = m.W + 2 * p, Hh = H + 2 * p;
  const core = new Uint8Array(W * Hh);
  for (let y = 0; y < H; y++) for (let x = 0; x < m.W; x++) if (m.a[y * m.W + x]) core[(y + p) * W + x + p] = 1;
  const out = new Uint8Array(W * Hh), st = [];
  const seed = (i) => { if (!core[i] && !out[i]) { out[i] = 1; st.push(i); } };
  for (let x = 0; x < W; x++) { seed(x); seed((Hh - 1) * W + x); }
  for (let y = 0; y < Hh; y++) { seed(y * W); seed(y * W + W - 1); }
  while (st.length) {
    const i = st.pop(), x = i % W, y = (i - x) / W;
    if (y > 0) seed(i - W); if (y < Hh - 1) seed(i + W); if (x > 0) seed(i - 1); if (x < W - 1) seed(i + 1);
  }
  const a = new Uint8Array(W * Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (core[i]) { a[i] = 3; continue; }
    if (!out[i]) continue;
    let hit = false;
    for (let dy = -thick; dy <= thick && !hit; dy++) for (let dx = -thick; dx <= thick; dx++) {
      if (!cheb && Math.abs(dx) + Math.abs(dy) > thick) continue;
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < Hh && xx >= 0 && xx < W && core[yy * W + xx]) { hit = true; break; }
    }
    if (hit) a[i] = 2;
  }
  r = { W, H: Hh, a, p };
  if (_rg.size > 256) _rg.clear();
  _rg.set(key, r);
  return r;
}

export function textW(s, sc = 1) { return maskOf(String(s)).adv * sc; }
const dot = (r, x, y, sc, c) => { if (sc === 1) r.px(x, y, c); else r.rect(x, y, sc, sc, c); };

const _oc = [20, 16, 33, 255];
export function drawText(r, s, x, y, col, sc = 1, o = null) {
  s = String(s);
  x = Math.round(x); y = Math.round(y);
  const m = maskOf(s);
  const x0 = x - m.sh * sc;
  if (o && o.outline) {
    _oc[3] = col[3] ?? 255;
    const g = ringOf(s, 1, false);
    for (let yy = 0; yy < g.H; yy++) for (let xx = 0; xx < g.W; xx++) if (g.a[yy * g.W + xx] === 2) dot(r, x0 + (xx - g.p) * sc, y + (yy - g.p) * sc, sc, _oc);
  }
  if (o && o.shadow) for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < m.W; xx++) {
    if (m.a[yy * m.W + xx] && (yy === H - 1 || !m.a[(yy + 1) * m.W + xx])) dot(r, x0 + xx * sc, y + (yy + 1) * sc, sc, col);
  }
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < m.W; xx++) if (m.a[yy * m.W + xx]) dot(r, x0 + xx * sc, y + yy * sc, sc, col);
}
export function drawTextC(r, s, cx, y, col, sc = 1, o = null) { drawText(r, s, Math.round(cx - textW(s, sc) / 2), y, col, sc, o); }

// تیتر: حاشیه‌ی یکپارچه‌ی ضخیم + سایه‌ی جدا + لبه‌ی روشنِ بالا (اختیاری)
export function drawTitle(r, s, x, y, col, sc = 2, o = null) {
  s = String(s);
  const thick = Math.max(1, Math.min(2, (o && o.thick) || 1));
  const g = ringOf(s, thick, true), m = maskOf(s);
  const oc = (o && o.oc) || [20, 16, 33, 255];
  const shc = (o && o.shc) || [0, 0, 0, 130];
  const hi = (o && o.hi) || null;
  const dy = (o && o.sh === 0) ? 0 : Math.max(0, (o && o.sh) || 2);
  const X = Math.round(x) - (g.p + m.sh) * sc, Y = Math.round(y) - g.p * sc;
  if (dy) for (let yy = 0; yy < g.H; yy++) for (let xx = 0; xx < g.W; xx++) if (g.a[yy * g.W + xx]) dot(r, X + xx * sc, Y + (yy + dy) * sc, sc, shc);
  for (let yy = 0; yy < g.H; yy++) for (let xx = 0; xx < g.W; xx++) {
    const v = g.a[yy * g.W + xx];
    if (!v) continue;
    let c = v === 2 ? oc : col;
    if (v === 3 && hi && g.a[(yy - 1) * g.W + xx] !== 3) c = hi;
    dot(r, X + xx * sc, Y + yy * sc, sc, c);
  }
}
export function drawTitleC(r, s, cx, y, col, sc = 2, o = null) {
  drawTitle(r, s, Math.round(cx - textW(s, sc) / 2), y, col, sc, o);
}
