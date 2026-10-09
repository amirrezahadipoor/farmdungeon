// dungeon_bake.js — خط لوله‌ی پختِ لایه‌ایِ طبقه‌ی دانجن (S3.1 — Parity-first)
// ترتیبِ پاس‌ها **ثابت** است و هر پاس تابعِ جداست:
//   ۱ base → ۲ wallMass (S3.2) → ۳ floorPattern (S3.4) → ۴ AO (S3.5) → ۵ decals (S3.6) → ۶ staticProps (S3.7/3.8)
// در این نشست فقط زیرساخت ساخته شد: پاس‌های S3.2+ یا خالی‌اند یا **هم‌ارزِ رفتارِ قبلی**
// ⇒ خروجیِ کش بایت‌به‌بایت همانِ `buildFloorCache` قدیمی است (پذیرشِ S3.1).
import { groundSprite, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { Raster } from './raster.js';
import { drawAO } from './art/dungeon_depth.js'; // S3.5
import { drawDungeonDecals } from './art/dungeon_decal.js'; // S3.6
import { DPAL } from './art/ground.js';
import { mask8, blob47, IDX_MASK, autoSprite, setAutoBuilder } from './art/autotile.js';
import { drawFront, drawTopFace, pickPattern } from './art/brick.js'; // S3.3
import { drawFlagstones } from './art/flagstone.js'; // S3.4
import { bayer4 } from './art/dither.js'; // S8.1: درزِ دیترشده (بافتِ درونِ تایل زنده می‌ماند)

// ۱ — پایه: تایلِ زمینِ هر سلول با تمِ طبقه + فرشِ autotile (S3.8)
const isCarpet = (D, x, y) => { const c = D.cell(x, y); return !!c && c.kind === 'decor' && c.v === 5; };
function passBase(cache, D) {
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const c = D.cell(tx, ty);
    // S3.8: فرشِ تالار — mask4 از همسایه‌های هم‌جنس (variant = 40+mask) ⇒ لبه فقط روی ضلعِ بی‌همسایه
    const v = (c.kind === 'decor' && c.v === 5)
      ? 40 + ((isCarpet(D, tx, ty - 1) ? 1 : 0) | (isCarpet(D, tx + 1, ty) ? 2 : 0) | (isCarpet(D, tx, ty + 1) ? 4 : 0) | (isCarpet(D, tx - 1, ty) ? 8 : 0))
      : c.v;
    groundSprite(c.kind, v, false, 0, D.theme).over(cache, tx * TILE, ty * TILE); // تم طبقه (ن۳۲)
  }
}

// ---------- ۲ — توده‌ی دیوار: رو/نما + autotile ۸-همسایه (S3.2) ----------
// بیت‌های mask8: N=۱ NE=۲ E=۴ SE=۸ S=۱۶ SW=۳۲ W=۶۴ NW=۱۲۸
const BN = 1, BE = 4, BS = 16, BW = 64, BNE = 2, BSE = 8, BSW = 32, BNW = 128;
// «باز» = هر سلولی که دیوار/ستون نیست (کف، پله، دکور، آب)؛ بیرونِ نقشه بسته است
const openAt = (D, x, y) => { const c = D.cell(x, y); return !!c && c.kind !== 'wall' && c.kind !== 'pillar'; };
// فاصله‌ی هر تایل تا نزدیک‌ترین فضای باز (BFS ۴-همسایه) ⇒ عمقِ توده برای گرادیانِ تاریکی
function wallDepth(D) {
  const dep = new Int8Array(COLS * ROWS);
  const q = new Int32Array(COLS * ROWS);
  let qn = 0;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const i = ty * COLS + tx;
    if (openAt(D, tx, ty)) { dep[i] = 0; q[qn++] = i; } else dep[i] = -1;
  }
  for (let head = 0; head < qn; head++) {
    const i = q[head], x = i % COLS, y = (i / COLS) | 0, d = dep[i] + 1;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const j = ny * COLS + nx;
      if (dep[j] !== -1) continue;
      dep[j] = d; q[qn++] = j;
    }
  }
  return dep;
}
// لبه‌ی ۱–۲px در ضلع‌هایی که کنارِ کف‌اند: تُنِ بیرونی هم‌تراز با لبه‌ی کفِ مقابل (⇒ M8 صفر)،
// و یک پیکسلِ داخل‌تر: پُختِ روشن در N/W (نور بالا-چپ) یا سایه در E (لبه‌ی سمت راست). گوشه‌ها گرد.
function drawRim(r, m, P) {
  // لایه‌ی درونی (پُخت/سایه) ۲px در گوشه عقب می‌نشیند ⇒ گوشه‌ی گرد؛ لایه‌ی بیرونی تمامِ ضلع را می‌پوشاند ⇒ M8 صفر
  const lo = (ok) => ok ? 1 : 3, hi = (ok) => ok ? TILE - 1 : TILE - 3;
  if (m & BN) {
    r.rect(0, 0, TILE, 1, P.brickHi);
    r.rect(lo(m & BW), 1, hi(m & BE) - lo(m & BW) + 1, 1, P.stone);
  }
  if (m & BW) {
    r.rect(0, 0, 1, TILE, P.brickHi);
    r.rect(1, lo(m & BN), 1, hi(m & BS) - lo(m & BN) + 1, P.stone);
  }
  if (m & BE) {
    // ن۱۰۹ (S8.1): تُنِ بیرونی = همان تُنِ لبه‌ی کفِ مقابل (floorB) و ستونِ بعدی میانجی با بدنه (brickHi)
    // ⇒ شکافِ مرز از ۲۸–۵۵ واحد L به ~۰ می‌رسد (M8/M6) و خطِ تیره‌ی brickOut حذف می‌شود (سایه‌ی مصنوعی).
    r.rect(TILE - 1, 0, 1, TILE, P.floorB);
    r.rect(TILE - 2, lo(m & BN), 1, Math.max(1, hi(m & BS) - 4 - lo(m & BN) + 1), P.brickHi);
  }
  // S دست‌نخورده: لبه‌ی روشن + سایه‌ی روی کف را پاسِ AO می‌کشد (S3.5 جایگزین می‌شود)
}
// سازنده‌ی مشترکِ کشِ لیزِ autotile — فقط **لبه** (نما/رو در S3.3 به بریک منتقل شد: بافت به مختصاتِ جهان نیاز دارد)
// تا زمانی که پاس‌های بعد (S3.4/S3.6) چیزی بخواهند، همین‌جا گسترش می‌یابد
setAutoBuilder((r, id, kind, variant, theme) => {
  if (kind !== 'wallMass') return;
  drawRim(r, IDX_MASK[id], DPAL(theme | 0));
}, { opaque: false });
function passWallMass(cache, D) {
  const theme = D.theme | 0, dep = wallDepth(D), P = DPAL(theme);
  for (let ty = 0; ty < ROWS; ty++) {
    let pat = null;   // الگو **per ردیفِ دیوار** (run) ⇒ رج‌های افقی در امتدادِ یک دیوارِ دراز پیوسته می‌مانند
    for (let tx = 0; tx < COLS; tx++) {
      const c = D.cell(tx, ty);
      if (c.kind !== 'wall') { pat = null; continue; }
      if (openAt(D, tx, ty + 1)) {          // «نما» فقط وقتی تایلِ جنوبی باز است
        if (!pat) pat = pickPattern(tx, ty, theme);
        drawFront(cache, tx * TILE, ty * TILE, P, theme, tx, ty, pat);
      } else {
        pat = null;
        drawTopFace(cache, tx * TILE, ty * TILE, P, theme, tx, ty, Math.min(3, dep[ty * COLS + tx]));
      }
      const id = blob47(mask8((x, y) => openAt(D, x, y), tx, ty));
      autoSprite('wallMass', id, 0, theme).over(cache, tx * TILE, ty * TILE);
    }
  }
}

// ۳ — کف: سنگفرشِ مقیاس-جهان + ترکِ پیوسته (S3.4)
function passFloorPattern(cache, D) { drawFlagstones(cache, D, D.theme | 0); }

// ۴ — AO و سایه‌ی تماسی (S3.5): نوار ۴px با گرادیان Bayer + سایه‌ی SE پراپ‌های ایستا
function passAO(cache, D) { drawAO(cache, D, D.theme | 0); }

// ۵ — دکال‌ها و فرسودگی per تم (S3.6): خوشه‌های ۳–۸px + آویزانِ لبه‌ی دیوار
function passDecals(cache, D) { drawDungeonDecals(cache, D, D.theme | 0); }

// ۶ — پراپ‌ها و سازه‌های ایستا (S3.7/3.8) — فعلاً خالی
function passStaticProps() {}

// ---------- ۷ — درزگیرِ مرزهای عمودی (S8.1) ----------
// چرا این‌جا و نه در لبه‌ی پخت؟ چون روشنیِ دو سویِ مرز با تم، الگوی سنگفرش و سایه‌ی تماسی (AO) عوض
// می‌شود؛ یک تُنِ ثابت برای همه جا جواب نمی‌دهد (اندازه‌گیریِ پیش از این پاس: شکاف تا ۵۵ واحد L روی
// تم‌های ۳–۵ و ۲۴ واحد روی مرزِ کف↔دکور در همه‌ی تم‌ها).
// روش: پیکسل‌های سمتِ «کف» با **پله‌ای از همان رمپِ تم** بازنویسی می‌شوند تا از تُنِ لبه‌ی مقابل تا
// تُنِ درونِ کف یک شیبِ ۲–۳ پیکسلی بسازند ⇒ هر جهش ≤ نیم/یک‌سومِ شکاف (M8 صفر، درزِ M6 پایین).
// لبه‌ی خودِ توده/دکور/فرش دست‌نخورده می‌ماند (مرزِ تیزِ فرش و خطِ توده حفظ می‌شود) و رنگ‌ها همچنان
// روی رمپ‌اند (M5 دست‌نخورده). فقط مرزهایی که واقعاً سخت‌اند (>۱۵ واحد L) دست می‌خورند.
const SEAM_MAX = 12; // سخت‌گیرانه‌تر از آستانه‌ی M8 (۱۵) ⇒ نسبتِ درزِ M6 هم پایین می‌آید
const lum3 = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const isFloor = (c) => !!c && (c.kind === 'dfloor' || c.kind === 'water' || c.kind === 'stairs');
let _seamCand = null, _seamT = -1;
function seamCand(theme) {
  if (_seamT === theme) return _seamCand;
  const P = DPAL(theme | 0);
  const set = new Set();
  for (const c of [P.brickOut, P.deep, P.mortar, P.brick, P.brickHi, P.stoneSh, P.floorA, P.floorB, P.cap, P.stone, P.stoneHi]) set.add(c);
  _seamT = theme;
  return _seamCand = [...set].map((c) => [c, lum3(c)]).sort((a, b) => a[1] - b[1]);
}
const _pick = (cand, L) => { let b = cand[0][0], bd = Infinity; for (const [c, cl] of cand) { const d = Math.abs(cl - L); if (d < bd) { bd = d; b = c; } } return b; };
function passSeam(cache, D) {
  const theme = D.theme | 0, cand = seamCand(theme), d = cache.d, w = cache.w;
  const put = (x, y, c) => { if (x < 0 || x >= w) return; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  // پیکسلِ مرزی **یک‌دست** می‌شود (جهشِ M8 باید برود)؛ پله‌های داخلی **دیتر** می‌شوند تا
  // بافتِ درونِ تایل زنده بماند و مخرّجِ M6 (میانگین اختلافِ ستون‌های غیرمرزی) نیفتد.
  const dit = (x, y, pr, c) => { if (bayer4(x, y) < pr) put(x, y, c); };
  // جابه‌جاییِ تُن **با حفظِ بافت**: پیکسل به تُنِ هدف می‌رود اما انحرافش از تُنِ مرجعِ همان تایل
  // (تُنِ درونِ کف) نگه داشته می‌شود ⇒ دانه/لکّه‌ی تایل زنده می‌ماند و مخرّجِ M6 نمی‌افتد (ن۴۰).
  const shift = (x, y, tgt, ref, k) => put(x, y, _pick(cand, tgt + k * (L(x, y) - ref)));
  const L = (x, y) => { const i = (y * w + x) * 4; return lum3([d[i], d[i + 1], d[i + 2]]); };
  const op = (x, y) => x >= 0 && x < w && d[(y * w + x) * 4 + 3] > 200;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 1; tx < COLS; tx++) {
    const A = D.cell(tx - 1, ty), B = D.cell(tx, ty);
    const xa = tx * TILE - 1, xb = tx * TILE;
    const floorA = isFloor(A), floorB = isFloor(B);
    for (let y = 0; y < TILE; y++) {
      const yy = ty * TILE + y;
      if (!op(xa, yy) || !op(xb, yy)) continue;
      const La = L(xa, yy), Lb = L(xb, yy), gap = Math.abs(La - Lb);
      if (gap <= SEAM_MAX) continue;
      if (floorA === floorB) {                    // کف↔کف یا توده↔توده: دو سویِ مرز به تُنِ میانی می‌روند
        const mid = (La + Lb) / 2;
        const refA = L(xa - 2, yy), refB = L(xb + 2, yy); // تُنِ مرجعِ درونِ هر تایل
        shift(xa, yy, mid, refA, 0.5);
        shift(xb, yy, mid, refB, 0.5);
        if (gap > 2 * SEAM_MAX) {
          dit(xa - 1, yy, 0.5, _pick(cand, (L(xa - 1, yy) + mid) / 2 + (L(xa - 1, yy) - refA)));
          dit(xb + 1, yy, 0.5, _pick(cand, (L(xb + 1, yy) + mid) / 2 + (L(xb + 1, yy) - refB)));
        }
      } else {                                    // کف↔توده/دکور: شیبِ ۳پیکسلی فقط روی کف (لبه‌ی مقابل تیز می‌ماند)
        const edge = floorA ? Lb : La, dir = floorA ? -1 : 1;
        const x0 = floorA ? xa : xb;
        const Li = L(x0 + 3 * dir, yy);           // تُنِ درونِ کف = مرجعِ بافت
        shift(x0, yy, (3 * edge + Li) / 4, Li, 0.5);
        dit(x0 + dir, yy, 0.5, _pick(cand, (edge + Li) / 2 + (L(x0 + dir, yy) - Li)));
        dit(x0 + 2 * dir, yy, 0.25, _pick(cand, (edge + 3 * Li) / 4 + (L(x0 + 2 * dir, yy) - Li)));
      }
    }
  }
}

export const FLOOR_PASSES = ['base', 'wallMass', 'floorPattern', 'AO', 'decals', 'seam', 'staticProps'];

export function bakeFloor(run) {
  const D = run.dungeon;
  const cache = new Raster(WORLD_W, WORLD_H);
  passBase(cache, D);            // ۱
  passWallMass(cache, D);        // ۲
  passFloorPattern(cache, D);    // ۳
  passAO(cache, D);              // ۴
  passDecals(cache, D);          // ۵
  passSeam(cache, D);            // ۷ — درزگیرِ مرزِ توده↔کف (S8.1)
  passStaticProps(cache, D);     // ۶
  return cache;
}
