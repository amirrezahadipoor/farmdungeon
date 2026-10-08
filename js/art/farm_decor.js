// art/farm_decor.js — دکور زنده‌ی مزرعه: گل‌های مرتع، چمن بلند، سنگ‌ریزه،
// اسپارکل محصول رسیده، گرداب جادویی دروازه، نیلوفر و نیزار آب
import { E } from './palette_env.js';
import { bakeOutline } from './outline.js'; // S5.3: تابلوی فروش هم outline یکدست گرفت

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
// ---------- S5.4: حیاتِ حوضچه (نیلوفر/نی) — قالبِ ثابت روی ۹ تایلِ حوضچه (۲۶..۲۸ × ۱۵..۱۷) ----------
// قاعده‌ها: هیچ جزءِ < ۲px (بریدگیِ نیلوفر با «نکشیدن» ساخته می‌شود، نه پاک‌کردن) · رنگ‌ها همه از رمپ
// · تابِ ۲حالته‌ی کوانتیزه (~۱٫۴s) ⇒ آرامشِ آب در بودجه‌ی ۱٪
// ردیفِ میانی (y=16) عمداً باز می‌ماند: مسیرِ شنا/جهشِ ماهی از میانِ آبِ آزاد می‌گذرد
// ⇒ سایه و پرش هیچ‌وقت روی نیلوفر/نی نمی‌افتد و رنگِ گیاهان را تکه‌تکه (۱px) نمی‌کند
const POND_LIFE = { '26,15': 'r', '27,15': 'l', '28,15': 'r', '26,17': 'l', '27,17': 'l', '28,17': 'r' };
const LIFE_C = {
  pad: rp('leaf', 4), padHi: rp('leaf', 5), padSh: rp('leaf', 2),
  stem: rp('grass', 3), stemHi: rp('grass', 4), tassel: rp('sand', 5), tasselHi: rp('gold', 5),
  bloomA: rp('clothRed', 6), bloomB: rp('clothRed', 5),
};
const _sway = (time, k) => (Math.floor(time * 0.7 + k) % 2);          // تابِ کوانتیزه: ۰/۱

function lilyPad(r, sx, sy, k, time) {                                // برگِ ۴×۳ با بریدگیِ گوه‌ای + شکوفه‌ی ۲px
  const x = sx + 3 + ((k * 4 + 1) % 8), y = sy + 3 + ((k * 5 + 2) % 8);
  const flip = (k + Math.floor(time * 0.3)) & 1;                      // جهتِ بریدگی آرام عوض می‌شود
  r.rect(x, y, 4, 1, LIFE_C.padHi);                                   // ردیفِ بالا (۴px، لبهٔ روشن)
  r.rect(flip ? x : x + 1, y + 2, 3, 1, LIFE_C.padSh);                // ردیفِ پایین (۳px، سایه) — گوه سمتِ مقابل
  r.rect(x + (flip ? 0 : 0), y + 1, 3, 1, LIFE_C.pad);                // ردیفِ میانی: ۳px ⇒ بریدگیِ ۱px در یک سر
  r.rect(x + (flip ? 3 : 0), y, 1, 2, LIFE_C.padSh);                  // لبهٔ تیره‌ی سرِ بریدگی (جفتِ عمودیِ ۲px)
  r.rect(x + 1, y - 2, 2, 1, LIFE_C.bloomB); r.rect(x + 1, y - 1, 2, 1, LIFE_C.bloomA); // شکوفه: ۲×۲ (هر رنگ جفتِ ۲px)
}

function reedClump(r, sx, sy, k, time) {                              // خوشه‌ی ۳ ساقه (۳–۵px) + کلاله‌ی ۲px
  const bx = sx + 2 + ((k * 5) % 7), by = sy + 13, sw = _sway(time, k);
  const STEMS = [[0, 5, 0], [2, 4, 1], [4, 3, 0]];                    // [افستِ x، ارتفاع، تاب‌خوردن]
  for (const [dx, h, bend] of STEMS) {
    const x = bx + dx, top = by - h, sh = bend ? sw : 0;
    r.rect(x + sh, top, 1, h, bend ? LIFE_C.stemHi : LIFE_C.stem);
    if (sh) r.px(x + sh, top - 1, LIFE_C.stemHi);                     // ادامهٔ تابِ ۱px (جزءِ ≥۲px با ساقه)
  }
  r.rect(bx, by - 6, 2, 1, LIFE_C.tasselHi);                          // کلاله‌ی ساقهٔ بلند (جفتِ ۲px)
  r.rect(bx + 2 - (1 - sw), by - 5, 2, 1, LIFE_C.tassel);             // کلالهٔ ساقهٔ میانی (جفت)
  r.rect(bx + 4, by - 4, 2, 1, LIFE_C.tasselHi);                      // کلالهٔ ساقهٔ کوتاه (جفت)
}

export function drawWaterLife(r, sx, sy, tx, ty, time = 0) {
  const kind = POND_LIFE[tx + ',' + ty];
  if (!kind) return;
  const k = Math.floor(hash(tx * 11 + 3, ty * 13 + 7) * 3);
  if (kind === 'l') lilyPad(r, sx, sy, k, time); else reedClump(r, sx, sy, k, time);
}


// تابلوی «فروشی» باغ شمالی: تیر چوبی + تخته با سکه (ن۳۶: پالس درخشش حذف — سکه کافی است)
export function drawSaleSign(r, sx, sy, time) { // S5.3: outline یکدست + قابِ تخته + سایه‌ی تماسی
  return bakeOutline(r, sx + 2, sy + 1, 12, 16, (r) => {
    r.rect(sx + 7, sy + 9, 2, 6, E.woodSh);           // تیر
    r.rect(sx + 7, sy + 9, 1, 6, E.wood);
    r.rect(sx + 6, sy + 15, 4, 1, E.soilSh);          // سایه‌ی تماسیِ تیر
    r.rect(sx + 3, sy + 2, 10, 7, E.woodSh);          // قابِ تخته
    r.rect(sx + 4, sy + 3, 8, 5, E.wood);             // تخته
    r.rect(sx + 4, sy + 3, 8, 1, E.woodHi); r.px(sx + 4, sy + 7, E.woodSh); r.px(sx + 11, sy + 4, E.woodSh);
    r.rect(sx + 5, sy + 4, 6, 3, E.soilSh);           // زمینه‌ی تیره
    r.rect(sx + 6, sy + 5, 4, 2, E.gold);             // سکه
    r.px(sx + 6, sy + 5, E.white); r.px(sx + 9, sy + 6, E.wheatSh);
  }, { mode: 'ink' });
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
