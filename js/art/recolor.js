// art/recolor.js — تعویض پالت اسپرایت (پایه برای شخصیت‌های مشتق: کارگر مزرعه و بعدی‌ها)
import { PAL } from './palette_hero.js';
import { Raster } from '../raster.js';

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// نقشه‌ی تعویض رنگ «کارگر مزرعه»: کاپشن آبی → روپوش سبز، مو → کلاه حصیری، شال → دستمال
const WORKER_SWAP = new Map(); // 'r,g,b' → [r,g,b]
{
  const pairs = [
    [PAL.jacketHi, PAL.pantsHi], [PAL.jacket, PAL.pants], [PAL.jacketSh, PAL.pantsSh], [PAL.jacketDeep, PAL.hairSh],
    [PAL.pantsHi, PAL.bootHi], [PAL.pants, PAL.boot], [PAL.pantsSh, PAL.bootSh],
    [PAL.hair, PAL.hat], [PAL.hairSh, PAL.hatSh],
    [PAL.scarf, PAL.shirt], [PAL.scarfSh, PAL.shirtSh],
  ];
  for (const [a, b] of pairs) WORKER_SWAP.set(hexRGB(a).join(','), hexRGB(b));
}

const WORKER2_SWAP = new Map(); // کارگر دوم: کاپشن آبی → حنایی، دستمال → قهوه‌ای (کلاه حصیری ندارد)
{
  const pairs = [
    [PAL.jacketHi, PAL.hatHi], [PAL.jacket, PAL.hat], [PAL.jacketSh, PAL.hatSh], [PAL.jacketDeep, PAL.hairSh],
    [PAL.scarf, PAL.boot], [PAL.scarfSh, PAL.bootSh],
  ];
  for (const [a, b] of pairs) WORKER2_SWAP.set(hexRGB(a).join(','), hexRGB(b));
}

const MERCHANT_SWAP = new Map(); // تاجرِ دوره‌گرد: ردای قرمز، شالِ کرم، کلاهِ حصیری
{
  const pairs = [
    [PAL.jacketHi, PAL.scarf], [PAL.jacket, PAL.scarf], [PAL.jacketSh, PAL.scarfSh], [PAL.jacketDeep, PAL.hairSh],
    [PAL.scarf, PAL.shirt], [PAL.scarfSh, PAL.shirtSh], [PAL.hair, PAL.hairSh],
  ];
  for (const [a, b] of pairs) MERCHANT_SWAP.set(hexRGB(a).join(','), hexRGB(b));
}

export function recolorWorker(s, variant = 0) {
  const map = variant === 2 ? MERCHANT_SWAP : variant ? WORKER2_SWAP : WORKER_SWAP;
  const t = new Raster(s.w, s.h);
  t.d.set(s.d);
  for (let i = 0; i < t.d.length; i += 4) {
    if (t.d[i + 3] < 8) continue;
    const to = map.get(t.d[i] + ',' + t.d[i + 1] + ',' + t.d[i + 2]);
    if (to) { t.d[i] = to[0]; t.d[i + 1] = to[1]; t.d[i + 2] = to[2]; }
    else if (variant === 2) { // تاجر: هر رنگِ آبیِ کاپشن (پیکسل‌های AI خارج از PAL) → ردای قرمزِ هم‌روشنا
      const r = t.d[i], g = t.d[i + 1], b = t.d[i + 2];
      if (b > r + 18 && b >= g) { t.d[i] = Math.min(255, b + 20); t.d[i + 1] = r * 0.55 | 0; t.d[i + 2] = r * 0.6 | 0; }
    }
  }
  return t;
}
