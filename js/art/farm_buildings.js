// art/farm_buildings.js — S5.3: خانه و سازه‌های مزرعه (همه از رمپ‌های پالتِ مستر ⇒ M5 بی‌آسیب)
// خانه: سقف شینگلِ ردیف‌دار + پایهٔ سنگی + درِ قاب‌دار + پنجرهٔ ۲حالته (روز/شب) + پله
// سازه‌ها: مترسک (پارچهٔ رمپ) · آبپاش (لوله+سرِ چرخانِ کوانتیزه) · سبدِ حصیری — همه با outline و سایهٔ تماسی
import { E } from './palette_env.js';
import { rp } from './ramps.js';
import { bakeOutline } from './outline.js';
import { drawHousePx, drawHouseGlowPx } from './farm_px.js';

const C = {                                   // نگاشتِ سازه‌ها به پله‌های رمپ (منبعِ واحد رنگ)
  wall: rp('bone', 6), wallHi: rp('bone', 6), wallSh: rp('bone', 5), wallDeep: rp('bone', 3),
  beam: rp('soil', 3), beamHi: rp('soil', 4),
  roof: rp('clothRed', 4), roofHi: rp('clothRed', 5), roofSh: rp('clothRed', 3), roofDeep: rp('clothRed', 2),
  stone: rp('stoneCool', 4), stoneHi: rp('stoneCool', 5), stoneSh: rp('stoneCool', 3),
  door: rp('soil', 5), doorHi: rp('soil', 6), doorSh: rp('soil', 3),
  wood: rp('dust', 5), woodHi: rp('dust', 6), woodSh: rp('dust', 3),
  straw: rp('gold', 6), strawHi: rp('gold', 6), strawSh: rp('gold', 4),
  cloth: rp('clothRed', 4), clothHi: rp('clothRed', 5), clothSh: rp('clothRed', 3),
  sack: rp('sand', 4), sackHi: rp('sand', 5), sackSh: rp('sand', 3),
  metal: rp('metal', 4), metalHi: rp('metal', 5), metalSh: rp('metal', 3),
  ink: rp('ink', 1), inkMid: rp('ink', 2),
  glassDay: rp('water', 4), glassHi: rp('water', 5),
  warm: E.gold, warmHi: rp('gold', 6),
};
const fl = (t, fps, n) => Math.floor(t * fps) % n;            // پلهٔ زمانیِ کوانتیزه (قاعدهٔ آرامش)

// ---------- خانه (۲×۲ تایل) — پنجره در شب روشن می‌شود (منبعِ نور: drawFarmhouseGlow) ----------
export function drawFarmhouse(r, sx, sy, time, night) { // S9.7: خانه‌ی دست‌پیکسل (farm_px) + outline جوهری
  return bakeOutline(r, sx - 11, sy - 27, 56, 62, (p) => drawHousePx(p, sx, sy, time, night), { mode: 'ink' });
}

// ---------- مترسک — نگهبان مزرعه (پارچه/کاه از رمپ، تابِ آرام در باد) ----------
export function drawScarecrow(r, sx, sy, time) {
  return bakeOutline(r, sx + 1, sy + 0, 16, 18, (r) => {
    const sw = Math.round(Math.sin(time * 1.1) * 1);
    r.rect(sx + 7, sy + 6, 2, 11, C.woodSh); r.rect(sx + 7, sy + 6, 1, 11, C.wood);   // پایه
    r.rect(sx + 7, sy + 16, 4, 1, C.woodSh);                                         // سایهٔ تماسیِ پایه (dust[3])
    r.rect(sx + 3 + sw, sy + 9, 10, 1, C.wood); r.rect(sx + 4 + sw, sy + 8, 8, 1, C.woodHi);
    r.rect(sx + 6 + sw, sy + 6, 2, 2, C.strawSh);                                    // کاهِ آویزان از آستین
    r.rect(sx + 9 + sw, sy + 10, 3, 1, C.straw);
    r.rect(sx + 6 + sw, sy + 9, 4, 4, C.cloth);                                      // تن‌پوش پارچه‌ای
    r.px(sx + 6 + sw, sy + 9, C.clothHi); r.rect(sx + 6 + sw, sy + 11, 4, 1, C.clothSh);
    r.rect(sx + 5 + sw, sy + 12, 6, 1, C.woodSh);                                    // کمربند طنابی
    r.rect(sx + 6 + sw, sy + 12, 4, 1, C.strawSh);
    r.rect(sx + 6 + sw, sy + 4, 4, 3, C.sack); r.px(sx + 6 + sw, sy + 4, C.sackHi);  // سر: کیسه
    r.px(sx + 6 + sw, sy + 5, C.inkMid); r.px(sx + 9 + sw, sy + 5, C.inkMid);        // چشم‌های دکمه‌ای
    r.rect(sx + 4 + sw, sy + 3, 8, 1, C.straw); r.rect(sx + 5 + sw, sy + 2, 6, 1, C.strawHi); // کلاهِ کاهیِ پهن
    r.px(sx + 3 + sw, sy + 8, rp('bone', 6));                                        // پرِ یادگار روی بازو
  }, { mode: 'ink' });
}

// ---------- ستونِ آبپاش — لوله از حوضچه + سرِ چرخانِ کوانتیزه ----------
export function drawSprinkler(r, sx, sy, time) {
  return bakeOutline(r, sx + 1, sy + 3, 16, 15, (r) => {
    r.rect(sx + 11, sy + 11, 4, 2, C.metalSh); r.rect(sx + 11, sy + 11, 4, 1, C.metal); // لوله‌ی افقی از سمتِ حوضچه
    r.rect(sx + 7, sy + 8, 2, 8, C.metal); r.rect(sx + 7, sy + 8, 1, 8, C.metalHi);    // بدنه
    r.rect(sx + 5, sy + 16, 6, 1, C.metalSh);                                          // سایهٔ تماسیِ پایه
    r.rect(sx + 4, sy + 15, 8, 1, C.metalSh); r.rect(sx + 5, sy + 15, 6, 1, C.metal);
    r.rect(sx + 6, sy + 6, 5, 2, C.metalSh); r.rect(sx + 6, sy + 6, 5, 1, C.metalHi);  // سرِ آبپاش
    const a = fl(time, 1.2, 4);                                                        // چرخشِ ۴ پله
    const ARM = [[9, 6, 3, 0], [12, 8, 0, 3], [9, 10, -3, 0], [6, 8, 0, -3]][a];
    r.rect(sx + ARM[0], sy + ARM[1], Math.max(1, Math.abs(ARM[2])), Math.max(1, Math.abs(ARM[3])), C.metal);
    r.px(sx + ARM[0] + ARM[2], sy + ARM[1] + ARM[3], E.waterHi);                       // قطره
    r.px(sx + 8, sy + 5, rp('magicCyan', 6)); // جرقهٔ جادوی آب — از رمپ (S5.3: E.essence بیرونِ پالت بود)
  }, { mode: 'ink' });
}

// ---------- نورِ پنجره (بعد از تینتِ شب) ----------
export function drawFarmhouseGlow(r, sx, sy, time, k) { drawHouseGlowPx(r, sx, sy, time, k); } // S9.7

// ---------- سبدِ حصیری جمع‌کن (محصولِ خودکار این‌جا می‌ریزد) ----------
export function drawBasketCrate(r, sx, sy, time) {
  return bakeOutline(r, sx + 0, sy + 2, 16, 16, (r) => {
    r.rect(sx + 3, sy + 9, 10, 6, C.wood);                                             // بدنه
    r.rect(sx + 3, sy + 9, 10, 1, C.woodHi); r.rect(sx + 3, sy + 14, 10, 1, C.woodSh);
    for (let i = 0; i < 3; i++) r.rect(sx + 4 + i * 3, sy + 10, 1, 4, C.woodSh);       // تارِ عمودیِ حصیر
    for (let y = 10; y < 14; y += 2) for (let x = 4; x < 13; x += 2) r.px(sx + x + (y & 1 ? 1 : 0), sy + y, C.woodHi); // بافتِ افقی
    r.rect(sx + 2, sy + 7, 12, 2, C.woodSh); r.rect(sx + 3, sy + 7, 10, 1, C.woodHi);   // لبهٔ چوبی
    r.px(sx + 1, sy + 9, C.strawSh); r.px(sx + 14, sy + 9, C.strawSh);                 // دستهٔ طنابی
    r.px(sx + 5, sy + 6, E.carrot); r.px(sx + 8, sy + 5, E.carrotHi); r.px(sx + 10, sy + 6, E.leaf);
    r.px(sx + 7, sy + 4 + (fl(time, 2.5, 2) ? 0 : 1), E.wheat);                        // دانهٔ تازه (۲ فریم)
    r.rect(sx + 3, sy + 15, 10, 1, C.woodSh);                                          // سایهٔ تماسی
  }, { mode: 'ink' });
}
