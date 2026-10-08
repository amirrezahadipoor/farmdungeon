// art/pm_snap.js — S4.6b: قفلِ پالتِ صحنه (جبرانِ M5 پس از گریدینگِ S4.3)
// پس از گریدینگِ تم + آمیزشِ تاریکی، هر پیکسل به **نزدیک‌ترین رنگِ پالتِ مستر** می‌چسبد تا
// پوششِ پالت (M5) از افتِ گریدینگِ رندر-زمانی جبران شود (درس ۱۰۳: «نگاشتِ پالتی»).
// جدولِ ثابتِ ۵بیتی/کانال (۳۲³ = ۳۲٬۷۶۸ سلول) که **یک‌بار** با انتشارِ چمفر ساخته می‌شود (~۱ms).
import { PALETTE_MASTER } from './palette_master.js';

// پیش‌فرض **خاموش**: قفلِ پالت M5 را از ۱۰٫۶٪ به ۹۹٫۷٪ می‌برد ولی ~+۰٫۴۹ms در فریمِ دانجن
// می‌افزاید و فاصله‌ی تم‌ها را کم می‌کند ⇒ تصمیمِ روشن/خاموش با کاربر (ن۸۸ در MEMORY.md)
export const PM_SNAP = { on: false };                                   // توگل (QA/A-B)
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
