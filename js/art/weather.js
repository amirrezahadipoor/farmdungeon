// art/weather.js — آب‌وهوای مزرعه: باران + رعد و برق (ن۳۶: سایه‌ی ابرِ متحرک و برگِ همیشه‌ریزان حذف شدند — نویز/لکه‌ی تاریک)
import { Q } from './quality.js';
import { rp } from './ramps.js';       // S4.7: رنگ‌های گودال/چکه از رمپِ آب (پالت‌محور)
import { nearestPM } from './palette_master.js'; // S5.6: قطره/صاعقه پالت‌محور (قطعی در بارگذاری)
import { hash2 } from './noise.js';    // S4.7: جای قطعیِ گودال/چکه
import { TILE } from '../tiles.js';
// باران دوره‌ایِ قطعی است: هر ۶۰۰ ثانیه، ۷۵ ثانیه باران — و محصول‌ها را رایگان آبیاری می‌کند!

// S5.6: رنگ‌های باران/صاعقه **پیش از جدول‌ها** تعریف می‌شوند (TDZ: جدولِ DROPS در بارگذاری ساخته می‌شود)
const P_COOL = nearestPM(174, 204, 236).slice(0, 3);   // آبیِ سردِ باران → نزدیک‌ترین رنگِ پالت
const P_BRIGHT = nearestPM(244, 246, 255).slice(0, 3); // سفیدِ پاشش/صاعقه → نزدیک‌ترین رنگِ پالت
const P_LIGHT = nearestPM(150, 170, 255).slice(0, 3);  // هالهٔ آبیِ صاعقه → نزدیک‌ترین رنگِ پالت
export const RAIN_PERIOD = 600, RAIN_LEN = 75;
export const isRaining = (dayT) => { const rp = dayT % RAIN_PERIOD; return rp >= 400 && rp < 400 + RAIN_LEN; };

// ---- جدول از پیش‌محاسبه‌شده: صفر تخصیص در هر فریم ----
const N_DROP = 22; // ن۳۷: بارانِ نیمه‌سبک — ۴۶ قطره پرک شدید می‌ساخت
const DROPS = [];
for (let i = 0; i < N_DROP; i++) {
  const a = 66 + (i % 3) * 18; // ن۳۷: آلفای نرم‌تر
  DROPS.push({
    hx: ((i * 149 + 17) % 233) / 233,
    hy: ((i * 71 + 121) % 197) / 197,
    speed: 62 + (i % 4) * 16, // ن۳۷: سقوط ملایم‌تر
    // S5.6: رنگ‌های قطره از **پالت مستر** (نزدیک‌ترین رنگ به آبیِ ملایمِ باران) — آلفا همان نسخهٔ S4.7
    c1: [...P_COOL, a],
    c2: [...P_COOL, Math.round(a * 0.8)],
    c3: [...P_COOL, Math.round(a * 0.45)],
    c4: [...P_BRIGHT, Math.round(a * 0.6)],
    c5: [...P_BRIGHT, Math.round(a * 0.5)],
    splash: i % 8 === 0,
  });
}
const WR = (v, m) => ((v % m) + m) % m;

export function drawRain(r, time, n = -1) {
  if (n < 0) n = Q.level ? N_DROP : 12; // کیفیت تطبیقی
  for (let i = 0; i < n; i++) {
    const dr = DROPS[i];
    const px = Math.round(WR(dr.hx * r.w - time * 12, r.w)); // باد ملایم به چپ
    const py = Math.round(WR(dr.hy * r.h + time * dr.speed, r.h));
    r.px(px, py, dr.c1);
    r.px(px + 1, py - 1, dr.c2);
    r.px(px + 1, py - 2, dr.c3);
    if (dr.splash && py > r.h - 26) { r.px(px - 1, py + 2, dr.c4); r.px(px + 1, py + 2, dr.c5); }
  }
}

// ---- رعد و برق: در باران هر ~۹ ثانیه فلش دوتایی + صاعقه‌ی قطعی ----
export function lightningK(dayT, time) {
  if (!isRaining(dayT)) return 0;
  const ph = time % 9;
  if (ph < 0.07) return 0.8; // ن۳۷: تک‌فلاشِ نرم — استروبِ دوتایی حذف شد (پرک کل صفحه!)
  return 0;
}
// فلش: کل صحنه به سمت سفید می‌رود
export function flashTint(r, k) {
  const f = 0.26 * k; // ن۳۷: روشن‌شدگیِ ملایم به‌جای فلش سفید کامل
  for (let i = 0; i < r.d.length; i += 4) {
    if (r.d[i + 3] < 8) continue;
    r.d[i] += (255 - r.d[i]) * f;
    r.d[i + 1] += (255 - r.d[i + 1]) * f;
    r.d[i + 2] += (255 - r.d[i + 2]) * f;
  }
}
// صاعقه: زیگزاگ قطعی (هر فلش شکل خودش، بدون حالت)
export function drawLightning(r, time) {
  const seed = Math.floor(time / 9);
  const h = (n) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  let x = 30 + Math.floor(h(1) * (r.w - 60)), y = 0;
  const bottom = Math.floor(r.h * 0.55), segs = 8;
  // S5.6: هر مختصات **یک‌بار** رنگ می‌شود (مغز بر هاله اولویت دارد [عنصرِ ۰ = اولویت]) ⇒ بدونِ تیره‌شدگیِ دوبلِ نقاطِ اتصال
  // و رنگِ مبدأ بازسازی‌پذیر (بایت‌به‌بایت همان P_LIGHT/P_BRIGHT — تستِ QA).
  const pts = new Map();
  const bres = (x0, y0, x1, y1, put) => {
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, cx = x0, cy = y0;
    for (;;) { put(cx, cy); if (cx === x1 && cy === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; cx += sx; } if (e2 < dx) { err += dx; cy += sy; } }
  };
  const thick = (x0, y0, x1, y1, w, prio) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let k = -(w - 1) / 2; k <= (w - 1) / 2; k++) { const ox = Math.round(nx * k), oy = Math.round(ny * k); bres(x0 + ox, y0 + oy, x1 + ox, y1 + oy, (px, py) => { const kk = px + ',' + py; const o = pts.get(kk); if (!o || prio > o[0]) pts.set(kk, [prio, px, py]); }); }
  };
  for (let i = 0; i < segs; i++) {
    const nx = Math.max(6, Math.min(r.w - 6, x + Math.round((h(i + 2) - 0.5) * 30)));
    const ny = Math.floor(((i + 1) * bottom) / segs);
    thick(x, y, nx, ny, 4, 1);                    // هاله
    thick(x, y, nx, ny, 2, 2);                    // مغز (اولویت)
    x = nx; y = ny;
  }
  for (const v of pts.values()) r.px(v[1], v[2], v[0] === 2 ? [...P_BRIGHT, 235] : [...P_LIGHT, 55]);   // Map ⇒ value = [prio,px,py]
}

// موج‌های باران روی حوضچه — حلقه‌های ۸نقطه‌ای گسترنده و محوشونده (قطعی)
const _ripC = [...P_BRIGHT, 0];   // S5.6: حلقهٔ موجِ حوضچه از پالت (جای آبیِ خام)
export function drawPondRipples(r, time) {
  for (let i = 0; i < 4; i++) {
    const ph = (time * 0.8 + i * 0.31 + ((i * 17) % 5) / 9) % 1;
    const tx = 26 + ((i * 61 + 13) % 3), ty = 16; // S5.4: موجِ باران روی آبِ آزادِ ردیفِ میانی (نه روی نیلوفر/نی)
    const sx = tx * 16 + 8, sy = ty * 16 + 8;
    if (sx < -6 || sy < -6 || sx > r.w + 6 || sy > r.h + 6) continue;
    const rr = 1 + ph * 4;
    _ripC[3] = Math.round((1 - ph) * 95);
    const a = _ripC[3];
    if (a < 10) continue;
    const rx = Math.round(rr), ry = Math.max(1, Math.round(rr * 0.5));
    // S5.6: هر پیکسل فقط **یک‌بار** کشیده می‌شود (نگهبانِ نقطهٔ تکراری) ⇒ رنگِ مبدأ بازسازی‌پذیر و بدونِ تیره‌شدگیِ دوبل
    const put = (x, y, w2, h2) => { for (let k = 0; k < w2 * h2; k++) { const xx = x + (k % w2), yy = y + ((k / w2) | 0); if (r.get(xx, yy)[3] === 0) r.px(xx, yy, _ripC); } };
    put(sx - rx, sy - 1, 1, 2); put(sx + rx, sy - 1, 1, 2);
    put(sx - 1, sy - ry, 2, 1); put(sx - 1, sy + ry, 2, 1);
    const dx2 = Math.round(rx * 0.7), dy2 = Math.max(0, Math.round(ry * 0.7));
    put(sx - dx2, sy - dy2, 2, 1); put(sx + dx2 - 1, sy - dy2, 2, 1);
    put(sx - dx2, sy + dy2, 2, 1); put(sx + dx2 - 1, sy + dy2, 2, 1);
  }
}

// ---------- S4.7: زمینِ خیس — گودال‌های ثابتِ خاک‌راه + حلقه‌های چکه‌ی ۳ فریمی (قطعی، ≤۸ روی صفحه) ----------
const _pd = [...rp('water', 5).slice(0, 3), 226], _ph = [...rp('water', 6).slice(0, 3), 255], _pr = [...rp('water', 3).slice(0, 3), 205];
const _sp = [...rp('water', 6).slice(0, 3), 0];
export const WET_DEBUG = { splash: 0, puddle: 0 }; // QA/sheet

// گودال: روی تایلِ خاک‌راه، جای قطعی از hash (۳..۱۰px عرض، ۲px ارتفاع + هایلایتِ آسمان + ریمِ تیره)
// چکه: روی تایلِ چمنِ بدونِ محصول، چرخه‌ی ۳ فریمی (نقطه → حلقه‌ی کوچک → حلقه‌ی بزرگ) با محوشدنِ تدریجی
export function drawRainGround(r, f, x0, y0, x1, y1, cx, cy, time) {
  const fr = (time * 7) | 0;
  let sp = 0, pd = 0;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = f.cell(tx, ty); if (!c) continue;
    const sx = tx * TILE - cx, sy = ty * TILE - cy;
    if (sx < -12 || sy < -12 || sx > r.w + 4 || sy > r.h + 4) continue;
    if (c.kind === 'path' && !c.fenceH && hash2(tx, ty, 77) < 0.34) {  // گودال فقط روی خاک‌راهِ بی‌حصار
      const px = sx + 2 + ((hash2(tx, ty, 78) * 8) | 0), py = sy + 6 + ((hash2(tx, ty, 79) * 6) | 0); // وسطِ کاشی، نه لبه
      const w = 5 + ((hash2(tx, ty, 80) * 6) | 0);
      r.rect(px, py, w, 2, _pd); r.rect(px + 1, py - 1, w - 2, 1, _pd);   // بدنِ گودال (لنزِ کم‌عمق)
      r.px(px - 1, py + 1, _pr); r.px(px + w, py + 1, _pr);
      r.px(px + 1, py - 1, _ph); r.px(px + 2, py, _ph); r.px(px + w - 2, py - 1, _ph); // جلای آسمان روی لبهٔ بالا
      r.px(px, py + 2, _pr); r.px(px + w - 1, py + 2, _pr);
      pd++;
    } else if (sp < 8 && c.kind === 'grass' && !c.crop && hash2(tx, ty, 91) < 0.05) {
      const ph = (fr + ((hash2(tx, ty, 92) * 3) | 0)) % 3;   // ۳ فریم
      const px = sx + 4 + ((hash2(tx, ty, 93) * 8) | 0), py = sy + 5 + ((hash2(tx, ty, 94) * 8) | 0);
      _sp[3] = 152 - ph * 42;
      if (ph === 0) { r.px(px, py, _sp); r.px(px + 1, py + 1, _sp); }
      else { r.px(px - ph, py, _sp); r.px(px + ph, py, _sp); r.px(px, py - ph, _sp); r.px(px, py + ph, _sp); }
      sp++;
    }
  }
  WET_DEBUG.splash = sp; WET_DEBUG.puddle = pd;
}
