// art/outline.js — outline یکدستِ انتخابی (S1.7): قهرمان، همه‌ی موب‌ها، باس، درخت، خانه/سازه‌ها
// قاعده: هر پیکسل شفافِ ۴-همسایه‌ی بدنه → outline ۱px (گوشه‌ها پر نمی‌شوند تا خوانا بماند).
//   mode 'ink': رنگ ثابت رمپ جوهری · mode 'sel': تُنِ همان ماده (مخلوط با جوهر) با روشنایی در باند ۱۴–۲۴.
// بدنه‌ی نیمه‌شفاف (روح): آستانه‌ی آلفا پایین‌تر و حلقه‌ی نیمه‌شفاف تا روح از پس‌زمینه جدا شود.
import { Raster } from '../raster.js';
import { rp, RAMP_NAMES } from './ramps.js';
import { nearestPM } from './palette_master.js';

const INK = rp('ink', 1);
// نگاشت رنگِ بدنه → خانوادهٔ رمپ (برای outline «همان ماده»)
const FAM = new Map();
for (const nm of RAMP_NAMES) for (let i = 0; i < 7; i++) { const c = rp(nm, i); const k = (c[0] << 16) | (c[1] << 8) | c[2]; if (!FAM.has(k)) FAM.set(k, [nm, i]); }
const key3 = (r, g, b) => (r << 16) | (g << 8) | b;
export const OL_MIN = 14, OL_MAX = 24, OL_MID = 19; // باند روشنایی outline (سنجه‌ی M2)
const lum = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;

// رنگ انتخابی: بدنه ۴۵٪ جوهری می‌شود، سپس روشنایی به کف باند (۱۹) می‌رود — هیو/اشباع ماده حفظ
export function selColor(r, g, b) {
  const f = FAM.get(key3(r, g, b));
  if (f) { const c = rp(f[0], f[1] >= 3 ? 1 : 0); return [c[0], c[1], c[2], 255]; } // پلهٔ تیرهٔ همان ماده (L≈۲۵/۱۲)
  const mr = r * 0.55 + INK[0] * 0.45, mg = g * 0.55 + INK[1] * 0.45, mb = b * 0.55 + INK[2] * 0.45;
  const k = OL_MID / (lum(mr, mg, mb) || 1);
  const tr = Math.round(mr * k), tg = Math.round(mg * k), tb = Math.round(mb * k);
  // اگر پالت مستر همان ماده را در باند روشناییِ outline دارد، همان بهتر است (سازگاری M5)
  const pm = nearestPM(tr, tg, tb); const lp = lum(pm[0], pm[1], pm[2]);
  if (lp >= 10 && lp <= 32) return [pm[0], pm[1], pm[2], 255];   // نزدیک‌ترین رنگ پالت مستر
  return [INK[0], INK[1], INK[2], 255];                           // پلهٔ جوهر (داخل پالت مستر)
}

export function inkOutline(s, opt = {}) {
  const d = s.d, w = s.w, h = s.h;
  let maxA = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > maxA) maxA = d[i];
  const sem = maxA < 250;                                  // روح/اجسام نیمه‌شفاف
  const minA = opt.minA ?? (sem ? 100 : 200);              // آستانه‌ی بدنه
  const ra = opt.ringA ?? (sem ? Math.max(110, Math.round(maxA * 0.55)) : 255);
  const mode = opt.mode || 'sel';
  const ring = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] >= 40) continue;                          // خالی/سایهٔ تماس (α<۴۰) — خط تماس زیر پا هم می‌گیرد
    let nb = -1;                                           // ۴-همسایه (بدون گوشه)
    if (x > 0 && d[i - 4 + 3] >= minA) nb = i - 4;
    else if (x < w - 1 && d[i + 4 + 3] >= minA) nb = i + 4;
    else if (y > 0 && d[i - w * 4 + 3] >= minA) nb = i - w * 4;
    else if (y < h - 1 && d[i + w * 4 + 3] >= minA) nb = i + w * 4;
    if (nb < 0) continue;
    const c = mode === 'ink' ? INK : selColor(d[nb], d[nb + 1], d[nb + 2]);
    // کلاmp نهایی به باند ۱۴–۲۴ (حفظ نسبِ هیو) — پذیرش S1.7: L همه‌ی پیکسل‌های حلقه در باند
    const l0 = lum(c[0], c[1], c[2]) || 1, kk = Math.min(OL_MAX, Math.max(OL_MIN, l0)) / l0;
    ring.push(i, Math.round(c[0] * kk), Math.round(c[1] * kk), Math.round(c[2] * kk));
  }
  const rp2 = s.ringPx || (s.ringPx = []);                 // نشانه‌گذاری: قفل پالت این‌ها را معاف کند
  for (let k = 0; k < ring.length; k += 4) {
    const i = ring[k];
    d[i] = ring[k + 1]; d[i + 1] = ring[k + 2]; d[i + 2] = ring[k + 3]; d[i + 3] = ra;
    rp2.push(i);
  }
  return s;
}

// اجسام صحنه (سازه‌ها): در بافت موقتِ شفاف کشیده می‌شوند → outline → over روی صحنه
export function bakeOutline(r, x0, y0, w, h, draw, opt) {
  const t = new Raster(w, h);
  const p = {
    px: (x, y, c) => t.px(x - x0, y - y0, c),
    rect: (x, y, ww, hh, c) => t.rect(x - x0, y - y0, ww, hh, c),
    line: (ax, ay, bx, by, c) => t.line(ax - x0, ay - y0, bx - x0, by - y0, c),
    ellipse: (x, y, rx, ry, c) => t.ellipse(x - x0, y - y0, rx, ry, c),
    get: (x, y) => t.get(x - x0, y - y0),
  };
  draw(p);
  inkOutline(t, opt || { mode: 'sel' });
  t.over(r, x0, y0);
}
