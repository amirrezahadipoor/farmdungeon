// art/farm_decor.js — دکور زنده‌ی مزرعه: گل‌های مرتع، چمن بلند، سنگ‌ریزه،
// اسپارکل محصول رسیده، گرداب جادویی دروازه، نیلوفر و نیزار آب
import { E } from './palette_env.js';

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };

// اسپارکل چشمک‌زن روی محصول رسیده — از دور قابل‌دیدن
import { rp } from './ramps.js';
import { vnoise, hash2 } from './noise.js';           // S2.5: میدان‌های نویزِ جهانی (hash2 توزیعِ یکنواخت دارد؛ hash محلی سوگیریِ پایینی دارد)
import { bayer4 } from './dither.js';
import { mask8, blob47, IDX_MASK } from './autotile.js';
const _gC = [...rp('gold', 6).slice(0, 3), 0]; // اسپارکل طلایی — نفس‌کش (S1.3: رنگ از رمپ)
export function drawReadySparkle(r, sx, sy, tx, ty, time, golden = false) {
  if (golden) { // محصول طلایی: ستاره‌ی طلایی درشت همیشه‌روشن (آلفای نفس‌کش کوانتیزه)
    _gC[3] = 110 + 25 * Math.round((Math.sin(time * 1.1 + hash(tx, ty) * 6) + 1));
    const gx = sx + 4 + Math.floor(hash(tx * 5, ty * 3) * 8), gy = sy + 3;
    r.px(gx, gy, _gC); r.px(gx - 1, gy, _gC); r.px(gx + 1, gy, _gC); r.px(gx, gy - 1, _gC); r.px(gx, gy + 1, _gC); // نشانِ متقاطعِ کوچک
    return;
  }
  const ph = (time * 0.7 + hash(tx, ty) * 7) % 1; // ن۳۶: چشمکِ آرامِ تک‌رنگ (قبلش استروبِ دو رنگ ۳ هرتز!)
  if (ph >= 0.35) return;
  const px3 = sx + 4 + Math.floor(hash(tx * 5, ty * 3) * 8), py3 = sy + 2;
  r.px(px3, py3, E.white);
  if (ph > 0.08 && ph < 0.2) { r.px(px3 - 1, py3, E.white); r.px(px3 + 1, py3, E.white); }
}

// نیلوفر و نیزار روی آب — ثابت (تصادفیِ قطعی)
export function drawWaterLife(r, sx, sy, tx, ty, time = 0) {
  const h0 = hash(tx * 29, ty * 31);
  if (h0 < 0.30) { // نیلوفر آبی
    const lx = 3 + Math.floor(hash(tx * 7, ty * 13) * 9), ly = 3 + Math.floor(hash(tx * 5, ty * 17) * 9);
    r.px(sx + lx, sy + ly, E.leaf); r.px(sx + lx + 1, sy + ly, E.leafHi); r.px(sx + lx, sy + ly + 1, E.leafSh);
    r.px(sx + lx + 1, sy + ly + 1, E.leaf);
    if (h0 < 0.08) r.px(sx + lx, sy + ly - 1, E.berry); // شکوفه‌ی کوچک
  } else if (h0 < 0.42) { // نیزار (لبه)
    const rx = 2 + Math.floor(hash(tx * 3, ty * 23) * 12);
    r.px(sx + rx, sy + 13, E.grassSh); r.px(sx + rx, sy + 12, E.grassBlade); r.px(sx + rx, sy + 11, E.grassSh);
    r.px(sx + rx + 2, sy + 13, E.grassBlade); r.px(sx + rx + 2, sy + 12, E.grassSh);
  }
  // (ن۳۸: برق آب حذف — موج آرام خود تایل کافی است)
}


// تابلوی «فروشی» باغ شمالی: تیر چوبی + تخته با سکه (ن۳۶: پالس درخشش حذف — سکه کافی است)
export function drawSaleSign(r, sx, sy, time) {
  const bob = 0; // ن۳۸: تخته‌ی ثابت
  r.rect(sx + 7, sy + 9, 2, 6, E.woodSh);           // تیر
  r.rect(sx + 7, sy + 9, 1, 6, E.wood);
  r.rect(sx + 3, sy + 2 + bob, 10, 7, E.wood);      // تخته
  r.rect(sx + 3, sy + 2 + bob, 10, 1, E.woodHi);
  r.rect(sx + 3, sy + 8 + bob, 10, 1, E.woodSh);
  r.rect(sx + 4, sy + 3 + bob, 8, 5, E.soilSh);     // زمینه‌ی تیره‌ی تخته
  r.rect(sx + 6, sy + 4 + bob, 4, 3, E.gold);       // سکه
  r.px(sx + 6, sy + 4 + bob, E.white);
  r.px(sx + 9, sy + 6 + bob, E.wheatSh);
}

// ---------- S2.5: خاک‌راه ----------
// لبه‌ی راه = حاشیه‌ی چمنِ نامنظمِ ۲–۳px (از blob47) + لکه‌های خوشه‌ای + سایه‌ی تماس + بریدگیِ گوشه‌های داخلی
// همه‌ی میدان‌ها تابعِ **مختصاتِ جهانی**اند ⇒ هیچ درزی در مرزِ دو تایلِ هم‌جنس دیده نمی‌شود.
const isP = (c) => !!c && (c.kind === 'path' || c.kind === 'gate' || c.kind === 'house');
const tuftN = (gx, gy) => vnoise(gx * 0.3, gy * 0.3, 62) * 0.6 + bayer4(gx, gy) * 0.4; // همان میدانِ تافتِ S2.4
const gTone = (gx, gy) => { const n = tuftN(gx, gy); return n < 0.30 ? rp('grass', 3) : (n < 0.64 ? rp('grass', 4) : rp('grass', 5)); };
function cornerNotch(r, sx, sy, cx, cy, gx0, gy0) { // بریدگیِ مثلثیِ چمن در گوشه‌ی داخلیِ پیچِ راه
  for (let d = 0; d < 3; d++) for (let e = 0; e <= 2 - d; e++) {
    const x = cx ? 15 - e : e, y = cy ? 15 - d : d;
    r.px(sx + x, sy + y, gTone(gx0 + x, gy0 + y));
  }
}
export function drawPathEdge(r, sx, sy, tx, ty, f) {
  const m = mask8((x, y) => isP(f.cell(x, y)), tx, ty), mk = IDX_MASK[blob47(m)];
  const gx0 = tx * 16, gy0 = ty * 16, ew = (m & 4) || (m & 64), ns = (m & 1) || (m & 16); // جهتِ راه = همان واریانتِ ground.js
  // ۱) لکه‌های خوشه‌ایِ سطحِ راه (n و آستانه هر دو جهانی ⇒ پیوسته بین تایل‌ها) + اشغالِ پراکنده
  const lo = rp('dust', 3), hi = rp('dust', 5), chip = rp('dust', 2);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if ((ew && (y === 5 || y === 11)) || (ns && (x === 5 || x === 11))) continue; // رِیلِ چرخ دست‌نخورده
    const gx = gx0 + x, gy = gy0 + y, h = hash2(gx, gy, 76);
    const n = vnoise(gx * 0.42, gy * 0.42, 71) * 0.78 + bayer4(gx, gy) * 0.22, dn = vnoise(gx * 0.08, gy * 0.08, 73);
    if (h > 0.975) r.px(sx + x, sy + y, gTone(gx, gy));          // علفِ پراکنده روی خاک (dither ~۲٫۵٪)
    else if (h < 0.02) r.px(sx + x, sy + y, chip);               // خاشاک/سنگ‌ریزه‌ی تیره ~۲٪
    else if (n > 0.60 + dn * 0.06) r.px(sx + x, sy + y, lo);     // لکه‌ی کوبیده‌ی تیره
    else if (n < 0.27 - dn * 0.05) r.px(sx + x, sy + y, hi);     // لکه‌ی روشنِ خاک
  }
  // ۲) حاشیه‌ی چمن روی ضلع‌های بی‌همسایهٔ راه: عرض از هشِ مختصاتِ جهانیِ «در طولِ لبه» ⇒ لبه در طولِ راه پیوسته
  const fringe = (side, horiz, fromStart) => {
    for (let i = 0; i < 16; i++) {
      const h = hash2(side * 31 + 7, horiz ? gx0 + i : gy0 + i, 77);          // عرض از هشِ «در طولِ لبه» ⇒ لبه در طولِ راه پیوسته
      const w = 2 + (h > 0.62 ? 1 : 0);                                        // بریدگیِ ۲–۳px (~۴۰٪ سه‌پیکسلی)
      for (let d = 0; d < w; d++) {
        const x = horiz ? i : d, y = horiz ? d : i;
        r.px(sx + (fromStart ? x : 15 - x), sy + (fromStart ? y : 15 - y), gTone(gx0 + x, gy0 + y));
      }
      if (h > 0.25) { // ۳) سایه‌ی تماسِ ۱px زیرِ لبه (راه فرو‌رفته دیده می‌شود)
        const x = horiz ? i : w, y = horiz ? w : i;
        r.px(sx + (fromStart ? x : 15 - x), sy + (fromStart ? y : 15 - y), rp('dust', 3));
      }
      if (h > 0.90) { // چمنِ پراکنده روی خاکِ مجاورِ لبه (با یک پیکسل فاصله تا «عرضِ حاشیه» نشکند)
        const x = horiz ? i : w + 2, y = horiz ? w + 2 : i;
        if (!((ew && (y === 5 || y === 11)) || (ns && (x === 5 || x === 11)))) // رویِ رِیلِ چرخ نگذار
          r.px(sx + (fromStart ? x : 15 - x), sy + (fromStart ? y : 15 - y), rp('grass', 4));
      }
    }
  };
  if (!(mk & 1)) fringe(0, true, true);     // N بی‌همسایه
  if (!(mk & 16)) fringe(1, true, false);   // S
  if (!(mk & 64)) fringe(2, false, true);   // W
  if (!(mk & 4)) fringe(3, false, false);   // E
  // ۴) گوشه‌های داخلیِ پیچِ راه: قطرش راه نیست ⇒ مثلثِ چمن
  if ((m & 1) && (m & 4) && !(m & 2)) cornerNotch(r, sx, sy, 1, 0, gx0, gy0);
  if ((m & 4) && (m & 16) && !(m & 8)) cornerNotch(r, sx, sy, 1, 1, gx0, gy0);
  if ((m & 16) && (m & 64) && !(m & 32)) cornerNotch(r, sx, sy, 0, 1, gx0, gy0);
  if ((m & 64) && (m & 1) && !(m & 128)) cornerNotch(r, sx, sy, 0, 0, gx0, gy0);
}
