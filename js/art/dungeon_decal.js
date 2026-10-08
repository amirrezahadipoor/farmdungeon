// art/dungeon_decal.js — دکال‌های خوشه‌ایِ کف + فرسودگیِ لبه‌ی دیوار (S3.6)
// ۹ خانواده‌ی دکال (خزه · گودال · دود/سوختگی · ترکِ یخ · استخوان/آوار · سنگ‌ریزه + **امضاهای S3.9**: تارِ عنکبوت، ترکِ گدازه، جلای یخ)
// (جدولِ کاراکتری، درس ۶۵) و وزنِ per تم؛ جای‌گذاری: نویزِ ماکرو (fbm) × چگالیِ تم × تقویتِ نزدیکیِ دیوار.
// **ممنوعه‌ها**: هر سلولی که `dfloor` نباشد (پله/دکور/فرش/آب/دیوار/ستون خودبه‌خود حذف‌اند) + سلولِ صندوق/محراب؛
// برای «آویزان»ها سلولِ مشعل هم ممنوع است. همه‌چیز قطعی، opaque و فقط از رمپ‌های پالت (M5).
// «آویزان» = خزه/چکّه‌ی دود/یخ‌دنگ: از ردیفِ پایانیِ **نمای دیوار** (۱۵/۱۴) و ۱–۳px روی اولین ردیف‌های کف.
import { TILE, COLS, ROWS, E } from './palette_env.js'; // E: سفیدِ پالت (جلای یخ S3.9)
import { DPAL } from './ground.js';
import { hash2, fbm } from './noise.js';
import { rp } from './ramps.js';

const MACRO_F = 0.045;                          // بسامدِ نویزِ ماکرو (لکه‌های چند-تایلیِ طبیعی)

// خانواده‌ها: 0 خزه · 1 گودال · 2 دود · 3 یخ · 4 استخوان · 5 سنگ‌ریزه · 6 تارِ عنکبوت · 7 ترکِ گدازه · 8 جلای یخ
// S3.9: وزن‌ها بازچینی شد تا **هویتِ هر تم** از دکال‌ها خوانده شود: دخمه=تار/استخوان · خزه=خزه/گودال ·
// گدازه=دود/ترکِ درخشان · یخ=ترکِ یخی + جلای روشن
const W = [                                      // وزنِ per تم [t0 دخمه، t1 خزه، t2 گدازه، t3 یخ]
  [0.05, 0.08, 0.05, 0.00, 0.40, 0.27, 0.15, 0.00, 0.00],
  [0.40, 0.22, 0.04, 0.05, 0.06, 0.15, 0.08, 0.00, 0.00],
  [0.04, 0.06, 0.30, 0.00, 0.12, 0.16, 0.00, 0.32, 0.00],
  [0.00, 0.14, 0.02, 0.32, 0.05, 0.13, 0.00, 0.00, 0.46],
];
const DENS = [0.15, 0.19, 0.18, 0.19];           // چگالیِ پایه per تم (سلول‌های کف)
const HANG_P = [0.26, 0.38, 0.30, 0.30];         // احتمالِ «آویزان» per تم (روی تایل‌های نمای دیوار)
// قالب‌های کف: ≤۱۲px عرض (درس ۶۵: مبدأ + عرض ≤ ۱۴) · '=' روشن/تأکید · '-' میانی · '.' تیره · '*' جلوه
const TPL = [
  [[' == ', '===-', ' .- '], [' ==', '===', '=-=', ' . '], ['  ==', ' ===', ' .--']],                      // خزه
  [[' ---', ' =--', ' .. '], ['  == ', ' === ', ' --- ']],                                                 // گودال
  [[' .-- ', ' .--*', '  .. '], [' .. ', ' ...', ' .  '], [' ..* ', ' ... ', '  .  ']],                    // دود
  [[' -= ', ' =*=', '  -= '], ['  = ', ' =*=', ' =- ', '  .  ']],                                          // یخ
  [[' == ', '....', ' == '], [' ==-', ' ---', ' . '], ['  = ', ' === ', '  .  ']],                          // استخوان
  [[' ==.', '===.', ' .. '], [' == ', ' ==-', ' .. ']],                                                     // سنگ‌ریزه
  [['==  ', '=== ', ' == '], [' ===', ' ===', '  = ', '  . ']],                                            // تارِ عنکبوت (S3.9 — دخمه)
  [['  ======  ', ' -******- ', '  ......  '], ['   ==  ', '  =-= ', ' =-=  ', ' ==   ', ' .    '],
   ['  ==  ', ' =-=* ', '  ..  ']],                                                                         // ترکِ گدازه (S3.9 — ترکِ کشیده‌ی ۱px با هسته‌ی روشن + ریمِ تیره)
  [['  = ', ' =*=', '  = '], [' == ', '=*==', ' == ', ' .  '], [' === ', '==*==', ' === ', '  .  ']],       // جلای یخِ استاتیک (S3.9 — یخ؛ لکه‌های بزرگ‌ترِ بازتابی)
];
// رنگ‌های emissive (ترکِ گدازه) برای پاسِ نورِ S4.6 — مصرف‌کننده فقط می‌خواند
export const EMISSIVE_LAVA = [rp('fire', 5), rp('fire', 6), rp('fire', 4)];
// تُنِ هر خانواده در تمِ جاری (همه از رمپ‌ها ⇒ داخلِ پالتِ مستر)
function tones(P, theme) {
  return [
    [P.moss, P.mossD, P.deep, P.moss],                                     // خزه: هویتِ تم
    [rp('water', 5), rp('water', 3), P.deep, rp('water', 6)],              // گودال: آبِ روشن + هایلایت
    [P.brickOut, P.deep, P.deep, rp('fire', 3)],                           // دود: تیره + اخگرِ گرمِ خاکستری
    [rp('magicCyan', 6), rp('magicCyan', 4), P.stoneSh, rp('magicCyan', 6)], // یخ: ترکِ روشن + جلای فیروزه
    [rp('bone', 6), rp('bone', 4), rp('bone', 2), rp('bone', 6)],          // استخوان
    [P.stoneHi, P.stoneSh, P.deep, P.stone],                               // سنگ‌ریزه
    [rp('bone', 5), rp('bone', 4), P.stoneSh, rp('bone', 6)],              // تارِ عنکبوت: رشته‌ی خاکستری-استخوانی
    [rp('fire', 6), rp('fire', 4), rp('fire', 2), rp('fire', 5)],          // ترکِ گدازه: هسته‌ی روشن + میانی + ریمِ تیره + نقطه‌ی اخگر
    [E.white, rp('magicCyan', 5), rp('magicCyan', 3), E.white],            // جلای یخ: سفیدِ سرد روی فیروزه
  ];
}
export function drawDungeonDecals(r, D, theme) {
  const t = theme | 0, P = DPAL(t), TN = tones(P, t);
  const fams = W[t], dens = DENS[t];
  // مجموعه‌ی ممنوعه‌ها (پراپ/محراب/مشعل) — فقط سلول‌های کفِ خالی دکال می‌گیرند
  const noFloor = new Set();
  for (const c of D.chests) noFloor.add(c.y * COLS + c.x);
  if (D.shrine) noFloor.add(((D.shrine.y / TILE) | 0) * COLS + ((D.shrine.x / TILE) | 0));
  const cellK = (x, y) => { const c = D.cell(x, y); return c ? c.kind : 'wall'; };
  const isWall = (x, y) => cellK(x, y) === 'wall';
  const stamp = (g, col, x0, y0) => {
    for (let gy = 0; gy < g.length; gy++) for (let gx = 0; gx < g[gy].length; gx++) {
      const ch = g[gy][gx];
      if (ch === ' ') continue;
      r.px(x0 + gx, y0 + gy, col[ch === '=' ? 0 : ch === '-' ? 1 : ch === '.' ? 2 : 3]);
    }
  };
  // ---------- ۱) دکال‌های کف ----------
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (cellK(tx, ty) !== 'dfloor') continue;
    if (noFloor.has(ty * COLS + tx)) continue;
    const near = isWall(tx - 1, ty) || isWall(tx + 1, ty) || isWall(tx, ty - 1) || isWall(tx, ty + 1);
    const m = fbm((tx * TILE + 8) * MACRO_F, (ty * TILE + 8) * MACRO_F, 131 + t * 17, 2); // ۰..۱
    const p = dens * (0.55 + 1.15 * m) * (near ? 1.5 : 1);
    if (hash2(tx * 7 + 3, ty * 13 + 5, 137) >= p) continue;
    let sum = 0; for (let i = 0; i < fams.length; i++) sum += fams[i];       // S3.9: شمارِ خانواده‌ها پویا شد (۹)
    let u = hash2(tx * 3 + 11, ty * 5 + 7, 139) * sum;
    let f = 0; while (f < fams.length - 1 && u > fams[f]) { u -= fams[f]; f++; }
    const bank = TPL[f], g = bank[(hash2(tx * 17 + 1, ty * 19 + 2, 149) * bank.length) | 0];
    const gw = Math.max(...g.map((s) => s.length)), gh = g.length;
    const gx = tx * TILE + ((hash2(tx * 23 + 3, ty * 29 + 7, 151) * (TILE - gw - 2)) | 0) + 1;
    const gy = ty * TILE + ((hash2(tx * 31 + 5, ty * 37 + 11, 157) * (TILE - gh - 2)) | 0) + 1;
    stamp(g, TN[f], gx, gy);
  }
  // ---------- ۲) آویزان از لبه‌ی دیوار (خزه/چکّه‌ی دود/یخ‌دنگ) ----------
  const HANG = [
    [rp('bone', 5), rp('bone', 3), P.stoneSh],    // S3.9: دخمه ⇒ تارِ عنکبوتِ آویزان (قبلاً خزه‌ی سبز بود — ناهم‌خوان با دخمه)
    [P.moss, P.mossD, P.deep],                    // خزه‌ی آویزان
    [P.brickOut, rp('fire', 2), P.deep],          // S3.9: گدازه ⇒ چکّه‌ی دوده + اخگر (نوکِ گرم)
    [rp('magicCyan', 6), rp('magicCyan', 4), P.stoneHi], // یخ‌دنگ
  ][t];
  const torch = new Set(D.torches.map((q) => q.y * COLS + q.x));
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (cellK(tx, ty) !== 'wall') continue;
    if (cellK(tx, ty + 1) !== 'dfloor') continue;                                // فقط نمای «رو به کفِ خالی»
    if (torch.has(ty * COLS + tx)) continue;                                     // روی مشعل، دکال نه
    if (hash2(tx * 11 + 7, ty * 17 + 13, 163) >= HANG_P[t]) continue;
    const X0 = tx * TILE, Y0 = ty * TILE;
    const n = 2 + ((hash2(tx * 13, ty * 19, 167) * 3) | 0);                      // ۲–۴ رشته
    for (let i = 0; i < n; i++) {
      const sx = X0 + 2 + ((hash2(tx * 29 + i * 7, ty * 23 + i, 173) * 12) | 0); // ۲..۱۳ (رشته‌ی ۱px)
      const l = 1 + ((hash2(tx * 31 + i, ty * 41 + i * 3, 179) * 3) | 0);        // ۱–۳px افت
      r.px(sx, Y0 + 15, HANG[0]);
      for (let k = 0; k < l; k++) r.px(sx, Y0 + 16 + k, k === 0 ? HANG[1] : HANG[2]);
      if (hash2(tx + i * 17, ty + i * 5, 181) < 0.45) r.px(sx + 1, Y0 + 16, HANG[1]); // خوشه‌ی ۲px
    }
  }
}
