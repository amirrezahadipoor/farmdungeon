// boss.js — «گولم‌لرد»: باس بزرگ (تا ۱۲۸px)، ۳ فاز رفتاری، ۳ حمله با تلگراف قرمز قبل از ضربه‌ی سنگین
import { Raster } from '../raster.js';
import { MC } from './monster_parts.js';
import { ease } from '../skeleton.js';
import { rp } from './ramps.js'; // S1.5b: سایه از رمپ جوهری
import { bake } from './bake.js'; // S6.1: خط لولهٔ واحدِ پخت (outline/flash/shadow/snap)
import { motionFor, motionProxy, drawMotionFx } from './mob_motion.js'; // S6.3

const BSPR = 128;
const OX = 64, OY = 112; // باس بزرگ است: مبدأ پایین‌تر تا داخل بوم جا شود
const sin = Math.sin, cos = Math.cos, PI = Math.PI;
const B = { body: MC.boss, hi: MC.bossHi, sh: MC.bossSh, out: MC.bossOut, red: MC.bossRed, gold: MC.bossGold, ember: MC.ember, dark: MC.dark, white: MC.white };

function lm(r, face) {
  const m = (v) => OX + v * face;
  return {
    px: (x, y, c) => r.px(m(x), y, c),
    line: (x1, y1, x2, y2, c) => r.line(m(x1), y1, m(x2), y2, c),
    lineW: (x1, y1, x2, y2, w, c) => r.lineW(m(x1), y1, m(x2), y2, w, c),
    rect: (x, y, w, h, c) => r.rect(face > 0 ? m(x) : m(x) - w, y, w, h, c),
    ellipse: (x, y, rx, ry, c) => r.ellipse(m(x), y, rx, ry, c),
    m,
  };
}

// opts: {state:'idle'|'move'|'attack'|'die', t, ph, time, face, atk:'slam'|'sweep'|'roar', phase:1..3, hit}
export function drawBossFrame(o) {
  const f = { state: o.state || 'idle', t: o.t ?? 0, ph: o.ph ?? 0, time: o.time ?? 0, face: o.face ?? 1 };
  const atk = o.atk || 'slam';
  const phase = o.phase || 1;
  const r0 = new Raster(BSPR, BSPR);
  const mv = motionFor('boss', f); // S6.3: idle زنده + anticipation — فقط ظاهر
  const r = motionProxy(r0, mv, OY);
  const g = lm(r, f.face);

  let bob = sin(f.time * 0.9) * 1.5, lean = 0, armA = 0.45, shake = 0, warn = 0, dead = 0, jaw = 0, inhale = 0;
  const speed = phase === 3 ? 1.5 : phase === 2 ? 1.2 : 1; // فاز بالا‌تر = تندتر
  if (f.state === 'move') { bob = -Math.abs(sin(f.ph * PI)) * 3; lean = sin(f.ph * PI * 2) * 0.06; }
  else if (f.state === 'attack') {
    const wu = atk === 'slam' ? 0.5 : atk === 'sweep' ? 0.45 : 0.4; // سهم wind-up
    if (f.t < wu) {                                   // تلگراف: بازو بالا/عقب + برق قرمز
      const e = ease.outCubic(f.t / wu);
      warn = e;
      if (atk === 'slam') { armA = 0.45 - e * 2.2; lean = -e * 0.1; }
      else if (atk === 'sweep') { armA = 0.45 + e * 0.8; lean = -e * 0.14; }
      else { inhale = e; jaw = e; }
    } else if (f.t < wu + 0.2) {                      // ضربه
      const e = (f.t - wu) / 0.2;
      if (atk === 'slam') { armA = -1.75 + e * 2.6; lean = 0.16; shake = e < 0.5 ? 2 : 0; }
      else if (atk === 'sweep') { armA = 1.25 - e * 2.9; lean = 0.1; }
      else { jaw = 1; inhale = 1 - e; shake = e < 0.4 ? 1 : 0; }
    } else {                                          // ریکاوری
      const e = (f.t - wu - 0.2) / (1 - wu - 0.2);
      if (atk === 'slam') armA = 0.85 - e * 0.4;
      else if (atk === 'sweep') armA = -1.65 + e * 2.1;
      else { jaw = 1 - e; }
    }
  } else if (f.state === 'die') {
    dead = f.t;
    shake = dead < 0.3 ? 1 : 0;
  }
  const gy = OY + bob + (dead > 0.5 ? (dead - 0.5) * 20 : 0);
  const phaseFlash = o.phaseFlash ? 1 : 0; // S6.6: دو فریمِ نخستِ فازِ تازه (لرزش + جرقه + فلش)
  const sx = shake ? (Math.floor(f.time * 40) % 2 ? 1.5 : -1.5) : (phaseFlash ? (Math.floor(f.time * 60) % 2 ? 2.5 : -2.5) : 0);

  // --- پاها (ستون‌های سنگی) ---
  for (const dx of [-14, 5]) {
    g.rect(sx + dx, gy - 26, 11, 26, B.sh);
    g.rect(sx + dx, gy - 26, 11, 3, B.body);
    g.rect(sx + dx + 8, gy - 24, 3, 22, B.out);
    if (phase === 2) { g.lineW(sx + dx + 2, gy - 22, sx + dx + 6, gy - 8, 2, B.red); g.px(sx + dx + 4, gy - 14, MC.ember); } // فاز ۲: ترکِ پا
    if (phase === 3) { g.rect(sx + dx + 2, gy - 20, 3, 1, B.red); g.rect(sx + dx + 4, gy - 12, 2, 1, B.ember); } // گداختگی
  }
  // --- تنه + شظايا (زره) — S6.6: سه فازِ بصریِ متمایز ---
  const ty = gy - 66;
  const tw = phase === 3 ? 34 : 48;                            // فاز ۳: نیمی از تنه فروریخته
  g.rect(sx - 24, ty, tw, 40, B.body);
  g.rect(sx - 24, ty, tw, 4, B.hi); g.rect(sx - 24, ty + 36, tw, 4, B.sh);
  g.rect(sx - 8, ty + 6, 16, 22, B.sh);                       // صفحه‌ی سینه
  g.rect(sx - 7, ty + 7, 14, 3, B.hi);
  for (let i = 0; i < (phase === 3 ? 3 : 4); i++) g.px(sx - 20 + i * 13, ty + 16, B.out); // پرچ‌های زره
  g.rect(sx - 24, ty + 14, tw, 2, MC.bossMid); g.rect(sx - 22, ty + 30, 8, 2, MC.bossDeep);
  if (phase !== 3) g.rect(sx + 8, ty + 22, 10, 2, MC.bossDeep); // S1.5b: صفحه‌های سنگی
  g.rect(sx - 16, ty + 22, 6, 1, MC.bossCrack); if (phase !== 3) g.rect(sx + 6, ty + 12, 5, 1, MC.bossCrack);
  g.rect(sx - 18, ty + 6, 3, 2, MC.ember); if (phase !== 3) g.rect(sx + 15, ty + 6, 3, 2, MC.ember);
  g.rect(sx - 2, ty + 26, 6, 1, MC.bossRed);                    // S1.5b: دریچه‌ی گدازه‌ی همیشه‌روشن
  if (phase === 2) { // فاز ۲: لب‌پریدگی + شبکه‌ی ترکِ گداخته‌ی پهن (هسته‌ی اخگری روی لبه‌ی تیره)
    g.rect(sx + 14, ty, 10, 6, B.out); g.rect(sx + 12, ty + 5, 3, 3, B.out);      // شانه‌ی لب‌پریده
    g.rect(sx - 26, ty + 26, 4, 6, B.out); g.rect(sx - 24, ty + 17, 3, 4, B.out); // لب‌پریدگیِ پهلو
    const crack = (x1, y1, x2, y2) => {                                           // ترکِ سه‌لایه
      g.lineW(x1, y1, x2, y2, 3, B.out); g.lineW(x1, y1, x2, y2, 2, B.red); g.line(x1, y1, x2, y2, MC.ember);
    };
    crack(sx - 18, ty + 8, sx - 12, ty + 26); crack(sx + 12, ty + 6, sx + 8, ty + 28);
    crack(sx - 12, ty + 26, sx - 2, ty + 36); crack(sx + 8, ty + 28, sx + 2, ty + 38);
    crack(sx - 22, ty + 22, sx - 18, ty + 38); crack(sx + 2, ty + 4, sx - 6, ty + 18);
    crack(sx - 6, ty + 6, sx + 4, ty + 20); crack(sx - 20, ty + 12, sx - 14, ty + 30); // ترک‌های میانی
    g.rect(sx - 24, ty, 4, 9, B.out); g.rect(sx - 23, ty + 9, 3, 3, B.out);            // گوشه‌ی لب‌پریده
    g.rect(sx - 8, ty + 11, 14, 7, B.out); g.rect(sx - 6, ty + 12, 10, 5, B.red); g.rect(sx - 4, ty + 13, 6, 3, MC.ember); // حفره‌ی سینه
    for (let i = 0; i < 3; i++) g.rect(sx - 20 + i * 16, ty + 40 + (i % 2) * 2, 3, 7 + (i % 2) * 3, MC.ember);             // چکه‌ی گدازه
    g.rect(sx - 19, ty + 48, 2, 3, B.red); g.rect(sx + 13, ty + 49, 2, 3, B.red);                                            // چاله‌ی گدازه
    g.px(sx - 19, ty + 47, B.red); g.px(sx - 3, ty + 46, B.red); g.px(sx + 13, ty + 48, B.red);
  }
  if (phase === 3) { // فاز ۳: لبه‌ی شکسته + هسته‌ی گداخته‌ی نمایان + خرده‌سنگ
    for (let i = 0; i < 10; i++) g.px(sx + 10 - (i % 3), ty + 3 + i * 4, B.out);   // لبه‌ی دندانه‌دارِ شکستگی
    g.rect(sx + 2, ty + 12, 8, 12, B.red); g.rect(sx + 3, ty + 14, 6, 8, MC.ember); // هسته
    g.px(sx + 1, ty + 28, B.ember); g.px(sx + 9, ty + 30, B.red); g.px(sx + 6, ty + 6, MC.ember);
    g.rect(sx - 4, ty + 4, 6, 2, B.out);                                            // ترکِ بالای تنه
    g.rect(sx - 26, gy - 5, 7, 4, B.sh); g.px(sx - 25, gy - 6, B.body); g.px(sx - 21, gy - 2, B.out);
    g.rect(sx + 16, gy - 4, 8, 3, B.sh); g.px(sx + 18, gy - 5, B.body); g.px(sx + 23, gy - 2, B.out); // خرده‌سنگِ ریخته
    g.rect(sx + 26, gy - 3, 4, 2, B.sh);
  }
  // --- بازوی دور ---
  g.lineW(sx - 20, ty + 8, sx - 26, ty + 30, 8, B.sh);
  // --- سر + کلاه‌تاج (S6.6: فاز ۲ تاجِ شکسته · فاز ۳ کج + خشم) ---
  const hTilt = phase === 3 ? 3 : 0, hy = ty - 16 - inhale * 2 + (phase === 3 ? 2 : 0);
  g.rect(sx - 9 + hTilt, hy, 18, 16, B.body);
  g.rect(sx - 9 + hTilt, hy, 18, 3, B.hi);
  g.rect(sx - 5 + hTilt, hy + 6, 11, 3, warn > 0.2 || jaw > 0.2 || phase === 3 ? B.red : B.sh); // چشم
  if (phase === 3) { g.rect(sx - 3 + hTilt, hy + 6, 5, 3, MC.ember); g.px(sx + 2 + hTilt, hy + 7, B.white); }
  const crownN = phase === 3 ? 2 : 3;                                   // تاج: سالم → شکسته
  for (let i = 0; i < crownN; i++) {
    const cx2 = sx - 7 + i * 6 + (phase === 3 ? 4 : 0), cy2 = hy - 5 + (phase === 3 ? 2 : 0);
    g.rect(cx2, cy2, 3, phase === 3 ? 4 : 5, B.gold);
    if (phase === 3) g.px(cx2, cy2 - 1, B.gold);                         // میخِ کج
  }
  if (phase >= 2) { g.rect(sx + 22, gy - 7, 3, 5, B.gold); if (phase === 3) g.rect(sx + 27, gy - 5, 3, 4, B.gold); } // میخ‌های افتاده
  if (phase === 2) { // فاز ۲: ترکِ سر هم‌زبانِ تنه
    g.lineW(sx - 9 + hTilt, hy + 1, sx - 2 + hTilt, hy + 9, 2, B.red); g.px(sx - 6 + hTilt, hy + 4, MC.ember);
  }
  if (phase === 3) { // هاله‌ی خشم: اخگرهای شناور دورِ سر/شانه
    for (const [ex2, ey2] of [[-15, -8], [13, -12], [-19, 4], [17, 6], [-9, -15], [8, -16]]) g.px(sx + ex2, hy + ey2, MC.ember);
  }
  if (jaw > 0.3) { g.rect(sx - 4, hy + 12, 9, 3 + Math.round(jaw * 3), B.dark); g.px(sx - 2, hy + 13, B.ember); } // غرش
  // --- بازوی نزدیک + چکش بزرگ ---
  const shx = sx + 20, shy = ty + 8;
  const hAng = f.state === 'attack' ? armA : 0.45 + sin(f.time * 0.8) * 0.05;
  const hx = shx + cos(hAng) * 20, hy2 = shy + sin(hAng) * 20;
  g.lineW(shx, shy, hx, hy2, 9, B.body);
  g.lineW(shx, shy - 3, hx, hy2 - 3, 2, B.hi);
  // چکش: دسته ادامه‌ی بازو + سر بزرگ
  const ex = hx + cos(hAng) * 14, ey = hy2 + sin(hAng) * 14;
  g.lineW(hx, hy2, ex, ey, 4, MC.wood ?? B.sh);
  const perp = hAng + PI / 2;
  const h1 = [ex + cos(perp) * 8, ey + sin(perp) * 8], h2 = [ex - cos(perp) * 8, ey - sin(perp) * 8];
  g.lineW(h1[0], h1[1], h2[0], h2[1], 12, B.body);
  g.lineW(h1[0], h1[1] - 5, h2[0], h2[1] - 5, 2, B.hi);
  // --- تلگراف زمین: مثلث قرمز چشمک‌زن زیر هدف ---
  if (f.state === 'attack' && f.t < (atk === 'slam' ? 0.5 : atk === 'sweep' ? 0.45 : 0.4)) {
    const blink = Math.floor(f.time * 12) % 2 === 0;
    const c = blink ? B.red : [MC.bossRed[0], MC.bossRed[1], MC.bossRed[2], 120];
    for (let i = 0; i < 4; i++) g.rect(sx + 22 - i * 2, OY - 1 - i * 3, i * 4 + 2, 2, c);
  }
  // --- موج ضربه (بعد از کوبش/غرش) ---
  if (f.state === 'attack' && f.t > 0.55 && f.t < 0.85) {
    const rr = Math.round((f.t - 0.55) * 40);
    for (let a = -1.4; a <= 1.4; a += 0.22) g.px(sx + cos(a) * rr, OY + 1 - Math.abs(sin(a)) * 3, B.ember);
  }
  // S6.6: جرقه‌های گذارِ فاز (اخگر + سفید دورِ سیلوئت)
  if (phaseFlash) {
    for (let i = 0; i < 10; i++) {
      const a2 = (i / 10) * PI * 2 + f.time;
      g.px(sx + cos(a2) * (36 + (i % 3) * 7), ty + 22 + sin(a2) * (32 + (i % 2) * 9), i % 2 ? MC.ember : B.white);
    }
  }
  // --- مرگ: ترک‌ها + فروپاشی + افتادن تاج ---
  if (dead > 0) {
    g.line(sx - 16, ty, sx - 4, ty + 20 * Math.min(1, dead * 2), B.out);
    g.line(sx + 14, ty + 30, sx + 6, ty + 30 - 24 * Math.min(1, dead * 2), B.out);
    if (dead > 0.35) g.rect(sx - 7, hy - 5, 18, 5, [0, 0, 0, 0]); // پاک کردن تاج از سر
    const fall = Math.min(1, Math.max(0, (dead - 0.35) * 2));
    g.rect(sx - 6 + fall * 8, hy - 5 + fall * 26, 3, 5, B.gold); g.rect(sx - 1 + fall * 10, hy - 5 + fall * 28, 3, 5, B.gold); g.rect(sx + 4 + fall * 6, hy - 5 + fall * 25, 3, 5, B.gold);
    if (dead > 0.6) { g.rect(sx - 20, gy - 20, 14, 8, B.out); g.rect(sx + 8, gy - 14, 12, 7, B.out); } // خرده‌سنگ
  }
  // S6.1: outline → flash → سایهٔ ۵ باندی → snap پالت، همه از خط لولهٔ واحد
  const steps = [];
  if (!o.hit) steps.push({ op: 'outline', mode: 'sel' }); // S1.7: به‌جای B.out ثابت — تُنِ ماده، L≈۱۹
  if (o.hit || phaseFlash) steps.push({ op: 'flash', color: MC.white }); // S6.6: فلشِ سفید در گذارِ فاز هم
  steps.push({ op: 'shadow', spec: 'boss', x: OX, y: OY, color: rp('ink', 0) }); // S1.5b: ۵ باند آلفا (M4)
  steps.push({ op: 'snap' });                                                    // S4.6c
  drawMotionFx(r0, 'boss', f, mv, OX, OY); // S6.3: خاکسترِ معلق
  return bake(r0, steps);
}
