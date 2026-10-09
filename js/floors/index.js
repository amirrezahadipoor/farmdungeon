// floors/index.js — رجیستریِ ۱۰۰ طبقه (ن۱۳۹). طبقه‌های طراحی‌شده از فایل‌های fXXX_YYY.js می‌آیند؛
// طبقه‌هایی که هنوز طراحیِ دستی ندارند spec موقتِ قطعی (بر اساسِ شماره‌ی طبقه) می‌گیرند تا بازی همیشه کامل باشد.
import { F001_010 } from './f001_010.js';
import { F011_020 } from './f011_020.js';
import { F021_040 } from './f021_040.js';
import { F041_060 } from './f041_060.js';
import { F061_080 } from './f061_080.js';
import { F081_100 } from './f081_100.js';
import { isBossFloor } from './tiers.js';

export const DESIGNED = { ...F001_010, ...F011_020, ...F021_040, ...F041_060, ...F061_080, ...F081_100 };
export const MAX_FLOOR = 100;
const LAYOUTS = ['scatter', 'chain', 'hub', 'grid', 'twin', 'ring'];

export function specFor(f) {
  if (DESIGNED[f]) return DESIGNED[f];
  const g = Math.min(1, f / 60), b = isBossFloor(f);
  return { name: null, layout: b ? 'ring' : LAYOUTS[(f * 7) % LAYOUTS.length], cols: 128, rows: 96, rooms: 16 + Math.round(4 * g),
    rw: [12, 20], rh: [9, 14], round: f % 4, pillars: 0.3, pools: 0.25, loops: 0.07, winding: f % 3 === 0, treasure: 2,
    empty: 0.22, dens: 1 + 0.4 * g, spokes: 3, boss: b, auto: true };
}
