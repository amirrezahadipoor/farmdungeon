// art/dungeon_props.js — اجزای صحنه‌ی دانجن: مشعل (۴ فریمِ کوانتیزه)، صندوق گنج (درِ ۳ فریم)،
// محراب (رونِ تم + پالسِ ۳ حالته)، قطره‌ها (outline یکدست) + ذرات غبار — همه قطعی بر اساس زمان
import { E, TILE } from './palette_env.js';
import { rp } from './ramps.js'; // S1.4: رنگ پراپ‌ها از رمپ (مشعل/صندوق/گوهر/محراب)
import { DPAL } from './ground.js'; // S3.7: رونِ محراب از هویتِ تم

// مشعل (S3.7): بندِ آهنی در نما پخته شده (`brick.js`)؛ این‌جا **جامِ آهنی + شعله‌ی ۴ فریمِ کوانتیزه**
// + نقطه‌ی روشنِ مرکزی + ۲ جرقه‌ی کند. فریم‌ها گسسته‌اند (بدونِ درون‌یابی) ⇒ آرامشِ بصریِ محیطی.
// hook نورِ رنگیِ S4.1: رنگ/شعاع/قدرت از همین ثابت‌ها خوانده می‌شود (رفتار فعلی بی‌تغییر).
export const TORCH_LIGHT = { r: 44, st0: 157, stStep: 3, yOff: 6, c: null };
const FR_HZ = 2.4;                                            // فریمِ شعله در ثانیه (آرام)
const TF = [[4, 3, 0], [3, 4, 0], [4, 3, 1], [3, 3, -1]];     // [عرضِ بدنه، ارتفاع، جابه‌جاییِ افقی]
const F_CUP = rp('metal', 3), F_CORE = rp('fire', 6), F_EDGE = rp('fire', 2);
const F_TIP = E.white;           // نقطه‌ی روشنِ مرکزی (سفیدِ گرم — داخلِ پالتِ مستر)
const _spC = [0, 0, 0, 0];
export function drawTorches(r, D, cx, cy, time) {
  for (const t of D.torches) {
    const sx = t.x * TILE - cx, sy = t.y * TILE - cy;
    if (sx < -TILE || sy < -TILE || sx > r.w || sy > r.h) continue;
    const fr = TF[Math.floor(time * FR_HZ) & 3];  // نفسِ کندِ کوانتیزه (۲٫۴Hz) — بودجه‌ی آرامش
    const y0 = 6 - fr[1], fx = fr[2];
    r.rect(sx + 7, sy + 6, 2, 1, F_CUP);                          // جامِ آهنی روی بندِ پخته
    r.px(sx + 7, sy + 6, rp('metal', 5));
    r.rect(sx + 7 + fx, sy + y0, fr[0], fr[1], rp('fire', 4));    // بدنه‌ی شعله
    r.rect(sx + 8 + fx, sy + y0 + 1, Math.max(1, fr[0] - 2), Math.max(1, fr[1] - 1), F_CORE); // هسته
    r.px(sx + 8 + fx, sy + y0 + 1, F_TIP);                        // نقطه‌ی روشنِ مرکزی
    r.rect(sx + 7 + fx, sy + y0 + fr[1] - 1, fr[0], 1, F_EDGE);   // لبه‌ی تیره‌ی پایین
    {                                                              // جرقه‌ی تکی و کند (بودجه‌ی آرامش)
      const e = (time * 0.35 + ((t.x * 7 + t.y * 13) % 10) / 10) % 1;
      const ex = sx + 8 + Math.round(Math.sin(e * 9 + t.x) * 2);
      const ey = sy + 2 - Math.round(e * 9);
      const a = Math.round((1 - e) * 150);
      if (a > 12) { _spC[0] = 255; _spC[1] = 207; _spC[2] = 122; _spC[3] = a; r.px(ex, ey, _spC); }
    }
  }
}

// صندوق گنج (S3.7): چوبِ رگه‌دار + دو بند فلزی + قفل طلایی؛ درِ باز **۳ فریمِ کوانتیزه** (۰٫۳۳s)
// و پس از پایانِ انیمیشن کاملاً ایستا ⇒ صفر هزینه‌ی آرامش. سایه‌ی تماسیِ SE در S3.5 پخته می‌شود.
const IRON = rp('metal', 4), IRON_HI = rp('metal', 6), GOLD = rp('gold', 5), GOLD_HI = rp('gold', 6);
const WF = rp('wood', 4), WL = rp('wood', 6), WS = rp('wood', 2), INK1 = rp('ink', 1);
export function drawChests(r, D, cx, cy, time) {
  for (const c of D.chests) {
    const sx = c.x * TILE - cx, sy = c.y * TILE - cy;
    if (sx < -TILE || sy < -TILE || sx > r.w || sy > r.h) continue;
    r.rect(sx + 3, sy + 6, 10, 7, WF);            // بدنه
    r.rect(sx + 4, sy + 7, 8, 1, WS);             // رگه‌ی چوب
    r.rect(sx + 3, sy + 12, 10, 1, WS);           // لبه‌ی پایین
    r.rect(sx + 3, sy + 9, 10, 1, IRON);          // بندِ میانی
    r.px(sx + 3, sy + 9, IRON_HI); r.px(sx + 12, sy + 9, IRON_HI);
    r.rect(sx + 3, sy + 6, 1, 7, IRON); r.rect(sx + 12, sy + 6, 1, 7, IRON);
    if (c.open) {
      const f = Math.min(2, Math.floor((time - (c.openT ?? 0)) * 9));   // ۰/۱/۲ — کوانتیزه
      r.rect(sx + 4, sy + 7, 8, 4, INK1);                              // داخلِ گودال
      r.px(sx + 6, sy + 8, GOLD_HI); r.px(sx + 9, sy + 9, GOLD); r.px(sx + 8, sy + 8, WL); // براقیتِ محتوا
      const lidY = [4, 3, 2][f], lidH = [3, 2, 2][f];
      r.rect(sx + 3, sy + lidY, 10, lidH, WF);
      r.rect(sx + 3, sy + lidY, 10, 1, WL);
      r.rect(sx + 3, sy + lidY + lidH - 1, 10, 1, IRON);
      r.rect(sx + 7, sy + lidY + lidH - 1, 2, 1, GOLD);                // قفل روی لبه‌ی در
    } else {
      r.rect(sx + 3, sy + 3, 10, 4, WF);                               // درِ بسته
      r.rect(sx + 3, sy + 3, 10, 1, WL);
      r.rect(sx + 3, sy + 6, 10, 1, IRON);
      r.px(sx + 3, sy + 6, IRON_HI); r.px(sx + 12, sy + 6, IRON_HI);
      r.rect(sx + 7, sy + 4, 2, 3, GOLD); r.px(sx + 7, sy + 4, GOLD_HI); // قفل
    }
  }
}

// قطره‌ها: گوهر لوزی وجه‌دار + قلب — شناور با باب
import { ITEMS, tierCol, seedCol } from '../items.js';

export function drawDrops(r, D, cx, cy) {
  for (const d of D.drops) {
    const bob = Math.sin(d.t * 5) * 2;
    const px2 = Math.round(d.x - cx), py2 = Math.round(d.y - cy + bob);
    if (d.kind === 'seed') { // بذر: دانه‌ی دو‌رنگ کوچک با جوانه (outline یکدست)
      const c = seedCol(d.ty);
      r.rect(px2 - 2, py2 - 2, 5, 5, INK1);
      r.rect(px2 - 1, py2 - 1, 3, 3, [c[0], c[1], c[2], 255]);
      r.px(px2 - 1, py2 - 1, [Math.min(255, c[0] + 40), Math.min(255, c[1] + 40), Math.min(255, c[2] + 40), 255]);
      r.px(px2, py2 - 3, rp('leaf', 5)); r.px(px2 + 1, py2 - 4, rp('leaf', 6));
    } else if (d.kind === 'coin') { // کیسه‌ی سکه‌ی کوچک (outline یکدست)
      r.rect(px2 - 3, py2 - 4, 7, 7, INK1);
      r.rect(px2 - 2, py2 - 2, 5, 4, rp('gold', 4));
      r.rect(px2 - 2, py2 - 3, 5, 1, rp('soil', 3));
      r.px(px2 - 1, py2 - 1, rp('gold', 6)); r.px(px2 + 1, py2, rp('gold', 6));
    } else if (d.kind === 'item') { // جعبه‌ی درخشان با رنگ تیتر (outline یکدست)
      const t = ITEMS[d.id] ? ITEMS[d.id].tier : 1, tc = tierCol(t);
      r.rect(px2 - 4, py2 - 4, 9, 8, INK1);
      const glow = 120 + 60 * Math.round(Math.sin(d.t * 4) + 1);
      r.rect(px2 - 3, py2 - 3, 7, 6, rp('stoneCool', 4));
      r.rect(px2 - 3, py2 - 3, 7, 1, [tc[0], tc[1], tc[2], 255]);
      r.rect(px2 - 3, py2 + 2, 7, 1, [tc[0], tc[1], tc[2], 255]);
      r.rect(px2 - 3, py2 - 3, 1, 6, [tc[0], tc[1], tc[2], 255]);
      r.rect(px2 + 3, py2 - 3, 1, 6, [tc[0], tc[1], tc[2], 255]);
      r.px(px2, py2, [tc[0], tc[1], tc[2], glow]); r.px(px2 - 1, py2 - 1, [255, 255, 255, glow]);
      if (t === 3) { r.px(px2 - 4, py2 - 5, [255, 240, 160, glow]); r.px(px2 + 4, py2 - 4, [255, 240, 160, glow]); } // ستاره‌های تیتر۳
    } else if (d.kind === 'heart') {
      r.rect(px2 - 3, py2 - 3, 8, 7, INK1);
      r.rect(px2 - 2, py2 - 2, 2, 2, E.heart); r.rect(px2 + 1, py2 - 2, 2, 2, E.heart);
      r.rect(px2 - 2, py2, 6, 2, E.heart); r.rect(px2 - 1, py2 + 2, 4, 1, E.heart);
      r.px(px2, py2 + 3, E.heart);
      r.px(px2 - 1, py2 - 2, [242, 239, 228, 255]); // براقیت (سفید گرم — رنگ ویژه‌ی پالت)
    } else { // گوهر لوزی با وجه‌ها (outline یکدست)
      r.rect(px2 - 3, py2 - 3, 7, 7, INK1);
      r.px(px2, py2 - 3, rp('magicCyan', 6));
      r.rect(px2 - 1, py2 - 2, 3, 1, E.essence); r.rect(px2 - 2, py2 - 1, 5, 1, E.essence);
      r.rect(px2 - 2, py2, 5, 1, E.essenceSh); r.rect(px2 - 1, py2 + 1, 3, 1, E.essenceSh);
      r.px(px2, py2 + 2, E.essenceSh);
      r.px(px2 - 1, py2 - 1, rp('magicCyan', 6)); r.px(px2 + 1, py2, rp('magicCyan', 5));
    }
  }
}

// محراب باستانی (S3.7): سکوی سنگِ سه‌تُنه + **رونِ حکاکی با هویتِ تم** + گویِ نفس‌کشِ ۳ حالته (بعد از استفاده خاموش)
const _orbC = [...rp('magicCyan', 6).slice(0, 3), 0], _orbD = [...rp('magicCyan', 4).slice(0, 3), 0];
export function drawShrines(r, D, cx, cy, time) {
  const sh = D.shrine;
  if (!sh) return;
  const sx = Math.round(sh.x - cx), sy = Math.round(sh.y - cy);
  if (sx < -24 || sy < -24 || sx > r.w + 8 || sy > r.h + 8) return;
  const P = DPAL(D.theme | 0);
  r.rect(sx - 6, sy + 2, 12, 4, rp('stoneCool', 3));             // سکو
  r.rect(sx - 6, sy + 2, 12, 1, rp('stoneCool', 6));             // لبه‌ی روشنِ بالا
  r.rect(sx - 6, sy + 5, 12, 1, rp('stoneCool', 1));             // لبه‌ی تیره‌ی پایین
  r.rect(sx - 4, sy - 1, 8, 3, rp('stoneCool', 4));              // بدنه‌ی پایه
  r.rect(sx - 4, sy - 1, 8, 1, rp('stoneCool', 5));
  const b = sh.used ? 0 : Math.round(Math.sin(time * 2.4) + 1);  // 0..2 — پالسِ کوانتیزه
  const rn = sh.used ? rp('stoneCool', 2) : P.moss, rn2 = sh.used ? rp('stoneCool', 2) : P.mossD;
  r.px(sx - 2, sy + 1, rn); r.px(sx - 1, sy + 2, rn2); r.px(sx, sy + 1, rn);   // رونِ تم روی بدنه
  r.px(sx + 1, sy + 2, rn2); r.px(sx + 2, sy + 1, rn);
  if (b) r.px(sx, sy + 2, rn);                                    // نبضِ رون (پله‌ی سوم)
  if (!sh.used) {
    const b = Math.round((Math.sin(time * 2.4) + 1)); // 0..2 — نفس‌کش کوانتیزه
    _orbC[3] = 190 + 25 * b;
    _orbD[3] = 70 + 30 * b;
    r.rect(sx - 1, sy - 4, 2, 2, _orbC); // گوی
    r.px(sx - 2, sy - 3, _orbD); r.px(sx + 1, sy - 3, _orbD); // هاله
    r.px(sx - 1, sy - 5, _orbD); r.px(sx, sy - 5, _orbD);
    // مدار ذره‌ای نرم
    const oa = time * 1.6;
    r.px(sx + Math.round(Math.cos(oa) * 5), sy - 3 + Math.round(Math.sin(oa) * 3), _orbC);
    r.px(sx + Math.round(Math.cos(oa + 3.1) * 5), sy - 3 + Math.round(Math.sin(oa + 3.1) * 3), _orbD);
  } else {
    r.rect(sx - 1, sy - 4, 2, 2, rp('stoneCool', 5)); // گوی خاموش
  }
}
