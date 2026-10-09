// loot_table.js — دراپِ مبتنی بر «قدرتِ هیولا» (ن۱۳۹). هر هیولا می‌تواند هر بذر و هر آیتمِ پوشیدنی را بیندازد،
// ولی شانسِ چیزِ خوب با فاصله‌ی «سطحِ آن چیز» از قدرتِ هیولا به‌صورتِ نمایی سقوط می‌کند؛ ضعیف‌ها اغلب فقط EXP می‌دهند.
// قدرت p (به واحدِ طبقه) = طبقه + نخبه ۸ + باس ۲۰.
import { ITEMS } from './items.js';

// سطحی که هر بذر از آن به بعد «عادی» است
export const SEED_LVL = { carrot: 1, wheat: 6, pumpkin: 14, strawberry: 24, eggplant: 40, corn: 58 };
export const ITEM_LVL = { 1: 1, 2: 22, 3: 52 }; // tier ← سطح
const softW = (lvl, p, k) => (p >= lvl ? 1 : Math.exp(-(lvl - p) / k)); // زیرِ سطح: افتِ نمایی (k کوچک‌تر = سخت‌گیرتر)

export const powerOf = (floor, elite, boss) => floor + (elite ? 8 : 0) + (boss ? 20 : 0);

function pickW(w, R) { let s = 0; for (const k in w) s += w[k]; let r = R() * s; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return null; }

// چند بذر؟ (۰ = هیچ) — معمولیِ طبقه‌ی ۱: ۸٪ ؛ طبقه‌ی ۱۰۰: ۲۰٪ ؛ نخبه ×۱٫۸ ؛ باس ۷۰٪ (۱ یا ۲)
export function seedCount(p, elite, boss, R = Math.random) {
  if (boss) return R() < 0.7 ? 1 + (R() < 0.3 ? 1 : 0) : 0; // ن۱۴۰: حتی باس ممکن است پوچ باشد
  const ch = Math.min(0.6, (0.08 + 0.12 * Math.min(1, p / 100)) * (elite ? 1.8 : 1));
  return R() < ch ? 1 : 0;
}
export function rollSeed(p, R = Math.random) {
  const w = {}; for (const k in SEED_LVL) w[k] = softW(SEED_LVL[k], p, 3.5) * (SEED_LVL[k] <= p ? 1 + SEED_LVL[k] / 30 : 1); // بالای سطح: کمی ترجیحِ بهترین‌ها
  return pickW(w, R);
}
// آیتم: معمولی ۱٫۲٪→۴٫۲٪، نخبه ×۲٫۵، باس ۴۰٪
export function rollItem(p, elite, boss, R = Math.random) {
  const ch = boss ? 0.4 : Math.min(0.3, (0.012 + 0.03 * Math.min(1, p / 100)) * (elite ? 2.5 : 1)); // ن۱۴۰: کم‌یاب
  if (R() >= ch) return null;
  const w = {}; for (const id in ITEMS) w[id] = softW(ITEM_LVL[ITEMS[id].tier] || 1, p, 5);
  return pickW(w, R);
}
// برای تست/تعادل: احتمالِ دقیقِ هر بذر در قدرتِ p
export function seedOdds(p) { const w = {}; let s = 0; for (const k in SEED_LVL) { w[k] = softW(SEED_LVL[k], p, 3.5) * (SEED_LVL[k] <= p ? 1 + SEED_LVL[k] / 30 : 1); s += w[k]; } for (const k in w) w[k] /= s; return w; }
