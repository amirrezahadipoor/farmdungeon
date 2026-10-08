// art/brick.js — نمای آجریِ دیوارِ دانجن (S3.3) + بافتِ رویه‌ی توده
// سه الگو per تم؛ انتخاب از هشِ **جهانی** per ردیفِ دیوار ⇒ دیوارِ دراز تکراری نمی‌شود (درس ۴۰/۴۹)
// قانونِ تُن (درس ۵۵): هر گذر یک پله ⇒ ملات=deep · رویه=brick · هایلایت=brickHi (ΔL≈۱۳)
// همه‌ی مختصاتِ dither/hash **جهانی** هستند ⇒ الگو از مرزِ تایل رد می‌شود و درزِ ۱۶px ساخته نمی‌شود
import { TILE } from './palette_env.js';
import { rp } from './ramps.js';
import { hash2 } from './noise.js';
import { BAYER4, bayer4 } from './dither.js';

// همان بایرِ ۴×۴ خودِ dither.js، به‌شکلِ جدول (بی‌فراخوانی در مسیرِ داغ): ایندکس = (y&3)<<2 | (x&3)
// ۴×۴ به‌جای ۲×۲: در ۲۵٪/۵۰٪ خوشه‌ی **۲ پیکسلی** می‌دهد نه شطرنجیِ تک‌پیکسلی (اصلِ «بدون نویز تک‌پیکسلی»)
const BAY4 = new Float32Array(16);
for (let i = 0; i < 16; i++) BAY4[i] = (BAYER4[i] + 0.5) / 16;

export const FACE_TOP = 4;                 // بالای نوارِ نما (درست زیرِ کلاهک)
export const FACE_BOT = 14;                // پایینِ نوار — ردیفِ ۱۵ = لبه‌ی روشنِ پایه (S3.5: مالکیتِ S3.3)
export const TORCH_MOD = 4, TORCH_X = 7, TORCH_Y = 6; // نقطه‌ی نصبِ مشعل: تایل‌های نما با tx%4===0 (S3.7)

// ۰ رانینگ‌باندِ درشت (آجر ۱۱×۶) · ۱ سنگ‌تراشِ بزرگ (بلوک ۱۶×۸) · ۲ آجر + ستون‌چین
// گامِ عرض باید **ناسازگار با ۱۶** (یا با فازِ جهانی همراه) باشد: گام ۸ ⇒ دو درزِ همیشگی در هر تایل
// ⇒ مرزِ تایل درزخیزتر از درون می‌شد (درس ۴۰). گامِ بزرگ‌تر (۱۱/۱۶) هم آجر را درشت‌تر می‌کند (خواسته‌ی نشست)
const PAT = [
  { pitch: 11, jit: 3, h: 6, pil: 0 },
  { pitch: 16, jit: 3, h: 8, pil: 0 },
  { pitch: 11, jit: 3, h: 6, pil: 10 },   // ستون‌چین در ستون‌های ۱۰..۱۳ — روی ۱۵ نمی‌نشیند وگرنه مرزِ تایل همیشه درز می‌شد
];
// الگو **per ردیفِ دیوار** انتخاب می‌شود نه per تایل: رج‌های افقی در امتدادِ دیوار پیوسته می‌مانند
export function pickPattern(tx, ty, theme) {
  const k = Math.floor(hash2(tx * 3 + 1, ty * 7 + theme * 131, 71) * PAT.length);
  return PAT[k < PAT.length ? k : PAT.length - 1];
}
// نسبتِ ditherِ رویه‌ی هر آجر (بایر ۲×۲ ⇒ خوشه‌ی ۲px، درس ۳): یک‌چهارمِ آجرها صاف می‌مانند،
// بقیه دانه می‌خورند ⇒ بافتِ واقعی روی نما (فاصله‌ی اصلی با استاردیو در بازبینیِ R2 همین بود)
const MIX = [0, 0.25, 0.5, 0.5];
let BMAX = 1; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) BMAX = Math.max(BMAX, bayer4(x, y));
// لغزشِ درزِ قائم از هشِ جهانیِ «اندیسِ آجر × اندیسِ رج» ⇒ عرضِ آجر ۴..۱۲px و هیچ درزی روی مرزِ ۱۶px ثابت نمی‌شود
const jv = (i, ci, jit) => Math.round((hash2(i * 13 + 7, ci * 29 + 3, 5) - 0.5) * 2 * jit);
// درزهای شبکه‌ی بلوکِ رویه: گام ۱۱/۱۳ **ناسازگار با ۱۶** ⇒ درزها در [۰،۱۶) یکنواخت می‌چرخند و
// هیچ‌وقت روی مرزِ تایل ثابت نمی‌نشینند (گامِ ۱۶ با لغزشِ ±۳ همان بلا را سرِ M6 آورد: ۲٫۸۵)
const PX = 11, PY = 13;
const seamX = (i) => i * PX + Math.round((hash2(i * 17 + 3, 41, 7) - 0.5) * 6);
const seamY = (j) => j * PY + Math.round((hash2(j * 23 + 5, 43, 11) - 0.5) * 6);

// ---------- نما (front face): تایلِ دیواری که جنوبش باز است ----------
export function drawFront(r, ox, oy, P, theme, tx, ty, pat) {
  const face = P.brick, hi = P.brickHi, mor = P.deep, brk = P.brickOut;
  const H = FACE_BOT - FACE_TOP + 1;
  r.rect(ox, oy + FACE_TOP, TILE, H, face);
  const { pitch, jit, h, pil } = pat;
  const voff = (ty * 5 + theme * 3) % h;                       // فازِ عمودی per ردیفِ نقشه (دیوارِ هم‌ستون)
  for (let top = FACE_TOP + voff; top <= FACE_BOT; top += h) {
    const bot = Math.min(FACE_BOT, top + h - 1), hh = bot - top;
    const ci = ty * 5 + top;                                   // شناسه‌ی رج (کلیدِ هشِ لغزش/تُن)
    // فازِ جهانیِ رج (۰..pitch): بدون آن، pitch|۱۶ ⇒ درزها همیشه نزدیکِ x=۰/۱۵ می‌نشستند
    // و مرزِ تایل درزخیزتر از درون می‌شد (M6 دیوار ۱٫۴۳)؛ با فاز، درزها در [۰،۱۶) یکنواخت پخش می‌شوند
    const ph0 = Math.floor(hash2(ci, 3, 71) * pitch);
    const i0 = Math.floor((tx * TILE - ph0) / pitch) - 1;
    for (let i = i0; i <= i0 + Math.ceil(TILE / pitch) + 1; i++) {
      const lx0 = i * pitch + jv(i, ci, jit) + ph0 - tx * TILE;
      const lx1 = (i + 1) * pitch + jv(i + 1, ci, jit) + ph0 - tx * TILE - 1;
      const a = Math.max(0, lx0), b = Math.min(TILE - 1, lx1);
      const mix = MIX[Math.floor(hash2(i * 7 + 1, ci * 11 + 5, 9) * MIX.length)];
      if (hh > 0 && b >= a) {
        if (mix > 0) { // نوشتنِ مستقیم در بافر (بدون r.px): مسیرِ داغِ پخت — بounds از قبل درونِ تایل است
          const d = r.d, W = r.w, y0 = oy + top + 1;
          for (let y = 0; y < hh; y++) {
            const row = ((y0 + y) & 3) << 2;
            let k = ((y0 + y) * W + ox + a) * 4;
            for (let x = a; x <= b; x++, k += 4) if (BAY4[row | ((ox + x) & 3)] < mix) {
              d[k] = hi[0]; d[k + 1] = hi[1]; d[k + 2] = hi[2];
            }
          }
        }
        r.rect(ox + a, oy + top + 1, b - a + 1, 1, hi);         // هایلایتِ لبه‌ی بالا-چپِ آجر
      }
      if (lx1 >= 0 && lx1 <= TILE - 1) r.rect(ox + lx1, oy + top, 1, hh + 1, mor);   // درزِ قائمِ ملات
    }
    r.rect(ox, oy + top, TILE, 1, mor);                         // درزِ افقی (رجِ ملات)
  }
  if (pil && tx % 2 === 0) { // ستون‌چین: هر ۳۲px یک‌بار (نه هر تایل ⇒ شبکه‌ی ۱۶px نمی‌سازد)
    r.rect(ox + pil, oy + FACE_TOP, 1, H, hi);
    r.rect(ox + pil + 1, oy + FACE_TOP, 2, H, face);
    r.rect(ox + pil + 3, oy + FACE_TOP, 1, H, mor);
    r.rect(ox + pil - 1, oy + FACE_TOP, 4, 1, P.cap);          // سرستون
    r.rect(ox + pil - 1, oy + FACE_BOT, 4, 1, mor);            // پاستون
  }
  if (hash2(tx, ty, 17) < 0.34) { // لکه‌ی نم/اشک‌ریز زیرِ کلاهک — خوشه‌ی ۱×۳
    const sx = 2 + Math.floor(hash2(tx * 3, ty, 19) * 12);
    r.rect(ox + sx, oy + FACE_TOP + 1, 1, 3, brk);
  }
  if (hash2(tx, ty, 23) < 0.30) { // ترکِ ملات — خوشه‌ی ۳pxِ کج
    const sx = 3 + Math.floor(hash2(tx, ty * 5, 29) * 10), sy = 6 + Math.floor(hash2(tx * 7, ty, 31) * 6);
    const d = hash2(tx, ty, 37) < 0.5 ? 1 : -1;
    r.px(ox + sx, oy + sy, brk); r.px(ox + sx + d, oy + sy + 1, brk); r.px(ox + sx, oy + sy + 2, brk);
  }
  r.rect(ox, oy + FACE_BOT + 1, TILE, 1, hi);                  // لبه‌ی روشنِ پایه (S3.5: از drawDungeonDepth منتقل شد)
  if (tx % TORCH_MOD === 0) { // پایه‌ی آهنیِ مشعل (نقطه‌ی نصبِ ثابت برای S3.7)
    const m0 = rp('metal', 1), m1 = rp('metal', 2), m2 = rp('metal', 4);
    r.rect(ox + TORCH_X, oy + TORCH_Y, 2, 1, m2);
    r.rect(ox + TORCH_X + 1, oy + TORCH_Y + 1, 1, 2, m1);
    r.px(ox + TORCH_X, oy + TORCH_Y + 3, m0);
    r.px(ox + TORCH_X + 2, oy + TORCH_Y + 1, m0);
  }
}

// ---------- رویه‌ی توده (top face): همان S3.2 + بافتِ جهان‌مبنا (واریانتِ c.v فقط ۴ حالت داشت ⇒ M7=۲۶٪) ----------
export function drawTopFace(r, ox, oy, P, theme, tx, ty, dep) {
  const base = P.deep, dark = P.brickOut;
  r.rect(ox, oy, TILE, TILE, base);
  if (dep >= 3) r.rect(ox, oy, TILE, TILE, dark);
  else for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++)
    if (bayer4(x, y) * 4 >= BMAX * (dep === 2 ? 2 : 3)) r.px(ox + x, oy + y, dark);
  // بلوک‌های رویه روی شبکه‌ی جهانی؛ برش به مربعِ تایل (تقاطع) ⇒ نه بلوکی به تایلِ همسایه
  // (احتمالاً کف!) بیرون می‌زند، نه لبه‌ی بلوک روی مرزِ ۱۶px می‌نشیند (درس ۴۰/۵۴)
  const up = dep >= 3 ? P.deep : P.brick, dn = dep >= 3 ? dark : base;   // همیشه یک پله (درس ۵۵)
  const i0 = Math.floor((tx * TILE - 4) / PX) - 1, i1 = Math.floor((tx * TILE + TILE + 3) / PX) + 1;
  const j0 = Math.floor((ty * TILE - 4) / PY) - 1, j1 = Math.floor((ty * TILE + TILE + 3) / PY) + 1;
  for (let i = i0; i <= i1; i++) {
    const a = Math.max(0, seamX(i) + 1 - ox), b = Math.min(TILE - 1, seamX(i + 1) - 1 - ox);
    if (b < a) continue;
    for (let j = j0; j <= j1; j++) {
      const c = Math.max(0, seamY(j) + 1 - oy), e = Math.min(TILE - 1, seamY(j + 1) - 1 - oy);
      if (e < c) continue;
      r.rect(ox + a, oy + c, b - a + 1, e - c + 1, hash2(i * 7 + 1, j * 13 + 5, 61) < 0.40 ? up : dn);
    }
  }
}
