// farm_render.js — رندر صحنه‌ی مزرعه: تایل‌ها، دکور زنده، نشانگر، قهرمان+کارگر،
// افکت‌ها، شب/شب‌تاب، پروانه/ماهی، آب‌وهوا (باران/ابر) — فقط رسم، هیچ منطقی
import { groundSprite, cropSprite, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { rp } from './art/ramps.js'; // S2.6: تُنِ سایهٔ تماسِ محصول
import { drawReadySparkle, drawWaterLife, drawSaleSign, drawPathEdge } from './art/farm_decor.js';
import { drawTree } from './art/tree.js';
import { drawFarmhouse, drawFarmhouseGlow, drawScarecrow, drawSprinkler, drawBasketCrate } from './art/farm_buildings.js';
import { HOUSE, SCARECROW } from './farm_layout.js';
import { applyNight, nightFactor } from './night.js';
import { drawBirds } from './art/critters.js';
import { drawMotes } from './art/motes.js'; // S4.8: گرده‌ی آرامِ روز
import { drawRain, isRaining, lightningK, flashTint, drawLightning, drawPondRipples, drawRainGround } from './art/weather.js';
import { drawHeroFrame, frameKey, framePhase, halfSprite } from './art/hero.js';
import { flushDirty, OPAQUE, wetTransition, WET, WET_FULL, wetRaster, wetTiles } from './farm_terrain.js'; // S2.1 کش زمین · S4.7 لایه‌ی خیس
import { drawWater, SHORE_FARM } from './art/water.js'; // S2.7: آب و کرانه (یک منبع با دانجن)
import { HOX, HOY } from './art/hero_pose.js';
import { applyRim } from './art/rim.js';
import { shadowUpdate, castShadowDraw } from './art/shadow.js'; // S4.4: سایه‌ی پرتابیِ ساعتی
import { glowBegin, glowAdd, glowDraw } from './art/glow.js'; // S4.6: درخششِ ارزان
import { drawGate } from './art/gate.js'; // S5.5: گرداب/رون‌های دروازه‌ی دانجن (لایه‌ی داینامیک)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FENTS = []; // pool موجودات مزرعه
const _gP = [255, 210, 90, 0]; // درخشش طلایی — اسکرچ
const TREES = []; // درخت‌های مرئی — بازمصرف برای پرندگان // pool موجودات مزرعه (درخت/قهرمان/کارگر) — بازمصرف
const _sprCache = new Map(); // کش اسپرایت قهرمان مزرعه
const WF_SEQ = [0, 1, 2, 1]; // موج آب: ۳ فریم با سیکل نرم — ثابت، بدون تخصیص هر فریم
let _fr = null; // S2.7: نگاشتِ سلولِ مزرعه برای پیش‌بینیِ آب (بدون تخصیص هر فریم)
let _now = 0; // S4.4: زمانِ فریم برای پختِ اسکرچِ سایه (بسته‌های ثابت — بدون تخصیص هر فریم)
const _drawSc = (t) => drawScarecrow(t, 0, 0, _now);   // فقط برای پختِ ماسکِ سایه
const _drawHs = (t) => drawFarmhouse(t, 0, 0, _now, 0); // night=0: پنجره‌ی روشن به ماسک نیاید
const _fcell = (x, y) => _fr.cell(x, y);
// اسکرچ گزینه‌های اسپرایت — بدون آبجکت/spread جدید در هر فریم (فقط خوانده می‌شود)
const _ho = { dir: 'down', anim: 'idle', phase: 0, breath: 0, moveW: 0, tool: 'none', actP: -1, blink: false, equip: null };

export function farmHeroSprite(game) {
  const h = game.hero, l = h.loco;
  const anim = h.act >= 0 || l.moveW < 0.02 ? 'idle' : l.mix < 0.5 ? 'walk' : 'run';
  const o = _ho;
  o.dir = h.dir; o.anim = anim;
  o.phase = anim === 'idle' ? (l.t % 2.4) / 2.4 : l.mix < 0.5 ? l.phW : l.phR;
  o.breath = l.t; o.moveW = anim === 'idle' ? 0 : l.moveW;
  o.tool = h.tool; o.actP = h.act; o.blink = l.blink; o.equip = game.equip;
  o.phase = framePhase(o); // کوانت‌شده — همان چیزی که drawHeroFrame می‌کشد
  const key = frameKey(o) + '#' + (game.equipSig || '');
  let s = game.sprCache.get(key);
  if (!s) {
  s = halfSprite(drawHeroFrame(o)); // ن۳۵: بدنه ۶۲px→۳۱px — نسبت درست به تایل/خانه/درخت
  applyRim(s, null, 0.3); // جلای ظریف لبه‌ی بالا (پس از نصف‌شدن = ۱px)
  if (game.sprCache.size > 260) { const it = game.sprCache.keys(); for (let i = 0; i < 80; i++) { const k = it.next(); if (k.done) break; game.sprCache.delete(k.value); } } // سقف حافظه: ۲۶۰×۶۴KB≈۱۶MB
  game.sprCache.set(key, s);
  }
  return s;
}

// رندر کامل صحنه‌ی مزرعه در Raster
export function renderFarm(game, r) {
    const cx = Math.round(clamp(game.cam.x, Math.min(0, (WORLD_W - r.w) / 2), Math.max(0, WORLD_W - r.w)));
    const cy = Math.round(clamp(game.cam.y, Math.min(0, (WORLD_H - r.h) / 2), Math.max(0, WORLD_H - r.h)));
    const f = game.farm, wf = [0, 1, 2, 1][Math.floor(game.time * 0.9) % 4]; _fr = f; // موج آب: سیکل آرام ~۱٫۱ث/فریم (ن۳۷)
    const raining = isRaining(game.dayT); // S4.4: یک‌بار در فریم (سایه هم به آن نیاز دارد)
    _now = game.time;
    shadowUpdate(game.dayT, raining);      // S4.4: باکتِ سایه از ساعتِ روز — پیش از هر رسم
    const x0 = Math.max(0, Math.floor(cx / TILE)), x1 = Math.min(COLS - 1, Math.ceil((cx + r.w) / TILE));
    const y0 = Math.max(0, Math.floor(cy / TILE)), y1 = Math.min(ROWS - 1, Math.ceil((cy + r.h) / TILE));
    // S2.1: لایه‌ی استاتیک از کش (blit تایل‌به‌تایل؛ تایلِ مات = کپیِ u32، بدون blend) — dirtyها پیش از blit بازپخت می‌شوند
    const terr = flushDirty(f);
    wetTransition(raining, x0, y0, x1, y1);            // S4.7: گذارِ آهسته (بودجه‌ی ~۰٫۳۵٪ پیکسلِ پنجره در هر فریم)
    const wetL = wetTiles() ? wetRaster() : null;       // صفر تایلِ خیس ⇒ مسیرِ خشکِ قبلی، بیت‌به‌بیت
    let allOp = true, allWet = wetL !== null;           // allOp: پنجره‌ی مات · allWet: تمامِ پنجره خیسِ کامل
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i2 = ty * COLS + tx;
        if (!OPAQUE[i2]) allOp = false;
        if (allWet && WET[i2] < WET_FULL) allWet = false;
        if (!allOp && !allWet) break;
      }
      if (!allOp && !allWet) break;                     // پایانِ زودهنگام — هم‌ارزِ حلقه‌ی S2.1 وقتی خشکیم
    }
    const full = allOp && (allWet || !wetL);            // یک blitِ کلِ پنجره (از کشِ خیس اگر همه‌ی پنجره خیس است)
    if (full) (allWet ? wetL : terr).blit(r, x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE, x0 * TILE - cx, y0 * TILE - cy, true);
    for (let ty = y0; ty <= y1; ty++) {
      let rowOp = true, rowAllDry = true, rowAllWet = wetL !== null; // ردیفِ ماتِ همگن: یک memcpy به‌جای ۳۰ blit
      for (let tx = x0; tx <= x1; tx++) {
        const i2 = ty * COLS + tx;
        if (!OPAQUE[i2]) { rowOp = false; if (!wetL) break; }
        if (wetL) { const w2 = WET[i2]; if (w2 >= WET_FULL) rowAllDry = false; else { rowAllWet = false; if (w2) rowAllDry = false; } }
      }
      const rowTag = rowAllWet ? 1 : (rowAllDry ? 0 : -1), rowBlit = !full && rowOp && rowTag >= 0;
      if (rowBlit) (rowTag ? wetL : terr).blit(r, x0 * TILE, ty * TILE, (x1 - x0 + 1) * TILE, TILE, x0 * TILE - cx, ty * TILE - cy, true);
      for (let tx = x0; tx <= x1; tx++) {
      const c = f.cell(tx, ty);
      const sx = tx * TILE - cx, sy = ty * TILE - cy;
      if (!full && !rowBlit) {
        if (!wetL) terr.blit(r, tx * TILE, ty * TILE, TILE, TILE, sx, sy, OPAQUE[ty * COLS + tx] !== 0); // مسیرِ خشک = دقیقاً کدِ S2.1
        else { // S4.7: تایلِ خیس/نیم‌خیس/خشک
          const p = WET[ty * COLS + tx], op = OPAQUE[ty * COLS + tx] !== 0;
          if (p >= WET_FULL) wetL.blit(r, tx * TILE, ty * TILE, TILE, TILE, sx, sy, op);
          else if (p === 0) terr.blit(r, tx * TILE, ty * TILE, TILE, TILE, sx, sy, op);
          else { wetL.blit(r, tx * TILE, ty * TILE, TILE, p, sx, sy, op); terr.blit(r, tx * TILE, ty * TILE + p, TILE, TILE - p, sx, sy + p, op); } // جبهه‌ی رطوبت درونِ تایل
        }
      }
      if (c.kind === 'water') drawWater(r, sx, sy, _fcell, tx, ty, wf, SHORE_FARM); // S2.7: آب متحرک (عمق+کاستیک+ساحل+کف) هر فریم روی کش
      if (c.crop) { // S2.6: سایهٔ تماسِ ۲px زیر گیاه (محصول روی خاک «نشانده» می‌شود)
        r.rect(sx + 5, sy + 14, 6, 1, c.wet ? E.soilWetSh : E.soilSh);
        r.rect(sx + 6, sy + 15, 4, 1, c.wet ? rp('soilWet', 1) : rp('soil', 1));
        const cs = cropSprite(c.crop.type, f.vstage(c)); // S5.2: ۶ مرحله‌ی بصری · بومِ ۲۴ردیفه ⇒ ۸px بالای تایل
        cs.over(r, sx, sy - (cs.h - TILE));
      }
      if (c.crop && c.crop.g && !f.mature(c)) { // طلاییِ در حال رشد: درخشش ریز (کوانتیزه)
        _gP[3] = 55 + 25 * Math.round((Math.sin(game.time * 1.2 + tx) + 1)); // ن۳۶: پالس آرام‌تر — نشانِ طلایی، نه استروب
        r.px(sx + 3, sy + 4, _gP); r.px(sx + 12, sy + 11, _gP);
      }
      // ---- دکور زنده‌ی مزرعه (آرت جدا در js/art/) ----
      if (c.kind === 'sign') drawSaleSign(r, sx, sy, game.time);
      else if (c.kind === 'scarecrow') { // S4.4: سایه‌ی پرتابی زیر مترسک
        castShadowDraw(r, sx + 1, sy, 15, 16, 18, 'sc', _drawSc);
        drawScarecrow(r, sx, sy, game.time);
      }
      // S2.9: دکال‌های چمنزار (تافت/شبدر/گل‌دسته/سنگ‌ریزه) حالا در کشِ زمین پخته می‌شوند ⇒ هر فریم صفر هزینه
      if (tx === 26 && ty === 14 && game.toolLvls.sprinkler) drawSprinkler(r, sx, sy, game.time); // آبپاش: بالای حوضچه، از آن آب می‌کشد
      if (tx === 18 && ty === 16 && game.toolLvls.basket) drawBasketCrate(r, sx, sy, game.time); // سبد: کنار خانه
      else if (c.kind === 'water') drawWaterLife(r, sx, sy, tx, ty, game.time);
      if (c.crop && f.mature(c)) drawReadySparkle(r, sx, sy, tx, ty, game.time, !!c.crop.g);
      }
    }
    // S5.5: دروازه‌ی دانجن — گردابِ ۶ فریمی + رون‌ها + ذرات (روی طاقِ پخته، زیرِ موجودات)
    const gt = game.farm.gate;
    if (gt) {
      const gsx = gt.x * TILE - cx, gsy = gt.y * TILE - cy;
      if (gsx > -40 && gsy > -40 && gsx < r.w + 8 && gsy < r.h + 8) drawGate(r, gsx, gsy, game.time);
    }
    // نشانگر هدف (گوشه‌های چشمک‌زن)
    if (game.marker) {
      const m = game.marker, sx = m.x * TILE - cx, sy = m.y * TILE - cy;
      const col = Math.floor(m.t * 2) % 2 ? E.gold : E.white; // ن۳۷: چشمک نشانگر آرام‌تر (۲Hz)
      const c3 = 3;
      r.rect(sx - 1, sy - 1, c3 + 1, 1, col); r.rect(sx - 1, sy, 1, c3, col);
      r.rect(sx + TILE - c3, sy - 1, c3 + 1, 1, col); r.rect(sx + TILE - 1, sy, 1, c3, col);
      r.rect(sx - 1, sy + TILE, c3 + 1, 1, col); r.rect(sx - 1, sy + TILE - c3, 1, c3, col);
      r.rect(sx + TILE - c3, sy + TILE, c3 + 1, 1, col); r.rect(sx + TILE - 1, sy + TILE - c3, 1, c3, col);
    }
    // درخت‌ها + قهرمان + کارگر — مرتب بر اساس y (pool بازمصرف، صفر تخصیص)
    const h = game.hero;
    let fn = 0, tn = 0;
    for (let ty2 = y0; ty2 <= y1; ty2++) for (let tx2 = x0; tx2 <= x1; tx2++) {
      const c2 = f.cell(tx2, ty2);
      if (c2.kind !== 'tree') continue;
      let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0 });
      wt.y = ty2 * TILE + TILE; wt.t = 0; wt.sx = tx2 * TILE - cx; wt.sy = ty2 * TILE - cy; wt.v = c2.variant & 1; fn++;
      if (Math.max(Math.abs(tx2 - SCARECROW.x), Math.abs(ty2 - SCARECROW.y)) > 6) { // مترسک اینجاست — پرنده نمی‌نشیند
        let tv = TREES[tn] || (TREES[tn] = { x: 0, y: 0 });
        tv.x = tx2; tv.y = ty2; tn++; // برای پرندگان
      }
    }
    { let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0 }); wt.y = h.y; wt.t = 1; fn++; }
    { let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0 }); wt.y = (HOUSE.y + 2) * TILE; wt.t = 3; fn++; } // خانه
    for (const wk of game.workers) { let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0, w: null }); wt.y = wk.y; wt.t = 2; wt.w = wk; fn++; }
    for (let i = 0; i < fn; i++) for (let j = i + 1; j < fn; j++) if (FENTS[j].y < FENTS[i].y) { const tmp = FENTS[i]; FENTS[i] = FENTS[j]; FENTS[j] = tmp; }
    for (let i = 0; i < fn; i++) {
      const e = FENTS[i];
      if (e.t === 0) drawTree(r, e.sx, e.sy, e.v, game.time, (e.sx + cx) >> 4, (e.y >> 4) - 1); // S5.1: تایلِ جهانی ⇒ گونه/اندازه/تابِ پایدار (مستقل از دوربین)
      else if (e.t === 3) { const hx = HOUSE.x * TILE - cx, hy = HOUSE.y * TILE - cy;
        castShadowDraw(r, hx - 1, hy - 13, 44, 38, 48, 'hs', _drawHs); // S4.4: سایه‌ی پرتابیِ خانه
        drawFarmhouse(r, hx, hy, game.time, nightFactor(game.dayT)); }
      else if (e.t === 1) {
        game._heroSprite().over(r, Math.round(h.x) - HOX - cx, Math.round(h.y) - HOY - cy); // سایه داخل اسپرایت پخته شده (ن۳۵: دوبل حذف شد)
      }
      else if (e.t === 2 && e.w) e.w.render(r, cx, cy, game.time);
    }
    if (tn) drawBirds(r, TREES, cx, cy, game.time, h.x, h.y, Math.min(2, tn)); // پرندگانِ نشسته روی درخت‌ها (ن۳۶: حداکثر ۲، بی‌حرکت تا فرار)
    // افکت‌ها (ذرات/متن‌ها/برش)
    game.fx.render(r, cx, cy);
    // ---- شب: تینت آبی + شب‌تاب‌ها ----
    applyNight(r, game.dayT, raining); // تینت شب×باران در یک گذر (ن۳۶: بدون شب‌تاب)
    const nfG = nightFactor(game.dayT);
    drawFarmhouseGlow(r, HOUSE.x * TILE - cx, HOUSE.y * TILE - cy, game.time, nfG); // پنجره‌ی خانه: نور واقعی در تاریکی
    glowBegin();                                        // S4.6: هاله‌ی گرمِ پنجره در شب (افزودنی، پس از LUT)
    if (nfG > 0.45) glowAdd(HOUSE.x * TILE - cx + 8, HOUSE.y * TILE - cy + 21, 0, 1, 74, 2);
    if (gt) glowAdd(gt.x * TILE - cx + 16, gt.y * TILE - cy + 10, 3, 1, 58, 1); // S5.5: هاله‌ی بنفشِ دروازه (GCOL[3])
    glowDraw(r);
    game.fish.draw(r, cx, cy, game.time, f);
    // ---- آب‌وهوا ----
    const nf = nightFactor(game.dayT);
    if (raining) {
      drawRainGround(r, f, x0, y0, x1, y1, cx, cy, game.time); // S4.7: گودال‌های خاک‌راه + چکه‌های ۳ فریمی
      drawRain(r, game.time);
      drawPondRipples(r, game.time); // موج روی حوضچه
      const lk = lightningK(game.dayT, game.time); // رعد و برق — فقط باران
      if (lk > 0) { flashTint(r, lk); drawLightning(r, game.time); }
    }
    if (nf < 0.25) drawMotes(r, 'farm', 0, cx, cy, game.time, r.w, r.h); // S4.8: گرده (≤۴) — فقط روز
  }
