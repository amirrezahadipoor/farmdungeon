// art/gate.js — S5.5: دروازه‌ی دانجن روی مزرعه (لایه‌ی **داینامیک** روی طاقِ پخته‌ی زمین)
// طاق/آستانه/رون‌های پایه در `ground.js` (gateL/gateR) پخته می‌شوند؛ این‌جا فقط چیزهای زنده:
// گردابِ ۶ فریمی (۳ حلقه‌ی هم‌مرکز از رمپ `magicPurple`) · رون‌های پالس‌دارِ آرام · ≤۴ ذره‌ی ورودی.
// قاعده‌ها: همه‌ی اجزا روی **شبکه‌ی ۲px** (بلوکِ ۲×۲) ⇒ هیچ پیکسلِ منفرد و هیچ باقی‌مانده‌ی ۱px از هم‌پوشانی
// · رنگ فقط از رمپ‌ها · همه چیز داخلِ دهانه (هرگز روی سنگ) · پالسِ کوانتیزه (آرامش).
import { rp } from './ramps.js';

const TAU = Math.PI * 2;
export const GATE_BOX = { ox: 4, oy: 4, w: 24, h: 12 };   // دهانه (نسبت به گوشه‌ی بالا-چپِ دروازه‌ی ۲×۲)
const IN = { x0: 6, x1: 24, y0: 4, y1: 14 };              // ناحیه‌ی مجازِ بلوک‌ها (جفت‌عدد؛ ستونِ سنگ x≤۴ و x≥۲۷، حاشیه‌ی ۱ بلوک)
// [rx, ry, تعداد بلوک، پله‌ی پایه‌ی رمپ] — حلقه‌ها متناوب می‌چرخند (حسِ گرداب)
const RINGS = [[10, 4, 7, 1], [8, 3, 6, 2], [5, 2, 5, 3]];   // پله‌های پایه تاریک‌تر ⇒ دهانه تیره می‌ماند (ΔL)
const RUNE = [[8, 0], [16, 2], [24, 0], [2, 8], [30, 8], [16, 20]]; // بلوک‌های رون روی سنگِ طاق/ستون/دهانهٔ پایین
const sc2 = (v) => (Math.round(v / 2) * 2);                // snapping به شبکه‌ی ۲px (هم‌ترازیِ کاملِ بلوک‌ها)

export function drawGate(r, gx, gy, time) {
  const cx = gx + 16, cy = gy + 10;
  const f = Math.floor(time * 1.2) % 6;                            // ۶ فریمِ گرداب (~۱٫۲fps)
  const pulse = Math.floor((Math.sin(time * 0.75) + 1) * 0.75);    // ۰..۱ پلهٔ روشنایی (نفسِ آرام)
  // ---- گرداب: ۳ حلقه‌ی بلوکی، جهاتِ متناوب ----
  for (let i = 0; i < RINGS.length; i++) {
    const [rx, ry, n, base] = RINGS[i];
    const col = rp('magicPurple', Math.min(6, base + pulse));
    const ph = (i % 2 ? -1 : 1) * f * (TAU / 6);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + ph;
      const px = Math.max(gx + IN.x0, Math.min(gx + IN.x1, sc2(cx + Math.cos(a) * rx)));
      const py = Math.max(gy + IN.y0, Math.min(gy + IN.y1, sc2(cy + Math.sin(a) * ry)));
      r.rect(px, py, 2, 2, col);                                   // بلوکِ ۲×۲ (شبکه‌ی کامل)
    }
  }
  r.rect(sc2(cx), sc2(cy) - 2, 2, 2, rp('magicPurple', 5 + pulse)); // هسته‌ی ۲×۲ (روشن‌ترین نقطه)
  // ---- ذراتِ ورودی (۴ بلوک، پله‌های ۰٫۵s ⇒ سهمِ آرامش ~صفر) ----
  for (let k = 0; k < 4; k++) {
    const c = Math.floor(time * 2 + k * 1.7) % 6;
    const rr = (5 - c) * 0.5 + 0.7;                                // از لبه به سمتِ هسته
    const a = (c / 6) * TAU + k * 2.2;
    const px = Math.max(gx + IN.x0, Math.min(gx + IN.x1, sc2(cx + Math.cos(a) * 9 * rr)));
    const py = Math.max(gy + IN.y0, Math.min(gy + IN.y1, sc2(cy + Math.sin(a) * 4 * rr)));
    r.rect(px, py, 2, 2, k % 2 ? rp('magicCyan', 5) : rp('magicPurple', 5));
  }
  // ---- رون‌های پالس‌دار روی سنگِ طاق (۲ از ۳ چرخه روشن — تغییری آرام) ----
  const tick = Math.floor(time * 0.6);
  for (let i = 0; i < RUNE.length; i++) {
    const [dx, dy] = RUNE[i];
    const on = (tick + i) % 3 !== 0;
    r.rect(gx + dx, gy + dy, 2, 2, on ? rp('magicCyan', 6) : rp('magicCyan', 5));
  }
}
