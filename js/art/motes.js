// art/motes.js — S4.8: ذراتِ محیطیِ آرام (غبار/اخگرِ دانجن · گرده‌ی روزِ مزرعه)
// قاعده‌ی آرامش: ۱px با **آلفای ثابت** (۱۵۰) و حرکتِ **کوانتیزه** (پله‌های ۰٫۵s) ⇒ اختلافِ فریمِ ناشی از ذرات
// در بیشترِ فریم‌ها **صفر** و در مرزِ پله‌ها چند پیکسل (بودجهٔ S4.8: <۰٫۱٪ پیکسل/فریم · bench ≤ +۵٪).
// رنگِ *مبدأ* هر تم دقیقاً یک رنگِ پالتِ مستر است (`nearestPM`، یک‌بار کش می‌شود) ⇒ M5 بی‌آسیب.
// بدونِ تخصیص در حلقه (اسکرچِ ماژولی + ثابت‌های هشِ کش‌شده) · در Q.level=0 کاملاً خاموش.
import { Q } from './quality.js';
import { RAMP } from './ramps.js';
import { hash2 } from './noise.js';
import { nearestPM } from './palette_master.js';

export const MOTES = { on: true, dungeon: 6, farm: 4, step: 0.5 };   // سقفِ ذرات: دانجن ۶ · مزرعه ۴ (S4.8)
export const MOTE_INFO = { n: 0, px: 0 };                            // QA: شمارشِ آخرین فریم
export const MOTE_ALPHA = 150;                                       // آلفای ثابت (همه‌ی ذرات، همه‌ی تم‌ها)

// رنگِ هر تم = نزدیک‌ترین رنگِ پالت به یک پله‌ی رمپ (سنگ→خزه→گدازه→یخ→باتلاق→معدن)
const SRC = [['dust', 6], ['leaf', 6], ['fire', 5], ['bone', 7], ['leaf', 4], ['gold', 5]];
const FARM_SRC = ['gold', 7];                                        // گرده‌ی گرمِ روز
const _col = new Array(7).fill(null);                                // ۶ تم + مزرعه (کشِ رنگ‌ها)
const _px = new Array(7).fill(null);                                 // کشِ [x0,y0,speed,swayPhase] هر ذره (هش یک‌بار)
function colOf(idx) {
  let c = _col[idx];
  if (!c) {
    const [n, k] = idx === 6 ? FARM_SRC : SRC[idx];
    const a = RAMP[n], src = a[k < a.length ? k : a.length - 1];
    const p = nearestPM(src[0], src[1], src[2]);
    _col[idx] = c = [p[0], p[1], p[2], MOTE_ALPHA];
  }
  return c;
}
function pxOf(i) {
  let p = _px[i];
  if (!p) _px[i] = p = [hash2(i + 1, 11, 91), hash2(i + 1, 12, 92), 0.5 + hash2(i + 1, 13, 93) * 0.9, hash2(i + 1, 13, 93) * 6.283];
  return p;
}

// kind: 'dungeon' | 'farm' · theme: شماره‌ی تم · (cx,cy): دوربینِ کلَمپ‌شده · w/h: فریم
export function drawMotes(r, kind, theme, cx, cy, time, w, h) {
  MOTE_INFO.n = 0; MOTE_INFO.px = 0;
  if (!MOTES.on || !Q.level) return;
  const farm = kind === 'farm';
  const cap = farm ? MOTES.farm : MOTES.dungeon;
  const c = colOf(farm ? 6 : theme % 6);
  const tick = (time / MOTES.step) | 0;                              // حرکت فقط در مرزِ پله‌ها (کوانتیزه)
  const spanX = w + 48, spanY = h + 40, ox = 24, oy = 20;
  for (let i = 0; i < cap; i++) {
    const p = pxOf(i);
    const x = ((p[0] * spanX) | 0) + Math.round(Math.sin(tick * 0.35 + p[3]) * 3); // چرخشِ آرام ~۹s
    const y = (p[1] * spanY + tick * p[2]) % spanY;                  // خیزِ آهسته ۰٫۲۵–۰٫۷px/پله
    const sx = x - ox, sy = (y | 0) - oy;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    r.px(sx, sy, c);
    MOTE_INFO.n++; MOTE_INFO.px++;
  }
}
