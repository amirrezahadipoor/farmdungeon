// boss.js — «گولم‌لرد»: باس بزرگ (تا ۱۲۸px)، ۳ فاز رفتاری، ۳ حمله با تلگراف قرمز قبل از ضربه‌ی سنگین
import { drawBossPx } from './boss_px.js';
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

  // S9.6: بدنِ دست‌پیکسل (boss_px) — پا/تنه/سر/تاج/چکش + روکشِ فاز
  const ty = gy - 66;
  const hy = ty - 16 - inhale * 2 + (phase === 3 ? 2 : 0);
  const hAng = f.state === 'attack' ? armA : 0.45 + sin(f.time * 0.8) * 0.05;
  drawBossPx(g, { sx: Math.round(sx), gy: Math.round(gy), ty: Math.round(ty), hy: Math.round(hy), phase, warn, jaw, hAng, lean });
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
