// monsters.js — فریم نهایی هیولا: بدنه (monster_bodies) → rim-light → outline → فلش ضربه → سایه
// هر کدام ۴ حالت: idle / move / attack (با wind-up خوانا) / die + فلش سفید هنگام ضربه
// (اجزای مشترک در monster_parts.js — بدنه‌ها در monster_bodies.js)
import { Raster } from '../raster.js';
import { bake } from './bake.js';       // S6.1: خط لولهٔ واحدِ پخت (rim/outline/flash/shadow/snap)
import { MSPR, MOX, MOY, MC } from './monster_parts.js';
import { MBODY, MSHW } from './monster_registry.js'; // ن۴۷: رجیستری ادغام
import { rp } from './ramps.js'; // S1.5a: سایه از رمپ جوهری
import { motionFor, motionProxy, drawMotionFx } from './mob_motion.js'; // S6.3: idle زنده + anticipation حمله

// فریم نهایی: بدنه → rim-light → outline → فلش سفید → سایه‌ی نرم
export function drawMonsterFrame(kind, o) {
  const f = { state: o.state || 'idle', t: o.t ?? 0, ph: o.ph ?? 0, face: o.face ?? 1, time: o.time ?? 0 };
  const body = new Raster(MSPR, MSPR);
  const mv = motionFor(kind, f); // S6.3: فقط ظاهر — محرکِ t/ph (در کلید کش)
  MBODY[kind](motionProxy(body, mv, MOY), f);
  drawMotionFx(body, kind, f, mv);
  // S6.1: rim → outline → flash → سایهٔ ۵ باندی → snap پالت، همه از خط لولهٔ واحد
  const hiC = MC[kind + 'Hi'];
  const [sw, sh2] = MSHW[kind];
  const steps = [];
  if (hiC && f.state !== 'die' && !o.hit) steps.push({ op: 'rim', hi: hiC, lift: 0.62 });
  if (!o.hit) steps.push({ op: 'outline', mode: 'sel' });          // S1.7: یکدست برای همه‌ی کیندها (L≈۱۹)
  if (o.hit) steps.push({ op: 'flash', color: MC.white });
  steps.push({ op: 'shadow', spec: 'mob', size: [sw, sh2], x: MOX, y: MOY, color: rp('ink', 0) }); // S1.5a
  steps.push({ op: 'snap' });                                      // S4.6c: یکسان‌سازی با پالتِ مستر
  return bake(body, steps);
}
