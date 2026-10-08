// dungeon_bake.js — خط لوله‌ی پختِ لایه‌ایِ طبقه‌ی دانجن (S3.1 — Parity-first)
// ترتیبِ پاس‌ها **ثابت** است و هر پاس تابعِ جداست:
//   ۱ base → ۲ wallMass (S3.2) → ۳ floorPattern (S3.4) → ۴ AO (S3.5) → ۵ decals (S3.6) → ۶ staticProps (S3.7/3.8)
// در این نشست فقط زیرساخت ساخته شد: پاس‌های S3.2+ یا خالی‌اند یا **هم‌ارزِ رفتارِ قبلی**
// ⇒ خروجیِ کش بایت‌به‌بایت همانِ `buildFloorCache` قدیمی است (پذیرشِ S3.1).
import { groundSprite, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { Raster } from './raster.js';
import { drawDungeonDepth } from './art/dungeon_depth.js';
import { DPAL } from './art/ground.js';
import { mask8, blob47, IDX_MASK, autoSprite, setAutoBuilder } from './art/autotile.js';
import { hash2 } from './art/noise.js';
import { bayer4 } from './art/dither.js';

// ۱ — پایه: تایلِ زمینِ هر سلول با تمِ طبقه (همان حلقه‌ی قبلی، بی‌هیچ تغییری)
function passBase(cache, D) {
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const c = D.cell(tx, ty);
    groundSprite(c.kind, c.v, false, 0, D.theme).over(cache, tx * TILE, ty * TILE); // تم طبقه (ن۳۲)
  }
}

// ---------- ۲ — توده‌ی دیوار: رو/نما + autotile ۸-همسایه (S3.2) ----------
// بیت‌های mask8: N=۱ NE=۲ E=۴ SE=۸ S=۱۶ SW=۳۲ W=۶۴ NW=۱۲۸
const BN = 1, BE = 4, BS = 16, BW = 64, BNE = 2, BSE = 8, BSW = 32, BNW = 128;
let BMAX = 1; // دامنه‌ی ماتریسِ بایر (یک‌بار اندازه‌گیری ⇒ آستانه‌ی درصدی بی‌نیاز از دامنه)
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) BMAX = Math.max(BMAX, bayer4(x, y));
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
// سطحِ «رو»: سنگ‌فرشِ تیره و **کم‌کنتراست**؛ هرچه عمیق‌تر ⇒ نزدیک‌تر به brickOut (تاریکیِ عمیق/مرزِ نقشه)
function drawTop(r, seed, dep, P) {
  const base = P.deep, dark = P.brickOut;
  r.rect(0, 0, TILE, TILE, base);
  // گرادیانِ عمق: ۲۵٪ → ۵۰٪ → ۱۰۰٪ brickOut (مرزِ نقشه/تاریکیِ عمیق کاملاً تاریک)
  if (dep >= 3) r.rect(0, 0, TILE, TILE, dark);
  else for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++)
    if (bayer4(x, y) * 4 >= BMAX * (dep === 2 ? 2 : 3)) r.px(x, y, dark);
  for (let i = 0; i < 6; i++) { // بافتِ کم‌کنتراست (یک پله بالاتر/پایین‌تر)
    const a = hash2(seed * 31 + i, i * 7 + 3, 53), b = hash2(i * 13, seed * 17 + i, 59);
    r.rect(1 + ((a * 13) | 0), 1 + ((b * 13) | 0), 2 + ((a * 2) | 0), 1, i & 1 ? P.brick : dark);
  }
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
    // ردیف‌های ۰–۲ کفِ شرقی معمولاً زیر سایه‌ی AO اند (L۷۰) و ردیف ۱۵ لبه‌ی تاریکِ کف (L۵۲)
    r.rect(TILE - 1, 0, 1, 3, P.stone);
    r.rect(TILE - 1, 3, 1, TILE - 4, P.stoneHi);
    r.rect(TILE - 1, TILE - 1, 1, 1, P.brickHi);
    r.rect(TILE - 2, lo(m & BN), 1, Math.max(1, hi(m & BS) - 4 - lo(m & BN) + 1), P.brickOut);
  }
  // S دست‌نخورده: لبه‌ی روشن + سایه‌ی روی کف را پاسِ AO می‌کشد (S3.5 جایگزین می‌شود)
}
// سازنده‌ی مشترکِ کشِ لیزِ autotile — تا زمانی که پاس‌های بعد (S3.4/S3.6) چیزی بخواهند، همین‌جا گسترش می‌یابد
setAutoBuilder((r, id, kind, variant, theme) => {
  if (kind !== 'wallMass') return;
  const P = DPAL(theme | 0), m = IDX_MASK[id], dep = variant & 3, seed = (variant >> 2) & 3;
  if (dep) drawTop(r, seed, dep, P);   // variant ۱..۳ = «رو» (عمق ۱..۳)؛ ۰ = «نما» (فقط لبه روی پایه‌ی موجود)
  drawRim(r, m, P);
}, { opaque: false });
function passWallMass(cache, D) {
  const theme = D.theme | 0, dep = wallDepth(D);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const c = D.cell(tx, ty);
    if (c.kind !== 'wall') continue;
    const id = blob47(mask8((x, y) => openAt(D, x, y), tx, ty));
    const south = openAt(D, tx, ty + 1);   // «نما» فقط وقتی تایلِ جنوبی باز است
    const v = south ? 0 : (((c.v & 3) << 2) | Math.min(3, dep[ty * COLS + tx]));
    autoSprite('wallMass', id, v, theme).over(cache, tx * TILE, ty * TILE);
  }
}

// ۳ — کف: سنگفرشِ مقیاس-جهان + ترکِ پیوسته (S3.4) — فعلاً خالی
function passFloorPattern() {}

// ۴ — AO و سایه‌ی تماسی (S3.5) — فعلاً **هم‌ارزِ قبلی**: سایه‌ی عمق + خزه
function passAO(cache, D) { drawDungeonDepth(cache, D, 0, 0, TILE, ROWS, COLS); }

// ۵ — دکال‌ها و فرسودگی per تم (S3.6) — فعلاً خالی
function passDecals() {}

// ۶ — پراپ‌ها و سازه‌های ایستا (S3.7/3.8) — فعلاً خالی
function passStaticProps() {}

export const FLOOR_PASSES = ['base', 'wallMass', 'floorPattern', 'AO', 'decals', 'staticProps'];

export function bakeFloor(run) {
  const D = run.dungeon;
  const cache = new Raster(WORLD_W, WORLD_H);
  passBase(cache, D);            // ۱
  passWallMass(cache, D);        // ۲
  passFloorPattern(cache, D);    // ۳
  passAO(cache, D);              // ۴
  passDecals(cache, D);          // ۵
  passStaticProps(cache, D);     // ۶
  return cache;
}
