// art/dungeon_depth.js — AO کف و سایه‌های تماسی (S3.5؛ جایگزینِ کاملِ drawDungeonDepth ن۳۲)
// ۱) نوارِ ۴px با گرادیان Bayer روی کفِ مجاورِ دیوار — اضلاعِ **جنوب/شرق/غرب** دیوار
//    (کفِ زیرِ دیوار، کفِ شرقِ دیوار، کفِ غربِ دیوار) و گوشه‌های داخلی یک پله تیره‌تر.
// ۲) سایه‌ی تماسیِ SE زیرِ ستون/صندوق و لکه‌ی زیرِ مشعل (۲–۳px).
// قواعد: مختصاتِ dither **جهانی** ⇒ الگو از مرزِ تایل رد می‌شود (درس ۴۰) · همه پیکسل‌ها opaque
// (پذیرش: صفر پیکسلِ شفاف) · ≤۵ سطح روشنایی: ۴ پله‌ی پوشش + یک تُنِ گوشه — هر دو رنگ از DPAL تم.
// شدت per تم (K): دخمه ۱ · خزه ۰٫۹۵ · **گدازه ۰٫۷ (کمتر)** · یخ ۰٫۸۵ — پله‌ی صفر (درزِ تماس) همیشه solid.
import { TILE, COLS, ROWS } from './palette_env.js';
import { DPAL } from './ground.js';
import { bayer4 } from './dither.js';

export const AO_PROF = [1, 0.62, 0.3, 0.12];  // پوششِ هر پله بر حسبِ فاصله از دیوار (px)
const K = [1, 0.95, 0.7, 0.85, 1.05, 0.9]; // شدت per تم (S3.10: باتلاق/معدن)

const kindAt = (D, x, y) => { const c = D.cell(x, y); return c ? c.kind : 'wall'; };
const isWall = (D, x, y) => kindAt(D, x, y) === 'wall';
const paintable = (D, x, y) => { const k = kindAt(D, x, y); return k !== 'wall' && k !== 'pillar' && k !== 'water'; };

export function drawAO(r, D, theme) {
  const t = theme | 0, P = DPAL(t), k = K[t] ?? 1;
  const band = P.mortar, corner = P.deep;     // دو تُنِ AO (بقیه با ditherِ ترتیبی)
  const dot = (X, Y, tone, cov) => { if (cov >= 1 || bayer4(X, Y) < cov) r.px(X, Y, tone); };

  // ---------- ۱) نوارِ کفِ مجاورِ دیوار ----------
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (!paintable(D, tx, ty)) continue;
    const wN = isWall(D, tx, ty - 1), wW = isWall(D, tx - 1, ty), wE = isWall(D, tx + 1, ty);
    if (!wN && !wW && !wE) continue;
    const X0 = tx * TILE, Y0 = ty * TILE;
    if (wN) for (let py = 0; py < 4; py++) {                       // کفِ زیرِ دیوار (سایه‌ی اصلی)
      const cov = py ? AO_PROF[py] * k : 1;
      for (let px = 0; px < TILE; px++) {
        const isC = py <= 1 && ((wW && px <= 1) || (wE && px >= TILE - 2));
        dot(X0 + px, Y0 + py, isC ? corner : band, isC ? 1 : cov);   // گوشهی داخلی solid
      }
    }
    if (wW) for (let px = 0; px < 4; px++) {                       // کفِ شرقِ دیوار
      const cov = px ? AO_PROF[px] * k : 1;
      for (let py = wN ? 4 : 0; py < TILE; py++) dot(X0 + px, Y0 + py, band, cov);
    }
    if (wE) for (let px = TILE - 4; px < TILE; px++) {             // کفِ غربِ دیوار
      const d = TILE - 1 - px, cov = d ? AO_PROF[d] * k : 1;
      for (let py = wN ? 4 : 0; py < TILE; py++) dot(X0 + px, Y0 + py, band, cov);
    }
  }

  // ---------- ۲) سایه‌ی تماسیِ SE: ستون (۲px)، صندوق (۲px)، مشعل (۲–۳px) ----------
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (kindAt(D, tx, ty) !== 'pillar') continue;
    const X0 = tx * TILE, Y0 = ty * TILE;
    if (paintable(D, tx, ty + 1)) for (let i = 0; i < TILE; i++) { dot(X0 + i, Y0 + TILE, band, 0.85); dot(X0 + i, Y0 + TILE + 1, band, 0.4); }
    if (paintable(D, tx + 1, ty)) for (let i = 0; i < TILE; i++) { dot(X0 + TILE, Y0 + i, band, 0.6); dot(X0 + TILE + 1, Y0 + i, band, 0.25); }
  }
  for (const c of D.chests) {   // صندوق در ردیف‌های ۶..۱۲ کشیده می‌شود ⇒ سایه زیرِ آن + لبه‌ی راست
    const X0 = c.x * TILE, Y0 = c.y * TILE;
    for (let x = 3; x <= 13; x++) { dot(X0 + x, Y0 + 13, band, 0.8); dot(X0 + x, Y0 + 14, band, 0.35); }
    for (let y = 7; y <= 14; y++) { dot(X0 + 13, Y0 + y, band, 0.55); dot(X0 + 14, Y0 + y, band, 0.2); }
  }
  for (const t of D.torches) {  // لکه‌ی زیرِ مشعل: کمی پهن‌تر و عمیق‌تر از نوارِ عادی
    if (!paintable(D, t.x, t.y + 1)) continue;
    const cx = t.x * TILE + 8, Y0 = (t.y + 1) * TILE;
    for (let i = -3; i <= 3; i++) dot(cx + i, Y0, band, 1);
    for (let i = -2; i <= 2; i++) dot(cx + i, Y0 + 1, band, 0.85);
    for (let i = -1; i <= 1; i++) dot(cx + i, Y0 + 2, band, 0.5);
  }
}
