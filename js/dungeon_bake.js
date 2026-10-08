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
    // ردیف‌های ۰–۲ کفِ شرقی معمولاً زیر سایه‌ی AO اند (L۷۰) و ردیف ۱۵ لبه‌ی تاریکِ کف (L۵۲)
    r.rect(TILE - 1, 0, 1, 3, P.stone);
    r.rect(TILE - 1, 3, 1, TILE - 4, P.stoneHi);
    r.rect(TILE - 1, TILE - 1, 1, 1, P.brickHi);
    r.rect(TILE - 2, lo(m & BN), 1, Math.max(1, hi(m & BS) - 4 - lo(m & BN) + 1), P.brickOut);
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
