// art/critters.js — موجودات ریز مزرعه: ماهی پرنده‌ی حوضچه + پرندگان تاج درخت‌ها
// (ن۳۶: پروانه‌ها و ۱۶ شب‌تابِ چشمک‌زن حذف شدند — پرک/نورِ بی‌دلیل)
// ماهی پرنده از حوضچه‌ی مزرعه — بدون حالت: پرش‌های دوره‌ای با قوس و پاشش آب
// حوضچه: تایل‌های water (معمولاً x∈[26,28], y∈[15,17])
import { rp } from './ramps.js';  // S5.4: رنگ‌های ماهی/آب از رمپ (پالت‌محور)

const FW = { body: rp('fire', 6), sh: rp('fire', 5), tail: rp('fire', 4), hi: rp('gold', 6), eye: rp('ink', 0) };
const WW = { far: rp('water', 1), near: rp('water', 0), ring: rp('water', 5), foam: rp('bone', 6) };
// S5.4: ماهی = سایه‌ی زیرِ آب (حرکتِ کوانتیزه) + جهشِ گاه‌به‌گاه با حلقه‌ی موج. هیچ جزءِ < ۲px نیست.
export class Fish {
  constructor(n = 2) {
    this.spots = Array.from({ length: n }, (_, i) => ({ period: 11 + i * 7, phase: i * 4.2, dir: i % 2 ? -1 : 1 }));
  }

  draw(r, cx, cy, time, farm) {
    const waters = [];
    for (const c of farm.grid) if (c.kind === 'water') waters.push(c);
    if (!waters.length) return;
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;                       // مرزهای حوضچه
    for (const w of waters) { if (w.x < x0) x0 = w.x; if (w.x > x1) x1 = w.x; if (w.y < y0) y0 = w.y; if (w.y > y1) y1 = w.y; }
    const wid = (x1 - x0 + 1) * 16, hei = (y1 - y0 + 1) * 16;
    // ---- سایهٔ زیرِ آب: رفت‌وبرگشتِ مثلثیِ کوانتیزه (۱px در ~۰٫۵s — آرامش) ----
    let leaping = false;                                             // جهش در جریان ⇒ سایه رسم نمی‌شود (همان ماهی)
    for (const sp of this.spots) if (((time + sp.phase) % sp.period) <= 1.15) leaping = true;
    const u = (time % 24) / 24, tri = u < 0.5 ? u * 2 : 2 - u * 2;
    const shx = x0 * 16 + 5 + Math.round(tri * (wid - 15)) - cx;
    const shy = y0 * 16 + Math.round(hei * 0.45) + (Math.floor(time / 24) % 2 ? 4 : 0) - cy;
    if (!leaping && shx > -12 && shy > -12 && shx < r.w + 12 && shy < r.h + 12) {
      r.rect(shx, shy, 5, 2, WW.far);                                 // بدنِ سایه (۵×۲)
      r.rect(shx + 1, shy + 1, 3, 1, WW.near);                        // شکمِ تیره (وسطِ ردیفِ پایین — سر/دُمِ بالا-روشن می‌ماند)
      r.rect(shx + (tri > 0.5 ? 6 : -2), shy + 1, 2, 1, WW.far);      // دُمِ ۲px با ۱px فاصله (جزءِ مستقلِ ≥۲px)
    }
    // ---- جهشِ گاه‌به‌گاه ----
    for (let i = 0; i < this.spots.length; i++) {
      const sp = this.spots[i];
      const cyc = (time + sp.phase) % sp.period;
      if (cyc > 1.15) continue;                                       // ~۱٫۱۵s از هر دوره
      const t = cyc / 1.15;
      const base = waters[(i * 7 + 3) % waters.length];
      const bx = base.x * 16 + 6, by = base.y * 16 + 9;               // نقطهٔ پرشِ روی سطحِ آب
      const px = Math.round(bx + sp.dir * (10 + i * 4) * t - cx);
      const py = Math.round(by - Math.sin(t * Math.PI) * 10 - cy);   // اوجِ ۱۰px: قوس داخلِ ردیفِ بازِ آب می‌ماند
      const surf = Math.round(by - cy);
      const rippling = t < 0.16 || t > 0.84;                          // آغاز/پایانِ جهش: حلقهٔ موج
      if (rippling) {
        const k = t < 0.5 ? 1 - t / 0.16 : (t - 0.84) / 0.16;
        const rx = 3 + Math.round(k * 3), ry = Math.max(1, Math.round((2 + k * 2) * 0.5));
        const ex = Math.round(bx - cx), ey = surf + 3;              // حلقه ۲px زیرِ سطح ⇒ جدا از ردیف‌های پاشش
        if (ex > -8 && ey > -8 && ex < r.w + 8 && ey < r.h + 8) {
          r.rect(ex - rx, ey - 1, 1, 2, WW.ring);                     // حلقه: هر نقطه جفتِ ۲px (بدونِ پیکسل منفرد)
          r.rect(ex + rx, ey - 1, 1, 2, WW.ring);
          r.rect(ex - 1, ey - ry, 2, 1, WW.ring);
          r.rect(ex - 1, ey + ry, 2, 1, WW.ring);
        }
      }
      if (px < -6 || py < -6 || px > r.w + 6 || py > r.h + 6) continue;
      if (t < 0.1 || t > 0.9) {                                       // پاشش: جفت‌های ۲px + کف
        r.rect(px, py + 2, 2, 1, WW.foam); r.rect(px - sp.dir * 2, py + 3, 2, 1, WW.ring);
        r.rect(px + sp.dir, py, 2, 1, WW.ring);
      } else {                                                       // بدنهٔ ماهی: ۵×۲ + دمِ ۲px + هایلایت ۲px
        r.rect(px - 2, py, 5, 2, FW.body);
        r.rect(px + 2 * sp.dir, py + 1, 2, 1, FW.tail);
        r.rect(px - 1, py - 1, 2, 1, FW.hi);
        r.rect(px + (sp.dir > 0 ? 2 : -1), py, 1, 2, FW.tail);
        r.rect(px + (sp.dir > 0 ? 0 : -1), py, 2, 1, FW.eye);         // چشم/دهانِ ۲px (بدونِ پیکسل منفرد)
      }
    }
  }
}

// پرندگان کوچک روی تاج درخت‌ها — جاخالی قطعی، بال‌زدن دوره‌ای؛
// قهرمان که نزدیک شود می‌پرند (بالا می‌روند و بال می‌زنند)
const B_BODY = [58, 48, 66, 255], B_BODY2 = [86, 72, 92, 255], B_BELLY = [44, 36, 52, 255];
const B_WING = [110, 96, 120, 255], B_WING2 = [96, 84, 108, 255], B_BEAK = [232, 180, 90, 255], B_EYE = [240, 240, 248, 255];
export function drawBirds(r, trees, cx, cy, time, heroX, heroY, n = 5) {
  const m = Math.min(n, trees.length);
  for (let i = 0; i < m; i++) {
    const t = trees[(i * 7 + 3) % trees.length]; // پخش قطعی روی درخت‌های مرئی
    let bx = t.x * 16 - cx + 2 + (i % 3) * 4;
    let by = t.y * 16 - cy - 12 + (i % 2) * 3; // روی شکم تاج
    const nearHero = Math.hypot(t.x * 16 + 8 - heroX, t.y * 16 + 8 - heroY) < 30;
    let flap = false; // ن۳۶: نشسته = بی‌حرکت؛ فقط هنگام فرار بال می‌زند
    if (nearHero) { // جنگل‌نشین‌ها می‌پرند! بالا + بالِ همیشه
      bx += Math.round(Math.sin(time * 9 + i) * 4);
      by -= 8 + Math.round(Math.sin(time * 7 + i * 1.3) * 3);
      flap = true;
    }
    bx = Math.round(bx); by = Math.round(by);
    if (bx < -8 || by < -8 || bx > r.w || by > r.h) continue;
    r.px(bx, by, B_BODY); r.px(bx + 1, by, B_BODY2);
    r.px(bx, by + 1, B_BODY); r.px(bx + 1, by + 1, B_BELLY);
    r.px(bx + 2, by, B_BODY2); r.px(bx + 3, by, B_BEAK); // سر + منقار
    r.px(bx + 2, by - 1, B_EYE); // چشم
    if (flap) { r.px(bx, by - 1, B_WING); r.px(bx + 1, by - 1, B_WING2); r.px(bx - 1, by, B_WING2); }
  }
}
