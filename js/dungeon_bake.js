// dungeon_bake.js — خط لوله‌ی پختِ لایه‌ایِ طبقه‌ی دانجن (S3.1 — Parity-first)
// ترتیبِ پاس‌ها **ثابت** است و هر پاس تابعِ جداست:
//   ۱ base → ۲ wallMass (S3.2) → ۳ floorPattern (S3.4) → ۴ AO (S3.5) → ۵ decals (S3.6) → ۶ staticProps (S3.7/3.8)
// در این نشست فقط زیرساخت ساخته شد: پاس‌های S3.2+ یا خالی‌اند یا **هم‌ارزِ رفتارِ قبلی**
// ⇒ خروجیِ کش بایت‌به‌بایت همانِ `buildFloorCache` قدیمی است (پذیرشِ S3.1).
import { groundSprite, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { Raster } from './raster.js';
import { drawDungeonDepth } from './art/dungeon_depth.js';

// ۱ — پایه: تایلِ زمینِ هر سلول با تمِ طبقه (همان حلقه‌ی قبلی، بی‌هیچ تغییری)
function passBase(cache, D) {
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const c = D.cell(tx, ty);
    groundSprite(c.kind, c.v, false, 0, D.theme).over(cache, tx * TILE, ty * TILE); // تم طبقه (ن۳۲)
  }
}

// ۲ — توده‌ی دیوار: رو/نما + autotile ۸-همسایه (S3.2) — فعلاً خالی
function passWallMass() {}

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
