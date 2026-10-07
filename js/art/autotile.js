// art/autotile.js — autotiling: mask4/mask8 + جدول ۴۷ تایلی (blob47) + کش لیزِ تایل ۱۶×۱۶ (S2.2)
// قاعده‌ی blob47 (استاندارد): بیتِ گوشه فقط وقتی معنا دارد که **هر دو ضلع مجاورش** پر باشند
// ⇒ از ۲۵۶ حالتِ همسایگیِ ۸-جهته دقیقاً ۴۷ حالتِ متمایز می‌ماند (۰..۴۶).
// شماره‌گذاری (قطعی): ترتیب صعودیِ ماسکِ ضلع‌ها (۰..۱۵)، سپس زیرمجموعه‌های گوشه‌های مجاز در ترتیب NE,SE,SW,NW.
// بیت‌های mask8: N=1 NE=2 E=4 SE=8 S=16 SW=32 W=64 NW=128 — بیت‌های mask4: N=1 E=2 S=4 W=8.
import { Raster } from '../raster.js';
import { TILE } from './palette_env.js';
import { groundSprite, KIND_ID } from './ground.js';
import { rp } from './ramps.js';

// pred(x,y) → bool؛ مسئولِ محدوده‌ی نقشه خودِ pred است (بیرون نقشه = false)
export function mask4(pred, tx, ty) {
  let m = 0;
  if (pred(tx, ty - 1)) m |= 1;
  if (pred(tx + 1, ty)) m |= 2;
  if (pred(tx, ty + 1)) m |= 4;
  if (pred(tx - 1, ty)) m |= 8;
  return m;
}
export function mask8(pred, tx, ty) {
  let m = 0;
  if (pred(tx, ty - 1)) m |= 1;
  if (pred(tx + 1, ty - 1)) m |= 2;
  if (pred(tx + 1, ty)) m |= 4;
  if (pred(tx + 1, ty + 1)) m |= 8;
  if (pred(tx, ty + 1)) m |= 16;
  if (pred(tx - 1, ty + 1)) m |= 32;
  if (pred(tx - 1, ty)) m |= 64;
  if (pred(tx - 1, ty - 1)) m |= 128;
  return m;
}
export function mirror8(m) { // آینه‌ی افقی: E↔W، NE↔NW، SE↔SW (N/S بی‌تغییر)
  return (m & 17) | ((m & 2) ? 128 : 0) | ((m & 4) ? 64 : 0) | ((m & 8) ? 32 : 0) |
    ((m & 32) ? 8 : 0) | ((m & 64) ? 4 : 0) | ((m & 128) ? 2 : 0);
}
export function canon8(m) { // گوشه‌ی بی‌پشتوانه حذف می‌شود (ضلع‌ها بی‌قید می‌مانند)
  let c = m & 85;                                   // N=1 E=4 S=16 W=64
  if ((m & 2) && (m & 1) && (m & 4)) c |= 2;        // NE ← N,E
  if ((m & 8) && (m & 4) && (m & 16)) c |= 8;       // SE ← E,S
  if ((m & 32) && (m & 16) && (m & 64)) c |= 32;    // SW ← S,W
  if ((m & 128) && (m & 64) && (m & 1)) c |= 128;   // NW ← W,N
  return c;
}
export const BLOB47 = new Int8Array(256).fill(-1);  // mask8 کانونیک → اندیس ۰..۴۶
export const IDX_MASK = new Uint8Array(47);         // اندیس → mask8 کانونیک (کدام ضلع‌ها/گوشه‌ها بسته‌اند)
export const BLOB_MIRROR = new Uint8Array(47);      // آینه‌ی هر اندیس (تقارن)
(function buildTables() {
  let idx = 0;
  for (let side = 0; side < 16; side++) {           // side: N=1 E=2 S=4 W=8
    const sN = side & 1, sE = side & 2, sS = side & 4, sW = side & 8;
    const cm = [];                                   // گوشه‌های مجاز + بیتِ ۸بیتی‌شان
    if (sN && sE) cm.push(2);
    if (sE && sS) cm.push(8);
    if (sS && sW) cm.push(32);
    if (sW && sN) cm.push(128);
    const v0 = (sN ? 1 : 0) | (sE ? 4 : 0) | (sS ? 16 : 0) | (sW ? 64 : 0);
    for (let k = 0; k < (1 << cm.length); k++) {
      let v = v0;
      for (let j = 0; j < cm.length; j++) if (k & (1 << j)) v |= cm[j];
      BLOB47[v] = idx; IDX_MASK[idx] = v; idx++;
    }
  }
  for (let i = 0; i < 47; i++) BLOB_MIRROR[i] = BLOB47[mirror8(IDX_MASK[i])];
})();
export function blob47(m) { return BLOB47[canon8(m)]; }

// ---------- کش لیزِ تایل ----------
const _cache = new Map();   // کلید عددی → تایل؛ در مسیر داغ نه رشته ساخته می‌شود نه آرایه
let _build = defBuild, _opaque = true;
export function setAutoBuilder(fn, opt = {}) {
  _build = fn || defBuild; _opaque = opt.opaque !== false; _cache.clear();
}
// سازنده‌ی پیش‌فرض (موقت تا S2.4/S2.6 جایگزین شود): پایه‌ی زمین + خطِ ۱px در ضلع‌های بی‌همسایه
function defBuild(r, id, kind, variant, theme) {
  groundSprite(kind, variant, false, 0, theme).over(r, 0, 0);
  const m = IDX_MASK[id], sh = rp('ink', 2);
  if (!(m & 1)) r.rect(0, 0, TILE, 1, sh);
  if (!(m & 4)) r.rect(TILE - 1, 0, 1, TILE, sh);
  if (!(m & 16)) r.rect(0, TILE - 1, TILE, 1, sh);
  if (!(m & 64)) r.rect(0, 0, 1, TILE, sh);
}
// idx = ۰..۴۶ از blob47؛ اگر ≥۴۷ بدهی، خودش mask8 فرض و تبدیل می‌شود
export function autoSprite(kind, idx, variant = 0, theme = 0) {
  const id = idx < 47 ? idx : blob47(idx);
  const kid = KIND_ID[kind] ?? 31;                             // ناشناخته ← سبد ۳۱
  const key = (((((theme & 7) << 4) | (variant & 15)) << 6) | id) * 32 + kid;
  let s = _cache.get(key);
  if (s) return s;
  s = new Raster(TILE, TILE);
  _build(s, id, kind, variant, theme);
  if (_opaque) s.markOpaque();
  _cache.set(key, s);
  return s;
}
export const autoCacheSize = () => _cache.size;
