// monster_bodies2.js — بدنه‌ی ۴ هیولای ن۴۴ (مومیایی/کماندار/قوچ/یخ‌مرد) — بخش‌بندیِ S6.5
// بخش‌بندیِ S6.5: آتش‌جان/دزد/خرگوش به monster_bodies4.js رفتند (سقفِ ۲۸۰ خط) و این‌جا ادغام می‌شوند.
// همان قرارداد monster_bodies: (r, f) با f={state,t,ph,face,time} — فقط هندسه/انیمیشن
import { MC, MOY, lm, wind } from './monster_parts.js';
import { MBODY4, MOUT4, MSHW4 } from './monster_bodies4.js';

const sin = Math.sin, cos = Math.cos, PI = Math.PI;

// ---------- مومیایی: بدن پیچیده با باند، خزیدن کج ---------- 
function dMummy(r, f) {
  const g = lm(r, f.face);
  let lean = 0, yOff = 0, dead = 0, arm = 0;
  if (f.state === 'idle') { lean = sin(f.time * 1.1) * 2; yOff = sin(f.time * 2) * 1; }
  else if (f.state === 'move') { lean = 5 + sin(f.ph * PI * 2) * 3; yOff = -Math.abs(sin(f.ph * PI * 2)) * 2; }
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); lean = -6 * e; arm = e; }     // عقب‌نشینی بازو
    else { const e = (f.t - 0.5) / 0.5; lean = 8 * (1 - e * 0.5); arm = 1 - e; } // کوبیدن
  } else if (f.state === 'die') { dead = f.t; lean = 6; }
  const bx = lean * 0.4, by = MOY - 15 + yOff;
  // بدن: ستون باند‌پیچ
  g.rect(bx - 7, by - 12, 14, 26, MC.mummy);
  g.rect(bx - 7, by - 12, 14, 2, MC.mummyHi);
  for (const y of [by - 8, by - 2, by + 4, by + 10]) g.rect(bx - 7, y, 14, 1, MC.mummySh); // باند افقی
  g.rect(bx - 7, by - 10, 14, 1, MC.mummyDeep); g.rect(bx - 7, by + 7, 14, 1, MC.mummyDeep); // S1.5b: درزهای عمیق
  g.rect(bx - 6, by - 5, 5, 1, MC.mummyMid); g.rect(bx - 1, by + 1, 6, 1, MC.mummyMid); // باند میانی
  g.rect(bx + 2, by - 4, 3, 2, MC.mummyStain); g.rect(bx - 5 + lean * 0.3, by - 14, 11, 1, MC.mummyMid); // لکه + باند سر
  g.rect(bx - 6, by + 2, 4, 1, MC.mummyBand); g.rect(bx - 4 + lean * 0.3, by - 17, 9, 1, MC.mummyBand); // S1.5b: باند تیره‌ی سر/تنه
  g.rect(bx + 4, by - 12, 3, 26, MC.mummySh); // نوار سایه کنار
  // S6.5: باندِ پیچ‌خورده (مورب روی تنه) + دنباله‌ی رها (سیلوئت را از استخوانی جدا می‌کند)
  for (let i = 0; i < 5; i++) {
    const y0 = by - 11 + i * 5;
    g.lineW(bx - 7, y0, bx + 7, y0 + 3, 1, i % 2 ? MC.mummyBand : MC.mummyMid);
    g.lineW(bx - 7, y0 + 1, bx + 7, y0 + 4, 1, MC.mummySh);
  }
  g.lineW(bx + 6, by + 3, bx + 9, by + 8 + sin(f.time * 2) * 2, 1, MC.mummyHi);    // دنباله‌ی آزاد (بالای خطِ زمین)
  g.lineW(bx + 9, by + 9 + sin(f.time * 2) * 2, bx + 10, by + 12 + sin(f.time * 3) * 2, 1, MC.mummyMid);
  g.px(bx + 10, by + 12 + sin(f.time * 3) * 2, MC.mummyMid); g.px(bx + 9, by + 11 + sin(f.time * 2) * 2, MC.mummyHi);
  // سر: کلاه‌خود باند با چشم درخشان
  g.rect(bx - 5 + lean * 0.3, by - 19, 11, 8, MC.mummy);
  g.rect(bx - 5 + lean * 0.3, by - 19, 11, 2, MC.mummyHi);
  g.rect(bx - 4 + lean * 0.3, by - 16, 3, 2, MC.dark); g.rect(bx + 1 + lean * 0.3, by - 16, 3, 2, MC.dark);
  if (f.state !== 'die') { g.px(bx - 3 + lean * 0.3, by - 15, MC.mummyGlow); g.px(bx + 2 + lean * 0.3, by - 15, MC.mummyGlow); }
  // بازوهای باند‌پیچ (حمله: تاب رو به جلو)
  // S6.5: بازوانِ درازِ رو‌به‌جلو (امضای مومیایی — سیلوئت را از دزد جدا می‌کند)
  const ax = bx + 6, swing = (f.state === 'attack' ? arm * 10 : 0) + 5;
  g.lineW(ax, by - 6, ax + 4 + swing, by + 2 - arm * 6, 3, MC.mummySh);
  g.rect(ax + 3 + swing, by + 1 - arm * 6, 4, 3, MC.mummySh);   // کفِ دستِ آویزان
  g.lineW(bx - 6, by - 6, bx - 11, by - 1, 3, MC.mummySh);      // بازوی عقبی
  // پاها
  const st = f.state === 'move' ? sin(f.ph * PI * 2) * 3 : 0;
  g.rect(bx - 5, MOY - 3, 4, 3, MC.mummySh); g.rect(bx + 1, MOY - 3, 4, 3, MC.mummySh);
  if (st) g.px(bx - 5 + st, MOY, MC.mummyOut);
  // مرگ: باند‌ها باز می‌شوند
  if (dead > 0) {
    const e = dead;
    for (let i = 0; i < 4; i++) g.lineW(bx - 6 + i * 4, by - 14 + e * 20, bx - 10 + i * 5 + e * 12, by - 8 + e * 26, 1, [MC.mummyHi[0], MC.mummyHi[1], MC.mummyHi[2], Math.round(255 * (1 - e))]);
  }
}

// ---------- کماندار: اسکلت با کمان — کشیدن/رها کردن ---------- 
function dArcher(r, f) {
  const g = lm(r, f.face);
  let pull = 0, yOff = 0, dead = 0, recoil = 0;
  if (f.state === 'idle') yOff = sin(f.time * 2) * 1;
  else if (f.state === 'move') yOff = -Math.abs(sin(f.ph * PI * 2)) * 2;
  else if (f.state === 'attack') {
    if (f.t < 0.5) pull = wind(f.t, 0.5);          // کشیدن زه
    else { recoil = 1 - (f.t - 0.5) / 0.5; pull = 0; } // رها + لگد
  } else if (f.state === 'die') dead = f.t;
  const bx = 0, by = MOY - 16 + yOff;
  const fade = 1 - dead;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // اسکلت (هم‌زبان dSkeleton): دنده + لگن + جمجمه
  g.rect(bx - 2, by + 8, 4, 4, a(MC.bone)); // لگن
  for (let i = 0; i < 3; i++) g.rect(bx - 4, by - 2 + i * 4, 8, 1, a(MC.bone)); // دنده
  g.rect(bx - 3, by + 1, 6, 1, a(MC.archerMid)); g.rect(bx - 4, by - 4, 8, 1, a(MC.archerDeep)); // S1.5b: بافت تنه
  g.rect(bx - 2, by + 11, 5, 1, a(MC.archerWorn)); g.px(bx + 3, by + 9, a(MC.archerDeep));
  g.lineW(bx, by + 9, bx + (f.state === 'move' ? sin(f.ph * PI * 2) * 3 : 0), MOY - 2, 1, a(MC.boneSh)); // پا
  g.rect(bx - 4, by - 10, 9, 8, a(MC.bone)); // جمجمه
  g.rect(bx - 4, by - 10, 9, 2, a(MC.boneHi));
  g.rect(bx - 2, by - 7, 2, 2, a(MC.dark)); g.rect(bx + 1, by - 7, 2, 2, a(MC.dark)); // چشم‌ها
  if (f.state === 'attack' && f.t > 0.42 && f.t < 0.62) { g.px(bx - 1, by - 3, a(MC.eyeRed)); g.px(bx + 2, by - 3, a(MC.eyeRed)); } // چشم قرمز هنگام شلیک
  // کمان: قوس عمودی جلو + زه + تیر (با کشش عقب می‌رود)
  const hx = bx + 8 - recoil * 2; // دست کمان
  const bowX = hx + 3 + pull * -2;
  // S6.5: کمانِ کمانی (سه پاره با برآمدگیِ میانی) — قوس ساده‌ی عمودی جای خود را داد
  g.lineW(bowX, by - 12, bowX + 3, by - 4, 1, a(MC.archerBow));
  g.lineW(bowX + 3, by - 4, bowX, by + 4, 1, a(MC.archerBow));
  g.px(bowX + 2, by - 4, a(MC.archerBowHi));
  // S6.5: تیردان پشتِ شانه + ۳ پرِ تیر (سیلوئت را از اسکلت جدا می‌کند)
  g.rect(bx - 8, by - 6, 3, 9, a(MC.archerQuiver));
  g.px(bx - 8, by - 6, a(MC.archerBow)); g.px(bx - 6, by - 6, a(MC.archerBow));
  for (let i = 0; i < 3; i++) {
    g.lineW(bx - 7 + i, by - 7 - i * 2, bx - 6 + i, by - 12 - i * 2, 1, a(MC.boneSh));
    g.px(bx - 7 + i, by - 12 - i * 2, a(MC.archerFeather));
  }
  g.px(bowX, by - 6, a(MC.archerQuiver)); g.px(bowX, by + 1, a(MC.archerQuiver)); // S1.5b: چنگک قوس
  g.px(bowX - 1, by - 13, a(MC.archerBowHi)); g.px(bowX - 1, by + 5, a(MC.archerBowHi)); // نوک‌ها
  g.line(bowX, by - 12, bowX - pull * 5, by - 4, a(MC.boneOut)); g.line(bowX, by + 4, bowX - pull * 5, by - 4, a(MC.boneOut)); // زه
  if (pull > 0.1) g.lineW(bowX - pull * 5, by - 4, bowX + 4, by - 4, 1, a(MC.archerBowHi)); // تیر روی زه
  // بازوی کشیدن
  g.lineW(bx + 2, by - 2, bowX - pull * 5, by - 4, 1, a(MC.bone));
  if (dead > 0) { g.px(bx - 6 + dead * 4, by - 8 + dead * 14, a(MC.boneSh)); g.px(bx + 5 - dead * 3, by - 4 + dead * 12, a(MC.bone)); }
}

// ---------- قوچ: گوسفند پشمالو با شاخ حلزونی — یورتم و یورش ---------- 
function dRam(r, f) {
  const g = lm(r, f.face);
  let yOff = 0, crouch = 0, stretch = 0, dead = 0, headY = 0;
  if (f.state === 'idle') yOff = sin(f.time * 1.6) * 1;
  else if (f.state === 'move') yOff = -Math.abs(sin(f.ph * PI * 2)) * 2.5;
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); crouch = e; }                   // یورتم: جمع شدن
    else if (f.t < 0.85) { stretch = 1; }                                       // یورش
    else { const e = (f.t - 0.85) / 0.15; crouch = -e * 0.4; stretch = 1 - e; } // ترمز
  } else if (f.state === 'die') dead = f.t;
  const bx = -2 + stretch * 6, by = MOY - 12 + yOff + crouch * 3;
  headY = by - 3 + crouch * 3;
  // بدن پشمالو: بیضی پرزدار
  for (let dy = -9; dy <= 7; dy++) {
    const w2 = Math.round(11 * Math.sqrt(Math.max(0, 1 - (dy / 10) ** 2)));
    if (w2 < 1) continue;
    for (let dx = -w2; dx <= w2; dx++) {
      const pz = ((dx * 7 + dy * 13 + 3) % 5 === 0) ? MC.ramSh : MC.ram;
      g.px(bx + dx, by + dy + (dx & 1 && f.state !== 'idle' ? 0 : 0), pz);
    }
  }
  g.ellipse(bx - 3, by - 6, 6, 4, MC.ramHi); // پشمالویی روشن بالا
  g.rect(bx - 9, by - 2, 5, 1, MC.ramMid); g.rect(bx + 5, by + 3, 5, 1, MC.ramDeep); g.rect(bx - 1, by + 5, 4, 1, MC.ramMid); // S1.5b: بافت پشم
  // پاها
  const st = f.state === 'move' ? sin(f.ph * PI * 2) * 3 : 0;
  g.rect(bx - 6 + st, MOY - 4, 3, 4, MC.ramSh); g.rect(bx + 3 - st, MOY - 4, 3, 4, MC.ramSh);
  g.rect(bx - 6 + st, MOY - 2, 3, 2, MC.ramHoof); g.rect(bx + 3 - st, MOY - 2, 3, 2, MC.ramHoof); // S1.5b: سم
  // سر پایین‌آمده + شاخ حلزونی
  const hx = bx + 10 + stretch * 5, hy = headY + 2;
  g.rect(hx - 3, hy - 4, 8, 8, MC.ramSh);
  g.rect(hx - 3, hy - 4, 8, 2, MC.ram);
  g.rect(hx + 4, hy - 1, 2, 2, MC.ramOut); // پوزه
  g.px(hx + 2, hy - 2, MC.dark); // چشم
  // S6.5: شاخِ حلزونی (قوسِ رو به جلو + دورِ دوم به داخل) + توده‌های پشمِ بیرون‌زده
  g.lineW(hx - 1, hy - 5, hx + 4, hy - 10, 2, MC.ramHorn);
  g.lineW(hx + 4, hy - 10, hx + 9, hy - 7, 2, MC.ramHorn);
  g.lineW(hx + 9, hy - 7, hx + 7, hy - 3, 2, MC.ramHorn);      // دورِ دومِ حلزون
  g.lineW(hx + 7, hy - 3, hx + 2, hy - 4, 2, MC.ramHornSh);
  g.px(hx + 9, hy - 7, MC.ramHornSh); g.px(hx + 4, hy - 10, MC.ramHornSh);
  g.px(hx + 1, hy - 5, MC.ramHornSh);
  for (const [tx, ty] of [[-10, -8], [-7, -10], [7, 6], [4, 8]]) { // توده‌های پشمِ بالا/پایین (نه پهلو — هم‌پوشانی با اسلایم را زیاد می‌کرد)
    g.px(bx + tx, by + ty, MC.ramHi); g.px(bx + tx - (tx < 0 ? 1 : -1), by + ty + 1, MC.ram);
  }
  if (stretch) { g.px(hx + 12, hy - 2, [255, 255, 255, 90]); g.px(hx + 14, hy + 1, [255, 255, 255, 60]); } // بویرِ شارژ
  if (dead > 0) { // افتادن پهلو
    g.ellipse(bx, MOY - 4, 13 * (0.6 + dead * 0.4), 6, [MC.ram[0], MC.ram[1], MC.ram[2], Math.round(255 * (1 - dead * 0.8))]);
  }
}

// ---------- یخ‌مرد: میمون سفید حجیم با مشت دوتایی ---------- 
function dYeti(r, f) {
  const g = lm(r, f.face);
  let yOff = 0, rage = 0, dead = 0, slam = 0;
  if (f.state === 'idle') yOff = sin(f.time * 1.3) * 1.5;
  else if (f.state === 'move') yOff = -Math.abs(sin(f.ph * PI * 2)) * 3;
  else if (f.state === 'attack') {
    if (f.t < 0.5) { rage = wind(f.t, 0.5); yOff = -rage * 3; }   // بالا بردن مشت‌ها
    else { slam = 1 - (f.t - 0.5) / 0.5; rage = 1; yOff = slam * 2; } // کوبیدن
  } else if (f.state === 'die') dead = f.t;
  const bx = 0, by = MOY - 16 + yOff;
  const fade = 1 - dead * 0.9;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // بدن حجیم
  g.ellipse(bx, by, 13, 15, a(MC.yeti));
  g.ellipse(bx - 3, by - 6, 7, 6, a(MC.white));        // پشتی روشن
  g.ellipse(bx, by + 8, 10, 5, a(MC.yetiSh));          // پایین تیره
  g.ellipse(bx + 7, by + 1, 5, 4, a(MC.yetiSh2)); g.rect(bx - 4, by + 6, 4, 1, a(MC.yetiDeep)); g.px(bx - 1, by - 18, a(MC.yetiMid)); // S1.5b: بافت یخ
  g.rect(bx - 9, by + 3, 5, 1, a(MC.yetiSh2)); g.rect(bx + 2, by - 6, 4, 1, a(MC.yetiDeep)); g.rect(bx - 2, by + 10, 5, 1, a(MC.yetiMid)); // لایه‌های یخی
  g.rect(bx - 11, by + 7, 4, 1, a(MC.yetiDark)); g.rect(bx + 3, by + 12, 4, 1, a(MC.yetiIce)); // S1.5b: شکاف/یخ‌زده
  // سر کوچک بالا
  g.ellipse(bx + 2, by - 15, 7, 6, a(MC.yeti));
  g.ellipse(bx + 2, by - 17, 4, 3, a(MC.white));
  // S6.5: خزِ یخیِ دندانه‌دار روی لبه‌ی سیلوئت (از توده‌ی ساده متمایز)
  for (let i = 0; i < 9; i++) {
    const ang = -PI * 0.9 + i * (PI * 1.8 / 8), sx2 = bx + cos(ang) * 14, sy2 = by + sin(ang) * 16;
    g.px(sx2, sy2, a(i % 2 ? MC.yetiIce : MC.yetiMid));
    g.px(bx + cos(ang) * 12.5, by + sin(ang) * 14.5, a(MC.yetiSh2));
  }
  g.rect(bx - 1, by - 18, 5, 1, a(MC.yetiDark)); // ابرو
  g.rect(bx, by - 16, 2, 2, a(MC.dark)); g.rect(bx + 4, by - 16, 2, 2, a(MC.dark)); // چشم‌ها
  g.rect(bx + 1, by - 12, 5, 2, a(MC.yetiSkin)); // دهان
  g.px(bx + 2, by - 12, a(MC.white)); g.px(bx + 4, by - 12, a(MC.white)); // S6.5: دندان‌ها
  // بازوهای بلند + مشت‌ها (حمله: بالا سپس کوبش جلو)
  const ay = by - 4 - rage * 10 + slam * 12;
  g.lineW(bx - 10, by + 2, bx - 14, ay, 4, a(MC.yeti));
  g.lineW(bx + 10, by + 2, bx + 14, ay, 4, a(MC.yeti));
  g.ellipse(bx - 14, ay, 4, 4, a(MC.yetiSh)); g.ellipse(bx + 14, ay, 4, 4, a(MC.yetiSh)); // مشت‌ها
  g.px(bx - 16, ay - 2, a(MC.yetiClaw)); g.px(bx - 13, ay - 3, a(MC.yetiClaw)); g.px(bx + 13, ay - 3, a(MC.yetiClaw)); g.px(bx + 16, ay - 2, a(MC.yetiClaw)); // S1.5b: پنجه
  // پاها
  g.rect(bx - 7, MOY - 5, 5, 5, a(MC.yetiSh)); g.rect(bx + 2, MOY - 5, 5, 5, a(MC.yetiSh));
  // خشم: نفس سرد (ذرات یخ ثابت هنگام باداُپ)
  if (rage > 0.5 && f.state === 'attack' && f.t < 0.5) { g.px(bx - 5, by - 20, [242, 239, 228, 180]); g.px(bx + 8, by - 22, [242, 239, 228, 140]); } // S1.5b: ذرات از پالت
}

// ---------- جدول‌ها (ن۴۴) — ۴ این‌جا + ۳ از monster_bodies4 ----------
export const MBODY2 = { mummy: dMummy, archer: dArcher, ram: dRam, yeti: dYeti, ...MBODY4 };
export const MOUT2 = { mummy: MC.mummyOut, archer: MC.boneOut, ram: MC.ramOut, yeti: MC.yetiOut, ...MOUT4 };
export const MSHW2 = { mummy: [10, 3], archer: [9, 3], ram: [14, 4], yeti: [16, 5], ...MSHW4 };
