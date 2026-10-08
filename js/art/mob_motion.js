// mob_motion.js — S6.3: لایه‌ی حرکتِ مشترکِ موب‌ها (idle زنده + anticipation سه‌بخشیِ حمله) — فقط ظاهر
// محرک‌ها فقط f.t و f.ph (هر دو در کلید کش اسپرایت هستند) — f.time عمداً مصرف نمی‌شود تا کش سازگار بماند.
// جابه‌جایی/قیچی (shear) به ترسیمِ بدنه تزریق می‌شود و rim/outline پس از آن می‌پیچند ⇒ سیلوئت همیشه سالم می‌ماند.
import { MOX, MOY, MC, wind } from './monster_parts.js';

const sin = Math.sin, PI = Math.PI;

// idle: [ampPx, freq] — نوسانِ عمودیِ تنفس/وزن (گولم: بلندشدنِ کند · باس: نفسِ سنگین)
const IDLE = {
  slime: [1.2, 1.5], bat: [1.0, 2.6], wolf: [1.0, 1.7], skeleton: [1.0, 1.9],
  golem: [2.0, 0.7], spider: [1.0, 2.3], ghost: [1.6, 0.9], mummy: [1.0, 1.1],
  archer: [1.0, 1.7], ram: [1.0, 1.5], yeti: [1.2, 0.9], imp: [1.4, 2.4],
  bandit: [1.0, 2.0], hare: [1.4, 2.8], boss: [1.8, 0.55],
};
// قیچیِ بالاتنه در idle (پیکسل در بالاترین نقطه) — خرگوش: تکانِ سریعِ گوش · بقیه: نَفَسِ آرام
const IDLE_SHEAR = { hare: 1.7, boss: 0.8, golem: 0.6, imp: 0.8 };

// حمله‌ی سه‌بخشی از f.t: [dyWindup, shearWindup(عقب), shearStrike(جلو)] — windup<0.34 → ضربه 0.34..0.58 → recover
const ATK = {
  skeleton: [1.2, -2.4, 2.8], archer: [1.2, -2.8, 2.4],
  default: [0.8, -1.8, 2.2],
};

// وضعیتِ حرکتی هر فریم: جابه‌جایی/قیچی + پرچمِ جزئیات (ash/dust)
export function motionFor(kind, f) {
  const mv = { dx: 0, dy: 0, sh: 0, ash: 0, dust: 0 };
  if (f.state === 'die') return mv; // مرده نفس نمی‌کشد
  if (f.state === 'idle' || f.state === 'cool') {
    const [amp, fr] = IDLE[kind] || [1, 1.4];
    mv.dy = sin(f.t * fr * 2 * PI) * amp;
    mv.sh = sin(f.t * fr * 2.2 * PI + 1.1) * (IDLE_SHEAR[kind] || 0.3);
    if (kind === 'boss') mv.ash = 1;
    if (kind === 'golem') mv.dust = 1;
    return mv;
  }
  if (f.state === 'attack') {
    const [dyW, shW, shS] = ATK[kind] || ATK.default;
    if (f.t < 0.34) { const e = wind(f.t, 0.34); mv.dy = e * dyW; mv.sh = e * shW; }        // ۲ فریمِ جمع‌شدن/عقب‌کشی
    else if (f.t < 0.58) { const e = (f.t - 0.34) / 0.24; mv.dy = dyW * (1 - e); mv.sh = shW + (shS - shW) * e; } // ضربه
    else { const e = wind(f.t - 0.58, 0.42); mv.sh = shS * (1 - e); }                        // recover
  }
  return mv;
}

// پروکسیِ رستر: همه‌ی فراخوانی‌های ترسیم را با dx/dy/shear منتقل می‌کند (بدون مقیاس — فقط جابه‌جایی)
export function motionProxy(r, mv, oy = MOY) {
  const tr = (x, y) => {
    const k = Math.max(0, Math.min(1.6, (oy - y) / 22));
    return [x + mv.dx + mv.sh * k, y + mv.dy];
  };
  return {
    px: (x, y, c) => { const [X, Y] = tr(x, y); r.px(X, Y, c); },
    line: (x1, y1, x2, y2, c) => { const a = tr(x1, y1), b = tr(x2, y2); r.line(a[0], a[1], b[0], b[1], c); },
    lineW: (x1, y1, x2, y2, w, c) => { const a = tr(x1, y1), b = tr(x2, y2); r.lineW(a[0], a[1], b[0], b[1], w, c); },
    rect: (x, y, w, h, c) => { const a = tr(x, y + h / 2); r.rect(a[0], a[1] - h / 2, w, h, c); },
    ellipse: (x, y, rx, ry, c) => { const a = tr(x, y); r.ellipse(a[0], a[1], rx, ry, c); },
  };
}

// جزئیاتِ افزوده روی رسترِ نهایی (پیش از bake): خاکسترِ باس · غبارِ پای گولم
export function drawMotionFx(r, kind, f, mv, ox = MOX, oy = MOY) {
  if (mv.ash) {
    for (let i = 0; i < 3; i++) { // ذراتِ معلقِ قطعی از t
      const x = ox + Math.round(sin(f.t * 1.1 + i * 2.1) * 14) + (i - 1) * 8;
      const y = oy - 92 - i * 7 + Math.round(sin(f.t * 0.8 + i * 1.7) * 3);
      r.px(x, y, i === 1 ? MC.bossGold : MC.ember);
    }
  }
  if (mv.dust) {
    const k = Math.round(f.t * 3) % 2;
    r.px(ox - 11 + k * 2, oy - 2, MC.dust);
    r.px(ox + 9 - k * 2, oy - 3, MC.dust);
  }
}
