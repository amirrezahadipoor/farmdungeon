// art/farm_buildings.js — S5.3: خانه و سازه‌های مزرعه (همه از رمپ‌های پالتِ مستر ⇒ M5 بی‌آسیب)
// خانه: سقف شینگلِ ردیف‌دار + پایهٔ سنگی + درِ قاب‌دار + پنجرهٔ ۲حالته (روز/شب) + پله
// سازه‌ها: مترسک (پارچهٔ رمپ) · آبپاش (لوله+سرِ چرخانِ کوانتیزه) · سبدِ حصیری — همه با outline و سایهٔ تماسی
import { E } from './palette_env.js';
import { rp } from './ramps.js';
import { bakeOutline } from './outline.js';

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
export function drawFarmhouse(r, sx, sy, time, night) {
  return bakeOutline(r, sx + (-1), sy + (-13), 38, 48, (r) => {
    // --- سقفِ شینگلی: ردیف‌های کاشیِ ۲px با درزِ جابه‌جا + خطِ ستیغِ روشن + سایهٔ پیش‌آمدگی
    for (let i = 0; i < 7; i++) {
      const w = 30 - i * 4, x = sx + 1 + i * 2, y = sy + 12 - i * 2;
      r.rect(x, y, w, 2, i % 2 ? C.roof : C.roofHi);
      for (let k = (i % 2 ? 0 : 2); k < w; k += 3) r.px(x + k, y + 1, C.roofSh); // درزِ کاشی (offset یک‌درمیان)
      r.px(x, y + 1, C.roofDeep); r.px(x + w - 1, y + 1, C.roofDeep);
      if (i > 0) { r.px(x - 1, y + 1, C.roofDeep); r.px(x + w, y + 1, C.roofDeep); } // لبهٔ سایه‌ی شیب
    }
    r.rect(sx + 12, sy - 1, 8, 2, C.roofHi);                                       // خطِ ستیغ
    r.rect(sx + 13, sy - 1, 6, 1, rp('bone', 6));
    r.rect(sx + 1, sy + 13, 30, 1, C.roofDeep);                                    // سایهٔ زیرِ پیش‌آمدگی
    // --- دیوار: گچِ روشن + اسکلتِ چوبی + پایهٔ سنگی
    r.rect(sx + 2, sy + 14, 28, 17, C.wall);
    r.rect(sx + 2, sy + 14, 28, 1, C.wallHi);
    r.rect(sx + 2, sy + 14, 1, 17, C.wallSh); r.rect(sx + 29, sy + 14, 1, 17, C.wallSh);
    r.rect(sx + 2, sy + 14, 2, 17, C.beam); r.rect(sx + 28, sy + 14, 2, 17, C.beam); r.px(sx + 3, sy + 15, C.beamHi);
    r.rect(sx + 15, sy + 15, 2, 16, C.beam); r.px(sx + 15, sy + 15, C.beamHi);      // تیرِ میانی
    r.rect(sx + 2, sy + 29, 28, 2, C.stone);                                        // پایهٔ سنگی
    r.rect(sx + 2, sy + 29, 28, 1, C.stoneHi);
    for (let k = 4; k < 28; k += 5) { r.px(sx + k, sy + 30, C.stoneSh); r.px(sx + k + 2, sy + 29, C.stoneSh); }
    r.rect(sx + 2, sy + 31, 28, 1, C.stoneSh); r.rect(sx + 3, sy + 31, 26, 1, C.stone);
    // --- درِ قاب‌دار (رو به جنوب/بازیکن)
    r.rect(sx + 12, sy + 20, 8, 12, C.doorSh);                                      // قاب
    r.rect(sx + 13, sy + 21, 6, 10, C.door);
    r.rect(sx + 13, sy + 21, 6, 1, C.doorHi); r.px(sx + 13, sy + 25, C.doorSh); r.px(sx + 18, sy + 26, C.doorSh);
    r.px(sx + 17, sy + 26, C.inkMid);                                               // دستگیره
    // --- پنجره‌ها: ۲ حالت (روز = شیشهٔ سرد · شب = نور گرم + سایهٔ کسی در خانه)
    const lit = night > 0.45;
    for (const wx of [5, 21]) {
      r.rect(sx + wx, sy + 18, 7, 7, C.beam);                                       // قابِ چوبی
      r.rect(sx + wx + 1, sy + 19, 5, 5, lit ? C.warm : C.glassDay);
      r.rect(sx + wx + 1, sy + 19, 5, 1, lit ? C.warmHi : C.glassHi);
      r.px(sx + wx + 3, sy + 19, C.beam); r.px(sx + wx + 3, sy + 21, C.beam);       // میله‌های صلیبی
      if (lit) r.rect(sx + wx + 3, sy + 21, 2, 3, C.inkMid);                        // سایهٔ کسی که خانه است
    }
    // --- دودکش + دودِ ۳ فریمِ کند (آرامش: حرکت فقط در مرزِ پله‌ها)
    r.rect(sx + 25, sy - 4, 4, 7, C.stone); r.rect(sx + 25, sy - 4, 4, 1, C.stoneHi); r.px(sx + 28, sy - 3, C.stoneSh);
    const sf = fl(time, 1.2, 3);                                   // سیکلِ ۳ فریمی: هر فریم پلهٔ ۳px بالاتر
    for (let k = 0; k < 2; k++) {
      const up = sf * 3 + k * 6, ax = sx + 26 + ((k + sf) & 1);
      r.px(ax, sy - 6 - up, rp('bone', 3)); r.px(ax + 1, sy - 5 - up, rp('bone', 2));
    }
    // --- پلهٔ ورودی
    r.rect(sx + 11, sy + 32, 10, 1, C.stone); r.rect(sx + 12, sy + 32, 8, 1, C.stoneHi);
    r.rect(sx + 11, sy + 33, 10, 1, C.stoneSh);
  }, { mode: 'ink' });
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
export function drawFarmhouseGlow(r, sx, sy, time, k) {
  if (k <= 0.45) return;
  const a = Math.round(Math.min(1, (k - 0.45) / 0.55) * 255);
  const fl2 = 0.85 + 0.15 * Math.round(Math.sin(time * 2.1) + 1);
  for (const wx of [5, 21]) {
    r.rect(sx + wx + 1, sy + 19, 5, 5, [255, 214, 110, Math.round(a * fl2)]);
    r.px(sx + wx, sy + 18, [255, 224, 130, Math.round(a * 0.5 * fl2)]);
    r.px(sx + wx + 6, sy + 22, [255, 224, 130, Math.round(a * 0.5 * fl2)]);
    r.px(sx + wx + 2, sy + 25, [255, 234, 150, Math.round(a * 0.3)]);
  }
  r.px(sx + 13, sy + 32, [255, 234, 150, Math.round(a * 0.25)]);                       // نور روی پلهٔ ورودی
}

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
