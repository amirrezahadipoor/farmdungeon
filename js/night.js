// night.js — چرخه‌ی شب/روز مزرعه: گریدینگِ ۵ کی‌فریم در یک گذرِ LUT کانالی (+ شب‌تاب‌ها جدا).
// DAY_LEN = ۳۶۰۰ ثانیه (۱ ساعت واقعی)؛ رشد محصولات مستقل از شب است و سریع می‌ماند.
// مدل: t = dayT/DAY_LEN با ۰ = ظهر؛ بینِ کی‌فریم‌ها درون‌یابی خطی می‌شود و چرخه به **۶۴ پله**
// کوانتیزه است ⇒ LUT فقط در تغییرِ پله بازسازی می‌شود (نه هر فریم) و پرشِ تدریجی رخ می‌دهد.
export const DAY_LEN = 3600;

// 0 = ظهر کامل، 1 = نیمه‌شب کامل
export function nightFactor(dayT) {
  return (1 - Math.cos(2 * Math.PI * dayT / DAY_LEN)) / 2;
}

// کی‌فریم‌ها: [t, kR, kG, kB, oR, oG, oB, gamma, sat]
//   k = بهره‌ی کانالی (رنگِ ساعت) · o = آفستِ کانالی (نور محیطی/هاله) · gamma = منحنی (شب: سایه‌قُرْقُرو، هایلایت‌نگه‌دار ⇒ خوانایی)
//   sat = اشباع (۱ = دست‌نخورده، همیشه ≤۱) — با پروکسیِ کانالِ G در همان حلقه اعمال می‌شود (LUT یک‌بعدی اشباعِ لومامحور نمی‌سازد — همان یادداشتِ S4.3)
//   sat≤۱ ⇒ ترکیبِ محدب است و خروجی خودبه‌خود در ۰..۲۵۵ می‌ماند (بدونِ clamp در مسیرِ u32)
// دو ورودیِ تکراریِ «روز» فلات می‌سازند تا نزدیکِ ظهر پاس کاملاً رد شود (هزینه‌ی صفر).
const KEYS = [
  [0.00, 1.00, 1.00, 1.00, 0, 0, 0, 1.00, 1.00], // روز — خنثی
  [0.06, 1.00, 1.00, 1.00, 0, 0, 0, 1.00, 1.00], // فلاتِ ظهر
  [0.18, 1.12, 1.00, 0.82, 10, 4, 0, 1.05, 1.00], // طلاییِ عصر (اشباع با بهرِ کانالی جبران شد)
  [0.34, 0.74, 0.66, 0.84, 12, 4, 24, 1.12, 0.94], // غروبِ بنفش-آبی
  [0.50, 0.72, 0.81, 1.06, 4, 8, 26, 1.75, 0.90], // شبِ آبیِ عمیق (گاما ۱٫۷۵ ⇒ سایه‌قُرْقُرو/هایلایت‌نگه‌دار = خواناییِ قهرمان)
  [0.82, 0.96, 0.74, 0.72, 22, 6, 8, 1.10, 1.02], // سپیدهی گرم-صورتی
  [0.95, 1.00, 1.00, 1.00, 0, 0, 0, 1.00, 1.00], // فلاتِ روز
  [1.00, 1.00, 1.00, 1.00, 0, 0, 0, 1.00, 1.00],
];
// ۶۴ پله (هر ~۵۶s): با ۳۲ پله پرشِ مرز در گذارهای تند تا ۱۴ واحد روی v=۲۰۰ می‌شد
// (خودِ پله‌ها لازم‌اند تا «تغییرِ پیکسل/فریم» زیرِ ۰٫۱٪ بماند) — بازسازی ارزان است (۲۵۶ pow).
const STEPS = 64;
const RAINK = [0.86, 0.90, 0.98], RAINS = 0.86; // باران: سردتر و کم‌اشباع‌تر — داخلِ همان LUT، نه ضربِ جدا

const _LR = new Uint8ClampedArray(256), _LG = new Uint8ClampedArray(256), _LB = new Uint8ClampedArray(256);
const P = { kr: 1, kg: 1, kb: 1, or: 0, og: 0, ob: 0, g: 1, sat: 1 };
let _q = -1, _rain = null, _id = true, _sf = 256;

const KN = [null, 'kr', 'kg', 'kb', 'or', 'og', 'ob', 'g', 'sat']; // نامِ فیلدها برای درون‌یابی (بدون تخصیصِ هر بار)

// درون‌یابیِ خطیِ کی‌فریم در گامِ کوانتیزه (qs = ۰..۱)
function _lerp(qs) {
  let i = 0;
  while (i < KEYS.length - 2 && qs >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const u = (qs - a[0]) / (b[0] - a[0]);
  for (let j = 1; j < 9; j++) P[KN[j]] = a[j] + (b[j] - a[j]) * u;
}

// بازسازیِ LUT (۳×۲۵۶) — ارزان و فقط در تغییرِ پله/باران
function _rebuild(qs, raining) {
  _lerp(qs);
  const kr = P.kr * (raining ? RAINK[0] : 1), kg = P.kg * (raining ? RAINK[1] : 1), kb = P.kb * (raining ? RAINK[2] : 1);
  const or = P.or, og = P.og, ob = P.ob, g = P.g;
  for (let v = 0; v < 256; v++) {
    const xg = Math.pow(v / 255, g) * 255;
    _LR[v] = xg * kr + or; _LG[v] = xg * kg + og; _LB[v] = xg * kb + ob;
  }
  _sf = Math.max(0, Math.min(512, Math.round((raining ? P.sat * RAINS : P.sat) * 256)));
  _id = _sf === 256 && or === 0 && og === 0 && ob === 0 && kr === 1 && kg === 1 && kb === 1 && g === 1 && !raining;
}

// اعمالِ گریدینگ (+باران) در یک گذر: LUT کانالی و — اگر لازم باشد — اشباعِ پروکسی‌محور
// S4.5: مسیرِ اصلی روی نمای ۳۲بیتیِ Raster است (۴ استخراج/بازچینش در یک کلمه ⇒ ~۳۰٪ سریع‌تر)؛
// مسیرِ بایتی برای پلتفرمِ big-endian یا بافرِ ناهم‌تراز نگه داشته می‌شود.
const _LE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

export function applyNight(r, dayT, raining = false) {
  const t = (((dayT % DAY_LEN) + DAY_LEN) % DAY_LEN) / DAY_LEN;
  const qs = Math.floor(t * STEPS) / STEPS;
  if (qs !== _q || raining !== _rain) { _rebuild(qs, raining); _q = qs; _rain = raining; }
  if (_id) return;
  const d = r.d, sf = _sf;
  const u = (_LE && r.u32 && (d.byteOffset & 3) === 0 && (d.length & 3) === 0) ? r.u32() : null;
  if (u) {
    const n = u.length;
    if (sf === 256) {
      for (let i = 0; i < n; i++) {
        const p = u[i];
        if ((p >>> 24) < 8) continue;
        u[i] = (p & 0xFF000000) | (_LB[(p >>> 16) & 255] << 16) | (_LG[(p >>> 8) & 255] << 8) | _LR[p & 255];
      }
    } else { // sat ≤ ۱ ⇒ ترکیبِ محدب: خروجی در بازه می‌ماند (بدونِ clamp)
      for (let i = 0; i < n; i++) {
        const p = u[i];
        if ((p >>> 24) < 8) continue;
        const gg = _LG[(p >>> 8) & 255];
        const nr = gg + (((_LR[p & 255] - gg) * sf) >> 8), nb = gg + (((_LB[(p >>> 16) & 255] - gg) * sf) >> 8);
        u[i] = (p & 0xFF000000) | (nb << 16) | (gg << 8) | nr;
      }
    }
    return;
  }
  if (sf === 256) {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      d[i] = _LR[d[i]]; d[i + 1] = _LG[d[i + 1]]; d[i + 2] = _LB[d[i + 2]];
    }
  } else {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const gg = _LG[d[i + 1]]; // پروکسیِ لومینانس (کانالِ G ~۰٫۵۹ وزنِ لومینانس)
      d[i] = gg + (((_LR[d[i]] - gg) * sf) >> 8);
      d[i + 1] = gg;
      d[i + 2] = gg + (((_LB[d[i + 2]] - gg) * sf) >> 8);
    }
  }
}
