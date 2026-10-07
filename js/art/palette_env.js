// tiles.js — تایل‌های ۱۶×۱۶ رویه‌ای (چمن/خاک/پرچین/آب/حصار) + محصولات ۴ مرحله‌ای + فونت پیکسلی ۳×۵
import { Raster } from '../raster.js';
import { rp } from './ramps.js';

export const TILE = 16;
export const COLS = 30, ROWS = 20;
export const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;

// پالت ثابت محیط
const P = {
  grass:'#4c8a4b', grassHi:'#5fa75e', grassBlade:'#6db75f', grassSh:'#3c6f3f',
  flowerW:'#e8e3d3', flowerY:'#e8c74a',
  soil:'#8a5a33', soilHi:'#a06c40', soilSh:'#6e4526', furrow:'#5a3820',
  soilWet:'#6f4a2b', soilWetHi:'#7f5836', soilWetSh:'#553720', wet:'#4f6fae',
  hedge:'#2e5b34', hedgeHi:'#437c44', hedgeSh:'#20422a', hedgeOut:'#16301e',
  water:'#3d6fae', waterHi:'#5b8fd4', waterSh:'#2c5488', sparkle:'#b8d6f2',
  wood:'#8a5a33', woodHi:'#a97b4e', woodSh:'#63401f',
  leaf:'#4f9a45', leafHi:'#66b358', leafSh:'#3a7a35', sprout:'#7cc069',
  carrot:'#e07b2f', carrotHi:'#f2974e',
  wheatG:'#7fa348', wheat:'#d4b04a', wheatHi:'#eccf6e', wheatSh:'#a8862f',
  pumpkin:'#d97f2e', pumpkinHi:'#efa14e', pumpkinSh:'#a85a1d', stem:'#5f7a3a',
  straw:'#e2485a', strawHi:'#ff8592', strawSh:'#a62e44',
  eggplant:'#8657c2', eggplantHi:'#a678e0', eggplantSh:'#5f3a92',
  corn:'#eec85a', cornHi:'#ffe58e', cornSh:'#c09a3a',
  gold:'#e6c74a', white:'#f2efe4',
  stone:'#5a5668', stoneHi:'#6e6a80', stoneSh:'#454253', brickOut:'#2b2838',
  brick:'#4a4458', brickHi:'#5a546c', torch:'#e8974a', torchHi:'#ffcf7a', essence:'#7ad0e8',
  heart:'#e06c8a', stairs:'#8a8496', stairsSh:'#5f5a6e', berry:'#d4506a', essenceSh:'#4a7488', bone:'#e8e4d8',
};
export const E = {};
for (const k in P) E[k] = [parseInt(P[k].slice(1, 3), 16), parseInt(P[k].slice(3, 5), 16), parseInt(P[k].slice(5, 7), 16), 255];

// ---------- S1.3: نگاشت به رمپ‌ها (منبع واحد رنگ) — کلیدهای E حفظ شده‌اند (سازگاری کامل) ----------
// انتخاب پله‌ها برای رعایت ΔL صحنه: چمن[4]↔خاک[3]=۱۴ · خاک↔راه(dust[4])=۱۴ · آب[3]↔چمن=۱۴ · محصول رسیده gold[5]/fire[5]↔خاک=۲۷
const PM_WHITE = [242, 239, 228, 255]; // سفید گرم ویژه (در پالت مستر — نه رمپ)
const EMAP = {
  grass: ['grass', 4], grassHi: ['grass', 5], grassBlade: ['grass', 6], grassSh: ['grass', 3],
  flowerW: ['__white', 0], flowerY: ['gold', 6],
  soil: ['soil', 3], soilHi: ['soil', 4], soilSh: ['soil', 2], furrow: ['soil', 1],
  soilWet: ['soilWet', 2], soilWetHi: ['soilWet', 3], soilWetSh: ['soilWet', 1], wet: ['water', 5],
  hedge: ['grass', 2], hedgeHi: ['grass', 3], hedgeSh: ['grass', 1], hedgeOut: ['grass', 0],
  water: ['water', 2], waterHi: ['water', 5], waterSh: ['water', 1], // آب↔چمن=۲۷ ✓ (S1.3)
  wood: ['soil', 5], woodHi: ['soil', 6], woodSh: ['soil', 3],
  leaf: ['leaf', 4], leafHi: ['leaf', 5], leafSh: ['leaf', 3], sprout: ['leaf', 6],
  stone: ['stoneCool', 4], stoneHi: ['stoneCool', 5], stoneSh: ['stoneCool', 3],
  berry: ['clothRed', 5], gold: ['gold', 6], stem: ['leaf', 3], wheatG: ['leaf', 4],
  wheat: ['gold', 5], wheatHi: ['gold', 6], wheatSh: ['gold', 4],
  carrot: ['fire', 5], carrotHi: ['fire', 6],
  pumpkin: ['fire', 5], pumpkinHi: ['fire', 6], pumpkinSh: ['fire', 4],
  straw: ['clothRed', 5], strawHi: ['clothRed', 6], strawSh: ['clothRed', 3],
  eggplant: ['clothPurple', 5], eggplantHi: ['clothPurple', 6], eggplantSh: ['clothPurple', 3],
  corn: ['gold', 5], cornHi: ['gold', 6], cornSh: ['gold', 4],
  // سنگ/آجر دانجن در S1.4 (DTHEME) — این‌جا فقط کلید مشترکِ ستون/حصار
};
for (const k in EMAP) { const m = EMAP[k]; E[k] = m[0] === '__white' ? PM_WHITE.slice() : rp(m[0], m[1]).slice(); }

export const h2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
const cache = new Map();
export function sprite(key, fn) {
  let s = cache.get(key);
  if (!s) { s = new Raster(TILE, TILE); fn(s); s.markOpaque(); cache.set(key, s); }
  return s;
}
