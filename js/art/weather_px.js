// art/weather_px.js — S9.8: آب‌وهوای دست‌پیکسل — قطره‌ی ۳ گونه، تاجِ شتکِ ۳ فریمی، صاعقه‌ی پله‌ای از قطعه‌های دستی،
// و فلشِ «پالت‌امن» (هر پیکسل به نزدیک‌ترین رنگِ پالتِ روشن‌شده می‌رود ⇒ M5 در فریمِ فلش هم سالم).
import { PALETTE_MASTER, nearestPM } from './palette_master.js';

const hex = (h) => { const c = nearestPM(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)); return [c[0], c[1], c[2], 255]; };
const W = hex('#eef2f7'), L = hex('#aeb9c8'), B = hex('#6fa3d8'), D = hex('#3e6fae'), Y = hex('#ffe082');
const PAL = { w: W, l: L, b: B, d: D, y: Y };
function blit(r, rows, x, y) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = PAL[rows[j][i]]; if (c) r.px(x + i, y + j, c); }
}

// ---- قطره‌ها: سه نقشه‌ی دستی (رگه‌ی بلند/کوتاه/ریز) — کجیِ پله‌ایِ ۱px با باد ----
const DROP = [['.l', '.b', 'b.', 'd.'], ['.l', 'b.', 'd.'], ['l', 'd']];
const SPLASH = [['.l.', 'b.b'], ['l...l', '.b.b.', '..d..'], ['w.....w', '.......', '.l...l.']];
const N = 26, DR = [];
for (let i = 0; i < N; i++) DR.push({ hx: ((i * 149 + 17) % 233) / 233, hy: ((i * 71 + 121) % 197) / 197, v: 70 + (i % 4) * 18, k: i % 3, land: 0.55 + ((i * 37) % 41) / 100 });
const WR = (v, m) => ((v % m) + m) % m;
export function drawRainPx(r, time, n = N) {
  for (let i = 0; i < n; i++) {
    const d = DR[i], H = r.h * d.land;                        // هر قطره کفِ خودش را دارد (عمقِ صحنه)
    const cyc = H + 12, t = WR(d.hy * cyc + time * d.v, cyc);
    const x = Math.round(WR(d.hx * r.w - time * 12, r.w));
    if (t < H) blit(r, DROP[d.k], x, Math.round(t) - 4);
    else { const f = Math.min(2, ((t - H) / 4) | 0); blit(r, SPLASH[f], x - SPLASH[f][0].length / 2 | 0, Math.round(H) - 1); }
  }
}

// ---- فلشِ پالت‌امن: شبکه‌ی ۱۵بیتی → اندیسِ رنگِ پالتِ روشن‌شده (تنبل، یک‌بار برای هر خانه/شدت) ----
const _F = new Map();
export function flashPal(r, k) {
  const f = 0.26 * k, key = Math.round(f * 100);
  let g = _F.get(key); if (!g) { g = new Int16Array(32768).fill(-1); _F.set(key, g); }
  const d = r.d;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const q = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    let p = g[q];
    if (p < 0) {
      const R = d[i] + (255 - d[i]) * f, G = d[i + 1] + (255 - d[i + 1]) * f, Bc = d[i + 2] + (255 - d[i + 2]) * f;
      const c = nearestPM(R, G, Bc); p = PALETTE_MASTER.indexOf(c); g[q] = p;
    }
    const c = PALETTE_MASTER[p]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
}

// ---- صاعقه: زنجیره‌ای از قطعه‌های دستیِ پله‌ای (هر قطعه ۸ ردیف) + یک شاخه؛ مغز سفید، هاله‌ی آبی‌روشن ----
const SEG = [
  ['.lwl.', '.lwl.', '..lwl', '..lwl', '.lwl.', 'lwl..', 'lwl..', '.lwl.'],     // تابِ راست-چپ
  ['.lwl..', '..lwl.', '...lwl', '...lwl', '..lwl.', '..lwl.', '.lwl..', '.lwl..'],
  ['..lwl', '.lwl.', 'lwl..', 'lwl..', '.lwl.', '.lwl.', '..lwl', '..lwl'],
  ['.lwl.', 'lwl..', 'lwl..', 'lwwl.', '.lwwl', '..lwl', '..lwl', '.lwl.'],
];
const BRANCH = ['lwl...', '.lwl..', '..lwl.', '...lb.', '....b.', '.....b'];
const FORK = ['lwwl', 'l.lwl', '...lb', '....b'];
export function drawBoltPx(r, time) {
  const seed = Math.floor(time / 9);
  const h = (n) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  let x = 30 + Math.floor(h(1) * (r.w - 60));
  const bottom = Math.floor(r.h * 0.55), segs = Math.ceil(bottom / 8), br = 2 + ((h(9) * 3) | 0);
  for (let i = 0; i < segs; i++) {
    const s = SEG[(h(i + 2) * SEG.length) | 0];
    blit(r, s, x - 2, i * 8);
    const endShift = s[7].indexOf('w') - s[0].indexOf('w');      // پیوستگی: سرِ قطعه‌ی بعد روی تهِ قبلی
    x = Math.max(6, Math.min(r.w - 8, x + endShift));
    if (i === br) blit(r, BRANCH, x, i * 8 + 6);
  }
  blit(r, FORK, x - 2, segs * 8);
}
