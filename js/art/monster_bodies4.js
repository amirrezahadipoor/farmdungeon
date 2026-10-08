// monster_bodies4.js — بخش‌بندیِ monster_bodies2.js (S6.5): آتش‌جان/دزد/خرگوش + جزئیات
// چرا: monster_bodies2.js از سقفِ ۲۸۰ خط گذشته بود (۲۸۶) — قبل از افزودن جزئیات سه بدنه این‌جا آمد.
// همان قرارداد monster_bodies: (r, f) با f={state,t,ph,face,time} — فقط هندسه/انیمیشن
import { MC, MOY, lm, wind } from './monster_parts.js';

const sin = Math.sin, cos = Math.cos, PI = Math.PI;

// ---------- آتش‌جان: روح شعله کوچک — تف‌کردن گلوله‌ی آتش (+ بال کوچک + شعله‌ی دست — S6.5) ----------
function dImp(r, f) {
  const g = lm(r, f.face);
  let yOff = sin(f.time * 2.6) * 3, spit = 0, dead = 0, scowl = 0;
  if (f.state === 'move') yOff = -6 - Math.abs(sin(f.ph * PI * 2)) * 5;
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); yOff -= e * 4; scowl = e; } // نفس‌کردن داخل
    else { spit = 1 - (f.t - 0.5) / 0.5; yOff += 2; scowl = 1; }           // تف
  } else if (f.state === 'die') dead = f.t;
  const bx = 0, by = MOY - 16 + yOff;
  const fade = 1 - dead;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // S6.5: بال‌های کوچکِ خفاشی (لرزش با فاز/زمان — بیرونِ بدنه ⇒ سیلوئت متمایز)
  const flap = f.state === 'move' ? sin(f.ph * PI * 4) * 3 : sin(f.time * 6) * 2;
  for (const sgn of [-1, 1]) {
    const wx = bx + sgn * 6, wy = by - 1 + flap * 0.5;                              // S6.5: بالِ کوتاهِ مایل به پایین
    g.lineW(bx + sgn * 5, by - 3, wx + sgn * 2, wy - 3 + flap, 2, a(MC.impOut));   // استخوانِ بال
    g.lineW(wx + sgn * 2, wy - 6 + flap, wx + sgn * 1, wy + 1, 1, a(MC.impSh));    // غشا
    g.lineW(bx + sgn * 5, by - 1, wx + sgn * 1, wy, 1, a(MC.impDeep));             // غشای زیرین
    g.px(wx + sgn * 2, wy - 2, a(MC.impOut)); g.px(wx + sgn * 1, wy, a(MC.impSh)); g.px(wx + sgn * 3, wy - 3, a(MC.impOut)); // لبه‌ی غشا
  }
  // بدن: قطره‌ی شعله (لبه تیره، داخل اصلی، هسته روشن)
  for (let dy = -14; dy <= 8; dy++) {
    const k = (dy + 14) / 22;
    const w2 = Math.round(9 * Math.sin(PI * Math.min(1, 0.15 + k * 0.92)));
    if (w2 < 1) continue;
    const col = dy < -8 ? a(MC.impSh) : dy > 4 ? a(MC.imp) : a(MC.impHi);
    for (let dx = -w2; dx <= w2; dx++) if ((dx * 5 + dy * 3) % 7 !== 0) g.px(bx + dx, by + dy, col); // سوراخ‌های شعله
  }
  g.rect(bx - 2, by + 5, 4, 1, a(MC.impMid)); g.px(bx - 1, by - 12, a(MC.impDeep)); g.px(bx + 2, by - 12, a(MC.impDeep)); // S1.5b: بافت شعله
  g.rect(bx - 3, by + 2, 6, 1, a(MC.impDeep)); g.rect(bx - 6, by - 1, 2, 2, a(MC.impOut)); g.rect(bx + 5, by - 3, 2, 2, a(MC.impOut)); // لبه‌های تیره
  g.rect(bx - 1, by + 3, 3, 1, a(MC.impGold)); // هسته‌ی زرین
  g.rect(bx - 5, by - 8, 2, 1, a(MC.impHorn)); g.rect(bx + 4, by - 8, 2, 1, a(MC.impHorn)); // ابروی تیره
  // زبانه‌ی سر (موج آرام)
  const fl = sin(f.time * 3) * 2;
  g.px(bx, by - 16, a(MC.impSh)); g.px(bx - 1 + fl * 0.5, by - 18, a(MC.impHi)); g.px(bx + 1, by - 15, a(MC.imp));
  // چشم‌های شرور + دهان
  g.rect(bx - 5, by - 6, 3, 2, a(MC.impEye)); g.rect(bx + 2, by - 6, 3, 2, a(MC.impEye)); // S1.5b: چشم قرمز
  if (scowl > 0.3) { g.px(bx - 4, by - 7, a(MC.dark)); g.px(bx + 3, by - 7, a(MC.dark)); }
  g.rect(bx - 2 + spit * 3, by - 1, 5, 2, a(MC.dark)); // دهان (هنگام تف جلو)
  // ذره‌ی آتش داخل (هسته)
  g.px(bx, by + 2, a(MC.impHi)); g.px(bx - 1, by + 3, a(MC.imp));
  // S6.5: شعله‌ی کفِ دست (در حمله بزرگ‌تر و جلوتر)
  const fx = bx + 9 + spit * 6, fy = by + 1 - scowl * 2;
  g.px(fx, fy + 1, a(MC.impSh));
  g.px(fx, fy, a(MC.impGold)); g.px(fx + 1, fy, a(MC.impGold));     // هسته‌ی زرینِ ۲px
  g.px(fx, fy - 1, a(MC.impHi)); g.px(fx + (spit > 0.4 ? 1 : 0), fy + 2, a(MC.imp));
  if (scowl > 0.5) { g.px(fx - 1, fy - 2, a(MC.impSh)); g.px(fx + 1, fy - 1, a(MC.impSh)); }
  if (dead > 0) { for (let i = 0; i < 3; i++) g.px(bx - 6 + i * 6, by - 10 - dead * 16 + i * 4, [MC.impHi[0], MC.impHi[1], MC.impHi[2], Math.round(200 * (1 - dead))]); }
}

// ---------- دزد: شنل кап‌دار + خنجر — دزدیدن و گریز (+ شنلِ لبه‌موجی + نقاب — S6.5) ----------
function dBandit(r, f) {
  const g = lm(r, f.face);
  let lean = 3, yOff = 0, stab = 0, dead = 0;
  if (f.state === 'idle') { lean = sin(f.time * 1.4) * 2; yOff = sin(f.time * 2.4) * 1; }
  else if (f.state === 'move') { lean = 6 + Math.abs(sin(f.ph * PI)) * 2; yOff = -Math.abs(sin(f.ph * PI * 2)) * 3; }
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); lean = -4 * e; stab = e; }
    else { stab = 1 - (f.t - 0.5) / 0.5; lean = 7; }
  } else if (f.state === 'die') dead = f.t;
  const bx = lean * 0.3, by = MOY - 14 + yOff;
  const fade = 1 - dead;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // شنل: ذوزنقه با لبه‌ی موجی (S6.5: دنباله‌ی بلندتر + چینِ پارچه)
  for (let dy = -10; dy <= 10; dy++) {
    const w2 = 4 + Math.floor((dy + 10) * 0.36); // S6.5: ایستاده و باریک (جدایی از خرگوشِ کوتاه‌وپهن) // S6.5: باریک‌تر — رشد به سمتِ پایین (دنباله) نه پهنا
    const wob = dy > 6 ? sin(f.time * 5 + dy) * 1.5 : 0;
    for (let dx = -w2; dx <= w2; dx++) g.px(bx + dx + wob, by + dy, a(dy < -6 ? MC.banditHi : (dx > w2 - 3 ? MC.banditSh : MC.bandit)));
    if (dy > 2 && (dy % 3 === 0)) g.px(bx - w2, by + dy, a(MC.banditDeep)); // چینِ لبه
  }
  g.rect(bx - 8, by + 10, 3, 2, a(MC.banditEdge)); g.rect(bx + 5, by + 9, 3, 2, a(MC.banditEdge)); // دنباله‌ی شنل
  // کلاه‌کپ
  g.ellipse(bx + 1, by - 11, 6, 5, a(MC.bandit));
  g.rect(bx - 3, by - 12, 8, 3, a(MC.banditSh));
  g.px(bx + 1, by - 16, a(MC.banditSh)); g.px(bx + 2, by - 17, a(MC.banditEdge)); g.px(bx + 2, by - 18, a(MC.banditEdge)); // S6.5: نوکِ کلاهِ بلند
  // S6.5: نقاب (نیمه‌ی پایینِ صورت) + چشم‌های براقِ بالای آن
  g.rect(bx - 2, by - 7, 8, 3, a(MC.banditSh));
  g.rect(bx - 2, by - 7, 8, 1, a(MC.banditEdge));
  g.rect(bx - 1, by - 4, 6, 1, a(MC.banditSh));
  g.px(bx + 5, by - 6, a(MC.banditDeep)); g.px(bx + 6, by - 5, a(MC.banditDeep)); // گره‌ی نقاب
  g.rect(bx + 1, by - 10, 2, 2, a(MC.banditEdge)); g.px(bx + 4, by - 10, a(MC.banditBlade)); // چشم‌های براق
  // خنجر (حمله: ضربه به جلو)
  const kx = bx + 8 + stab * 8;
  g.lineW(bx + 5, by + 2, kx, by - 1 + stab * 2, 1, a(MC.banditBlade));
  g.rect(bx - 5, by + 1, 10, 1, a(MC.banditSash)); g.rect(bx - 1, by + 3, 2, 2, a(MC.banditBuckle)); // S1.5b: کمربند + سگک
  g.rect(bx - 6, by - 4, 4, 1, a(MC.banditMid)); g.rect(bx + 3, by - 2, 4, 1, a(MC.banditMid));
  g.px(bx - 9, by + 9, a(MC.banditEdge)); g.px(bx - 8, by + 9, a(MC.banditEdge));
  g.px(kx + 1, by - 1 + stab * 2, a(MC.white));
  // کیسه‌ی دزدی
  g.ellipse(bx - 7, by + 4, 3, 3, a(MC.banditSh));
  g.px(bx - 7, by + 3, a(MC.banditBuckle));
  // پاها
  const st = f.state === 'move' ? sin(f.ph * PI * 2) * 4 : 0;
  g.rect(bx - 4 + st, MOY - 4, 3, 4, a(MC.banditSh)); g.rect(bx + 2 - st, MOY - 4, 3, 4, a(MC.banditSh));
  if (dead > 0.4) { // سکه‌های ریخته
    g.px(bx - 9, MOY - 2, a(MC.banditBuckle)); g.px(bx + 7, MOY - 3, a(MC.banditBuckle));
  }
}

// ---------- خرگوش غول‌پیکر: گوش‌های بلند، جهش فنری (+ گوشِ بلندتر + پاهای قوی — S6.5) ----------
function dHare(r, f) {
  const g = lm(r, f.face);
  let w = 24, h = 12, yOff = 0, xOff = 0, earT = 0, dead = 0; // S6.5: کوتاه‌تر و پهن‌تر (توده پایین ⇒ متمایز از دزدِ ایستاده)
  if (f.state === 'idle') { const br2 = sin(f.time * 2.5); w += br2; h -= br2 * 0.6; earT = sin(f.time * 1.8) * 2; }
  else if (f.state === 'move') {
    const ph = f.ph % 1, hop = Math.abs(sin(PI * ph));
    yOff = -hop * 13;
    const sq = ph < 0.14 || ph > 0.92 ? 1.3 : (ph > 0.25 && ph < 0.7 ? 0.8 : 1);
    w *= sq; h /= sq; xOff = ph * 16 - 8;
    earT = -hop * 3;
  } else if (f.state === 'attack') {
    if (f.t < 0.45) { const e = wind(f.t, 0.45); w *= 1 + 0.25 * e; h *= 1 + 0.25 * e; earT = -4 * e; }
    else { const e = (f.t - 0.45) / 0.55; w *= 1.15 - e * 0.2; h *= 0.75; xOff = 10 * e; earT = 3; }
  } else if (f.state === 'die') { dead = f.t; h = 16 * (1 - dead) + 4 * dead; w = 20 + 10 * dead; earT = dead * 6; }
  const cx = xOff, cy = MOY - h / 2 - yOff;
  // S6.5: رانِ عقبیِ قوی (توده‌ی ماهیچه — سیلوئتِ پهن‌تر)
  g.ellipse(cx - w * 0.34, cy + h * 0.22, w * 0.19, h * 0.24, MC.hare);   // S6.5: رانِ عقبی (فشرده — پهنا زیاد نمی‌شود)
  g.ellipse(cx - w * 0.38, cy + h * 0.14, w * 0.12, h * 0.14, MC.hareHi);
  g.ellipse(cx - w * 0.28, cy + h * 0.36, w * 0.14, h * 0.10, MC.hareSh);
  // بدن
  g.ellipse(cx, cy, w / 2, h / 2, MC.hare);
  g.ellipse(cx - w * 0.15, cy - h * 0.2, w * 0.28, h * 0.26, MC.hareHi);
  g.ellipse(cx + w * 0.2, cy + h * 0.15, w * 0.24, h * 0.2, MC.hareSh);
  g.ellipse(cx - w * 0.05, cy + h * 0.3, w * 0.18, h * 0.1, MC.hareMid); // S1.5b: بافت خز
  g.rect(cx - 5, cy + 2, 3, 1, MC.hareDeep); g.rect(cx + 2, cy + 1, 3, 1, MC.hareDeep);
  g.rect(cx - 8, MOY - 4, 5, 3, MC.hareFoot); g.rect(cx + 4, MOY - 4, 4, 3, MC.hareFoot); // S6.5: پنجه‌های بزرگِ عقب
  g.px(cx - 9, MOY - 3, MC.hareMid); g.px(cx - 9, MOY - 2, MC.hareMid); // S6.5: پنجه‌ی جلویی
  // سر جلو
  const hx = cx + w * 0.38, hy = cy - h * 0.25;
  g.ellipse(hx, hy, 6, 5.5, MC.hare);
  g.ellipse(hx + 1, hy - 2, 3, 2.5, MC.hareHi);
  g.px(hx + 4, hy - 1, MC.dark); // چشم
  g.rect(hx - 2, hy + 3, 4, 1, MC.hareMid); g.px(hx + 6, hy + 1, MC.hareNose); // S1.5b: بینی + چانه
  // گوش‌های بلند (S6.5: بلندتر + لبه‌ی داخلیِ کامل)
  for (const ex of [hx - 3, hx + 1]) {                       // S6.5: طولِ گوش حفظ شد (رشدِ عمودی هم‌پوشانی می‌ساخت)
    g.lineW(ex, hy - 4, ex - 2 + earT * 0.4, hy - 20 + earT, 3, MC.hare);
    g.lineW(ex, hy - 4, ex - 2 + earT * 0.4, hy - 20 + earT, 1, MC.hareIn);
    g.px(ex - 2 + earT * 0.4, hy - 21 + earT, MC.hareSh);   // نوکِ گوش
    g.px(ex - 1, hy - 12, MC.hareIn);                        // داخلیِ گوشِ بلندتر
  }
  // پنجه‌ها (فشرده هنگام جهش)
  if (yOff < -4) { g.px(cx - 5, MOY - 2 + yOff * 0.4, MC.hareSh); g.px(cx + 4, MOY - 2 + yOff * 0.4, MC.hareSh); }
  if (dead > 0.5) { g.px(cx - 8, MOY - 2, [MC.hareSh[0], MC.hareSh[1], MC.hareSh[2], Math.round(255 * (1 - dead))]); }
}

export const MBODY4 = { imp: dImp, bandit: dBandit, hare: dHare };
export const MOUT4 = { imp: MC.impOut, bandit: MC.banditOut, hare: MC.hareOut };
export const MSHW4 = { imp: [8, 3], bandit: [10, 3], hare: [11, 4] };
