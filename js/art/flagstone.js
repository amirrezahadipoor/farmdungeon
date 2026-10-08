// art/flagstone.js — سنگ‌فرشِ مقیاس-جهانِ کفِ دانجن (S3.4)
// مسئله‌ی قبلی: هر تایلِ کف آجرچینیِ خودش را داشت (بِوِل ۱px + صلیبِ ۸×۸) ⇒ شبکه‌ی ۱۶px و M6 ضعیف.
// راهِ‌حل: اسلب‌های نامنظمِ ۱–۲ تایلی (۱۶..۳۳px) روی شبکه‌ی **جهانی** با جیترِ هش ⇒ درزها از مرزِ تایل رد می‌شوند
// و هیچ‌چیز به شبکه‌ی ۱۶px گره نمی‌خورد (درس ۴۰/۴۹).
// قانونِ تُن (درس ۵۵): هر گذر یک پله — بدنه = پله‌ی ۳ یا ۴ رمپِ سنگِ تم، لبه‌ی بالا-چپ = +۱ پله، پایین-راست = −۱ پله.
// میانگینِ تُن = همان ۵۲/۶۵ قبلی (۵۰/۵۰) ⇒ خواناییِ موب‌ها (M1) دست‌نخورده می‌ماند.
// همه‌ی مختصاتِ هش/dither **جهانی**‌اند؛ ترک‌ها خط جهانی‌اند و از مرزِ تایل رد می‌شوند. کاملاً قطعی.
import { TILE, WORLD_W, WORLD_H } from './palette_env.js';
import { DPAL } from './ground.js';
import { hash2 } from './noise.js';
import { bayer4 } from './dither.js';

const CH = 20;                                        // ارتفاعِ پایه‌ی رگه (کورس)
const courseTop = (j) => j * CH + Math.round((hash2(j, 17, 91) - 0.5) * 7); // ۱۷..۲۳
// عرضِ اسلب: ۱۶..۲۱؛ با احتمالِ ۲۵٪ ادغام تا ۳۳px ⇒ «۱–۲ تایلی»
const slabW = (k, j) => 16 + Math.floor(hash2(k, j * 31 + 7, 95) * 6);
// متادیتای اسلب — هوکِ تستِ عددی (S3.4): تُنِ بدنه (۳/۴) + واریانتِ سطح (۰..۷)
function slabMeta(k, j) {
  return { t: hash2(k * 5 + 1, j * 13 + 3, 101) < 0.5 ? 3 : 4, v: Math.floor(hash2(k * 3 + 7, j * 29 + 5, 103) * 8) };
}
export const FLAG = { CH, courseTop, slabW, slabMeta };

function paintSlab(r, D, P, floor, xa, ya, xb, yb, j, k, theme) {
  const w = xb - xa + 1, h = yb - ya + 1;
  // بدنه: پله‌ی ۳ (floorA) یا ۴ (floorB) — ۵۰/۵۰
  const meta = slabMeta(k, j), t = meta.t, v = meta.v;
  const tone = t === 3 ? P.floorA : P.floorB;
  const hi = t === 3 ? P.floorB : P.stone;            // +۱ پله
  const sh = t === 3 ? P.mortar : P.floorA;           // −۱ پله
  const ops = [[xa, ya, w, h, tone], [xa, ya, w, 1, hi], [xa, ya, 1, h, hi], [xa, yb, w, 1, sh], [xb, ya, 1, h, sh]];
  const hh = (a, b, s) => hash2(a, b, s);
  if (v === 1) { // دانه‌بندی: خوشه‌های ۲px (اصلِ «بدون نویزِ تک‌پیکسلی»)
    for (let i = 0; i < 3; i++) {
      const px = xa + 2 + Math.floor(hh(k, i + 1, 111) * Math.max(1, w - 5)), py = ya + 2 + Math.floor(hh(i + 1, k, 113) * Math.max(1, h - 5));
      if (i % 2) ops.push([px, py, 2, 1, hi]); else ops.push([px, py, 1, 2, sh]);
    }
  } else if (v === 2) { // ساییده: ۳ خوشه‌ی ۲×۲ تیره + یک هایلایت
    for (let i = 0; i < 3; i++) {
      const px = xa + 1 + Math.floor(hh(k * 3, i + 5, 115) * Math.max(1, w - 3)), py = ya + 1 + Math.floor(hh(i + 5, k * 3, 117) * Math.max(1, h - 3));
      ops.push([px, py, 2, 2, sh]);
    }
    ops.push([xa + 2 + Math.floor(hh(k, 9, 119) * Math.max(1, w - 4)), ya + 2 + Math.floor(hh(9, k, 121) * Math.max(1, h - 4)), 1, 1, hi]);
  } else if (v === 3) { // ترکِ پیوسته: مسیرِ جهانی از لبه‌ی بالا-چپ به داخل ⇒ از مرزِ تایل رد می‌شود
    let cx = xa + 1 + Math.floor(hh(k, j, 123) * Math.max(1, w * 0.4));
    let cy = ya + 1;
    const steps = Math.min(14, Math.max(6, h - 2));
    for (let s = 0; s < steps && cy <= yb; s++) {
      ops.push([cx, cy, 1, 1, sh]);
      const r = hh(k * 7 + s, j * 11, 125);
      if (r < 0.34 && cx > xa + 1) cx--; else if (r > 0.72 && cx < xb - 1) cx++;
      cy++;
      if (hh(s, k, 127) < 0.22 && cx < xb - 1) ops.push([++cx, cy, 1, 1, sh]);
    }
    ops.push([cx, Math.min(yb, cy), 1, 1, hi]);        // نور روی لبه‌ی ترک
  } else if (v === 4) { // کندگیِ گوشه: ۳×۲ تیره + پیکسلِ روشن
    const cr = Math.floor(hh(k, j * 3 + 1, 129) * 4);  // ۴ گوشه
    const cx = (cr & 1) ? xb : xa, cy = (cr & 2) ? yb : ya;
    const dx = (cr & 1) ? -1 : 1, dy = (cr & 2) ? -1 : 1;
    ops.push([Math.min(cx, cx + 2 * dx), Math.min(cy, cy + dy), 2, 2, sh]);
    ops.push([cx + 3 * dx, cy + 2 * dy, 1, 1, sh]);
    ops.push([cx, cy + 2 * dy, 1, 1, hi]);
  } else if (v === 5) { // دو تُن: نیمه‌ی پایین یک پله تیره‌تر (مرزِ دندانه‌ای)
    const mid = ya + Math.ceil(h / 2) + Math.round((hh(k, j, 131) - 0.5) * 3);
    for (let x = xa; x <= xb; x += 4) {
      const m2 = mid + Math.round((hh(x, j * 5, 133) - 0.5) * 2);
      if (m2 > ya && m2 <= yb) ops.push([x, m2, Math.min(4, xb - x + 1), yb - m2, sh]);
    }
  } else if (v === 6) { // لکه‌ی تم (خزه/گدازه/یخ): خوشه‌ی ۲×۲ + پیکسلِ مجاور
    const px = xa + 2 + Math.floor(hh(k, j + 3, 135) * Math.max(1, w - 4)), py = ya + 2 + Math.floor(hh(j + 3, k, 137) * Math.max(1, h - 4));
    ops.push([px, py, 2, 2, P.mossD]);
    ops.push([px + 2, py, 1, 1, P.moss]);
  } else if (v === 7) { // ریگ: سه پیکسلِ تک (روشن/میانی/تیره)
    const px = xa + 2 + Math.floor(hh(k * 11, j, 139) * Math.max(1, w - 4)), py = ya + 2 + Math.floor(hh(j, k * 11, 141) * Math.max(1, h - 4));
    ops.push([px, py, 1, 1, sh]); ops.push([px + 2, py + 1, 1, 1, hi]); ops.push([px + 1, py + 2, 1, 1, sh]);
  }
  // ترسیم به‌ازای هر تایلِ کفِ هم‌پوشان (کلیپ ⇒ هرگز روی دیوار/آب نمی‌رود)
  const t0x = Math.max(0, (xa / TILE) | 0), t1x = Math.min((WORLD_W / TILE) - 1, (xb / TILE) | 0);
  const t0y = Math.max(0, (ya / TILE) | 0), t1y = Math.min((WORLD_H / TILE) - 1, (yb / TILE) | 0);
  for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
    if (!floor(tx, ty)) continue;
    const X0 = tx * TILE, Y0 = ty * TILE, X1 = X0 + TILE - 1, Y1 = Y0 + TILE - 1;
    for (let o = 0; o < ops.length; o++) {
      const op = ops[o];
      if (op[0] > X1 || op[0] + op[2] - 1 < X0 || op[1] > Y1 || op[1] + op[3] - 1 < Y0) continue; // AABB
      const x0 = Math.max(op[0], X0, xa), y0 = Math.max(op[1], Y0, ya);
      const x1 = Math.min(op[0] + op[2] - 1, X1, xb), y1 = Math.min(op[1] + op[3] - 1, Y1, yb);
      if (x1 < x0 || y1 < y0) continue;
      r.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, op[4]);
    }
  }
  return v;
}

export function drawFlagstones(r, D, theme) {
  const P = DPAL(theme | 0);
  const floor = (tx, ty) => { const c = D.cell(tx, ty); return !!c && c.kind === 'dfloor'; };
  for (let j = -1; ; j++) {
    const ya = courseTop(j), yb = courseTop(j + 1) - 1;
    if (ya >= WORLD_H) break;
    if (yb < 0) continue;
    let xa = Math.round(hash2(j, 23, 93) * 40) - 44;   // فازِ هر رگه ⇒ رگه‌چینیِ آجری (نه شبکه‌ی ستونی)
    let k = 0;
    while (xa < WORLD_W) {
      const w1 = slabW(k, j), w2 = slabW(k + 1, j);
      const w = (hash2(k, j * 37 + 11, 97) < 0.25 && w1 + w2 <= 33) ? w1 + w2 : w1;
      paintSlab(r, D, P, floor, xa, ya, xa + w - 1, yb, j, k, theme | 0);
      xa += w; k++;
    }
  }
}
