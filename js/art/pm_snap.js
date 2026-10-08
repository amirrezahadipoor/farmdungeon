// art/pm_snap.js — S4.6b: قفلِ پالتِ صحنه (جبرانِ M5 پس از گریدینگِ S4.3)
// پس از گریدینگِ تم + آمیزشِ تاریکی، هر پیکسل به **نزدیک‌ترین رنگِ پالتِ مستر** می‌چسبد تا
// پوششِ پالت (M5) از افتِ گریدینگِ رندر-زمانی جبران شود (درس ۱۰۳: «نگاشتِ پالتی»).
// جدولِ ثابتِ ۵بیتی/کانال (۳۲³ = ۳۲٬۷۶۸ سلول) که **یک‌بار** با انتشارِ چمفر ساخته می‌شود (~۱ms).
import { PALETTE_MASTER } from './palette_master.js';

// پیش‌فرض **خاموش**: قفلِ پالت M5 را از ۱۰٫۶٪ به ۹۹٫۷٪ می‌برد ولی ~+۰٫۴۹ms در فریمِ دانجن
// می‌افزاید و فاصله‌ی تم‌ها را کم می‌کند ⇒ تصمیمِ روشن/خاموش با کاربر (ن۸۸ در MEMORY.md)
export const PM_SNAP = { on: true, sprites: true };   // S6.0/R3: قفلِ صحنه روشن شد (تصمیمِ کاربر پس از R3) — M5 دانجن ۱۱٫۶٪→۹۹٫۸٪                    // on: قفلِ صحنه (opt-in) · sprites: قفلِ اسپرایت‌ها در زمانِ پخت (S4.6c، ارزان)
export const SNAP_INFO = { n: 0, px: 0, moved: 0 };                      // شمارشِ اسنپِ اسپرایت (QA)
export const PM_SNAP_INFO = { built: 0, ms: 0, cells: 0, pal: 0 };      // شمارشِ ساخت (QA)

const N = 32, CELLS = N * N * N;
const _t = new Uint32Array(CELLS);                                      // بسته‌بندیِ ABGR (LE)
let _built = false;

function build() {
  const t0 = performance.now();
  const dist = new Float32Array(CELLS).fill(Infinity);
  const idx = new Int32Array(CELLS).fill(-1);
  const K = PALETTE_MASTER.length;
  for (let k = 0; k < K; k++) {                                          // بذرها: خودِ رنگ‌های پالت
    const c = PALETTE_MASTER[k];
    const cx = c[0] >> 3, cy = c[1] >> 3, cz = c[2] >> 3;
    const i = (cx << 10) | (cy << 5) | cz;
    const dx = (cx << 3 | 4) - c[0], dy = (cy << 3 | 4) - c[1], dz = (cz << 3 | 4) - c[2];
    const d = dx * dx + dy * dy + dz * dz;                               // فاصله تا مرکزِ سلول
    if (d < dist[i]) { dist[i] = d; idx[i] = k; }
  }
  // انتشارِ چمفر (۲ سوئیپ، همسایه‌ی ۶گانه درون‌خطی): وزنِ هر گامِ سلولی = ۸ واحد در یک کانال ⇒ ۸²=۶۴
  const W = 64;
  const step = (i, j) => {
    const dj = j, di = i;
    const k = idx[dj]; if (k < 0) return;
    const d2 = dist[dj] + W;
    if (d2 < dist[di]) { dist[di] = d2; idx[di] = k; }
  };
  for (let pass = 0; pass < 2; pass++) {
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) {
      const i = (x << 10) | (y << 5) | z;
      if (x > 0) step(i, i - 1024); if (y > 0) step(i, i - 32); if (z > 0) step(i, i - 1);
    }
    for (let x = N - 1; x >= 0; x--) for (let y = N - 1; y >= 0; y--) for (let z = N - 1; z >= 0; z--) {
      const i = (x << 10) | (y << 5) | z;
      if (x < N - 1) step(i, i + 1024); if (y < N - 1) step(i, i + 32); if (z < N - 1) step(i, i + 1);
    }
  }
  for (let i = 0; i < CELLS; i++) {
    const c = PALETTE_MASTER[idx[i] >= 0 ? idx[i] : 0];
    _t[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
  }
  _built = true; PM_SNAP_INFO.built++; PM_SNAP_INFO.ms = performance.now() - t0;
  PM_SNAP_INFO.cells = CELLS; PM_SNAP_INFO.pal = K;
  return _t;
}

export function pmSnapTable() { return _built ? _t : build(); }
export const pmSnapIdx = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); // اندیسِ سلولِ ۵بیتی
export function pmSnapColor(c) { const t = pmSnapTable(); return t[pmSnapIdx(c[0], c[1], c[2])]; } // برای سنجه/شیت

// ---------- S4.6c: یکسان‌سازیِ پالتِ اسپرایت‌ها با پالتِ مستر، **در زمانِ پخت** (صفر هزینه در فریم) ----------
// استراتژی: نگاشتِ **زنده‌مانندهٔ تنوع** — هر رنگِ اسپرایت به نزدیک‌ترین رنگِ پالت می‌رود، ولی رنگ‌های هم‌اسپرایت
// هرگز روی هم نمی‌افتند (انتخابِ نزدیک‌ترین «استفاده‌نشده») ⇒ تعدادِ پله‌های سایه (M3) حفظ می‌شود.
// فقط پیکسل‌های «مات» (alpha ≥ TH): پیکسل‌های نیم‌شفاف با پس‌زمینه آمیخته می‌شوند و رنگِ ذخیره‌شده‌شان معنا ندارد.
export const SNAP_TH = 200;
export const SNAP_DL = [3, 6, 12, Infinity];            // نوارهای حفظِ روشنایی (تنگ‌ترین اول) ⇒ خوانایی (M1) دست‌نخورده
const _map = new Map();                                 // نگاشتِ کلیدِ رنگ → رنگِ پالت (مشترکِ همه‌ی پخت‌ها)
const _key = (r, g, b) => (r << 16) | (g << 8) | b;
export function snapRaster(ras) {
  if (!PM_SNAP.sprites) return 0;
  const d = ras.d, P = PALETTE_MASTER, K = P.length;
  const hist = new Map();                                // هیستوگرامِ پیکسل‌های مات
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < SNAP_TH) continue; const k = _key(d[i], d[i + 1], d[i + 2]); hist.set(k, (hist.get(k) || 0) + 1); }
  if (!hist.size) return 0;
  const keys = [...hist.keys()].sort((a, b) => hist.get(b) - hist.get(a) || a - b); // پایدار و قطعی
  const used = new Set(), assign = new Map();
  for (const k of keys) {
    const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
    const cached = _map.get(k);
    if (cached !== undefined && !used.has(cached)) { assign.set(k, cached); used.add(cached); continue; }
    const L0 = r * 0.299 + g * 0.587 + b * 0.114;
    let bi = -1;                                         // «نزدیک‌ترینِ استفاده‌نشده» با نوارهای حفظِ روشنایی (M1)
    for (const band of SNAP_DL) {                        // از تنگ‌ترین نوار شروع کن؛ اولین نوارِ غیرخالی برنده است
      let bd = Infinity;
      for (let j = 0; j < K; j++) {
        const c = P[j], id = _key(c[0], c[1], c[2]);
        if (used.has(id)) continue;
        if (Math.abs(c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 - L0) > band) continue;
        const dr = r - c[0], dg = g - c[1], db = b - c[2], dd = (dr * dr + dg * dg + db * db) / 3;
        if (dd < bd) { bd = dd; bi = id; }
      }
      if (bi >= 0) break;
    }
    if (bi < 0) continue;                                // پالتِ پر (پیش نمی‌آید: ۱۲۸ > رنگ‌های یک اسپرایت)
    used.add(bi);
    if (cached === undefined) _map.set(k, bi);
    if (bi !== k) assign.set(k, bi);
  }
  if (!assign.size) return 0;
  let moved = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < SNAP_TH) continue;
    const t = assign.get(_key(d[i], d[i + 1], d[i + 2]));
    if (t === undefined) continue;
    d[i] = (t >> 16) & 255; d[i + 1] = (t >> 8) & 255; d[i + 2] = t & 255; moved++;
  }
  SNAP_INFO.n++; SNAP_INFO.px += 1; SNAP_INFO.moved += moved;
  return moved;
}
