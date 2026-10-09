// monster_registry.js — رجیستری ادغام بدنه‌ها: کلاسیک (۷) + ن۴۴ (۷) — تک‌منبع انتخاب kind (ن۴۷)
import { MBODY_A, MOUT_A, MSHW_A } from './monster_bodies.js';
import { MBODY2, MOUT2, MSHW2 } from './monster_bodies2.js';
import { MBODY_PX } from './mob_px.js';
import { MBODY_PX2 } from './mob_px2.js'; // S9.5 // S9.4: بدنه‌های دست‌پیکسل جایگزینِ رویه‌ای
export const MBODY = Object.assign({}, MBODY_A, MBODY2, MBODY_PX, MBODY_PX2);
export const MOUT = Object.assign({}, MOUT_A, MOUT2);
export const MSHW = Object.assign({}, MSHW_A, MSHW2);
