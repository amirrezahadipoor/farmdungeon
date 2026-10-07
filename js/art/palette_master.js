// art/palette_master.js — پالت مستر (S1.2): ۹۶ رنگ که همه‌ی رنگ‌های رمپ + رنگ‌های ویژه را در ΔE<۶ پوشش می‌دهد
// ساخت قطعی در بارگذاری (۲۶ms، یک‌بار): FPS (farthest-point) → Lloyd → refine «اسلاید مرکز بدترین نقطه».
// منبع حقیقت رنگ‌ها همچنان art/ramps.js است؛ M5 (tools/art_audit.mjs) درصد پیکسل‌های داخل این پالت را می‌سنجد.
import { RAMP, RAMP_BASE_NAMES } from './ramps.js';

// رنگ‌های ویژه (بیرون رمپ‌ها؛ همه توسط FPS به‌عنوان مرکز انتخاب می‌شوند → فاصله ۰)
export const PM_SPECIALS = [
  [242, 239, 228], // سفید گرم (استخوانی/نور)
  [20, 16, 33],    // سیاه جوهری (outline)
  [201, 79, 79],   // قرمز خون (شال/آسیب)
  [124, 192, 105], // سبز افکت (جوانه/درخشش)
];
export const PM_K = 96;        // سقف تعداد رنگ‌های پالت مستر (پذیرش S1.2)
export const PM_TOL = 6;       // آستانه‌ی پوشش (نرمال‌شده — همان متریک M5)

export const pmDist = (a, b) => Math.sqrt(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / 3);

function pmUnion() {
  const u = [];
  for (const n of RAMP_BASE_NAMES) for (const c of RAMP[n]) u.push([c[0], c[1], c[2]]);
  for (const s of PM_SPECIALS) u.push(s);
  return u;
}

// ساخت قطعی پالت مستر: FPS با کش افزایشی (O(K·n)) → Lloyd (۲۴ دور) → refine (accept-only-improve)
export function buildPaletteMaster(K = PM_K, lloyd = 24) {
  const U = pmUnion(), n = U.length;
  const centers = [[20, 16, 33]];         // شروع: سیاه جوهری
  const bd = new Float64Array(n).fill(Infinity);
  const upd = (c) => { for (let i = 0; i < n; i++) { const d = pmDist(U[i], c); if (d < bd[i]) bd[i] = d; } };
  upd(centers[0]);
  while (centers.length < K) { let bi = -1, bv = -1; for (let i = 0; i < n; i++) if (bd[i] > bv) { bv = bd[i]; bi = i; } centers.push(U[bi].slice()); upd(U[bi]); }
  for (let it = 0; it < lloyd; it++) {
    const s = Array.from({ length: centers.length }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) { let bi = 0, b = Infinity; for (let j = 0; j < centers.length; j++) { const d = pmDist(U[i], centers[j]); if (d < b) { b = d; bi = j; } } const t = s[bi]; t[0] += U[i][0]; t[1] += U[i][1]; t[2] += U[i][2]; t[3]++; }
    for (let j = 0; j < centers.length; j++) { const t = s[j]; if (t[3]) centers[j] = [Math.round(t[0] / t[3]), Math.round(t[1] / t[3]), Math.round(t[2] / t[3])]; }
  }
  const maxCov = () => { let m = 0; for (let i = 0; i < n; i++) { let b = Infinity; for (const c of centers) { const d = pmDist(U[i], c); if (d < b) b = d; } if (b > m) m = b; } return m; };
  for (let round = 0; round < 60; round++) {
    let worst = null, wd = -1, wi = -1;
    for (let i = 0; i < n; i++) { let b = Infinity, bi = 0; for (let j = 0; j < centers.length; j++) { const d = pmDist(U[i], centers[j]); if (d < b) { b = d; bi = j; } } if (b > wd) { wd = b; worst = U[i]; wi = bi; } }
    if (wd <= PM_TOL) break;
    const c0 = centers[wi]; let best = null, bm = maxCov();
    for (const t of [0.25, 0.5, 0.75, 1.0]) {
      const cand = [Math.round(c0[0] + (worst[0] - c0[0]) * t), Math.round(c0[1] + (worst[1] - c0[1]) * t), Math.round(c0[2] + (worst[2] - c0[2]) * t)];
      centers[wi] = cand; const m = maxCov(); if (m < bm - 1e-9) { bm = m; best = cand.slice(); }
      centers[wi] = c0;
    }
    if (!best) break; centers[wi] = best;
  }
  return { centers, cover: maxCov() };
}

const _built = buildPaletteMaster();
export const PALETTE_MASTER = _built.centers.map((c) => [c[0], c[1], c[2], 255]);
export const PM_SIZE = PALETTE_MASTER.length;  // ≤ ۹۶ (پذیرش S1.2)
export const PM_COVER = _built.cover;          // بدترین فاصله‌ی رنگ‌های منبع تا نزدیک‌ترین رنگ پالت (باید < PM_TOL)

// آیا این رنگ در پالت است؟ (متریک نرمال‌شده‌ی M5)
export function inPM(r, g, b, tol = PM_TOL) {
  for (const c of PALETTE_MASTER) {
    const dr = r - c[0], dg = g - c[1], db = b - c[2];
    if ((dr * dr + dg * dg + db * db) / 3 < tol * tol) return true;
  }
  return false;
}
// نزدیک‌ترین رنگ پالت (برای snap در S1.6) → [r,g,b,255]
export function nearestPM(r, g, b) {
  let best = PALETTE_MASTER[0], bd = Infinity;
  for (const c of PALETTE_MASTER) { const dr = r - c[0], dg = g - c[1], db = b - c[2]; const d = dr * dr + dg * dg + db * db; if (d < bd) { bd = d; best = c; } }
  return best;
}
