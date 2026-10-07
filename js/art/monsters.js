// monsters.js — فریم نهایی هیولا: بدنه (monster_bodies) → rim-light → outline → فلش ضربه → سایه
// هر کدام ۴ حالت: idle / move / attack (با wind-up خوانا) / die + فلش سفید هنگام ضربه
// (اجزای مشترک در monster_parts.js — بدنه‌ها در monster_bodies.js)
import { Raster } from '../raster.js';
import { applyRim } from './rim.js';
import { MSPR, MOX, MOY, MC } from './monster_parts.js';
import { MBODY, MOUT, MSHW } from './monster_registry.js'; // ن۴۷: رجیستری ادغام
import { rp } from './ramps.js'; // S1.5a: سایه از رمپ جوهری

// فریم نهایی: بدنه → rim-light → outline → فلش سفید → سایه‌ی نرم
export function drawMonsterFrame(kind, o) {
  const f = { state: o.state || 'idle', t: o.t ?? 0, ph: o.ph ?? 0, face: o.face ?? 1, time: o.time ?? 0 };
  const body = new Raster(MSPR, MSPR);
  MBODY[kind](body, f);
  // rim-light مشترک (art/rim.js)
  const hiC = MC[kind + 'Hi'];
  if (hiC && f.state !== 'die' && !o.hit) applyRim(body, hiC, 0.62);
  const oc = MOUT[kind];
  if (oc && !o.hit) body.outline(oc);
  if (o.hit) for (let y = 0; y < MSPR; y++) for (let x = 0; x < MSPR; x++) { const c = body.get(x, y); if (c && c[3] > 120) body.px(x, y, MC.white); }
  const out = new Raster(MSPR, MSPR);
  const [sw, sh2] = MSHW[kind];
  // S1.5a: سایه‌ی ۵ لایه (AO نرم + تماس) — ۵ باند آلفا برای M4؛ رنگ از رمپ جوهری
  const inkC = rp('ink', 0);
  const shC = (a) => [inkC[0], inkC[1], inkC[2], a];
  out.ellipse(MOX, MOY + 4, sw + 6, sh2 + 3, shC(24)); // هاله
  out.ellipse(MOX, MOY + 3, sw + 4, sh2 + 2, shC(44));
  out.ellipse(MOX, MOY + 3, sw + 2, sh2 + 1, shC(74));
  out.ellipse(MOX, MOY + 2, sw, sh2, shC(118));        // هسته
  out.ellipse(MOX, MOY + 1, sw - 2, Math.max(1, sh2 - 1), shC(168)); // تماس تیره
  body.over(out);
  return out;
}
