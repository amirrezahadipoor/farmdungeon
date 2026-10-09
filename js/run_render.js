// run_render.js — رندر دورِ دانجن: تایل‌ها، قطره‌ها/صندوق‌ها، تاریکی + منابع نور، مینی‌مپ، اسپرایت قهرمان
import { drawTextC, drawText, drawTitleC, textW, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js'; // S3.1: groundSprite دیگر اینجا استفاده نمی‌شود (رفت به dungeon_bake)
import { Raster } from './raster.js';
import { drawHeroFrame, frameKey, framePhase, halfSprite } from './art/hero.js';
import { HOX, HOY } from './art/hero_pose.js';
import { drawEliteMark, MHEAD } from './art/monster_parts.js';
import { applyRim } from './art/rim.js';
import { clamp } from './dungeon.js';
import { bakeFloorStep } from './dungeon_bake.js'; // S3.1: خط لوله‌ی پختِ لایه‌ای (base → … → staticProps)
import { drawTorches, drawChests, drawDrops, drawShrines, TORCH_LIGHT } from './art/dungeon_props.js'; // S3.7: ثابت‌های نورِ مشعل
import { drawWater, dungeonShore } from './art/water.js'; // S2.7: آب و کرانه (یک منبع با مزرعه)
import { drawPillarHead } from './art/ground.js'; // S3.8: سرستونِ بیرون‌زده (بعد از موجودات ⇒ y-sort)
import { drawProjs } from './projectiles.js'; // ن۴۴
import { applyDarkness, COLOR_LIGHTS, C_RAD_CAP, C_MAX, setThemeGrade, GRADE } from './art/light.js'; // S4.1: پاسِ نورِ رنگی
const LIT = [], LIT_R2 = 92 * 92; // S9.2: شعاعِ «موجودِ روشن» ≈ هاله‌ی دیدِ قهرمان (۷۸) + حاشیه
import { drawMotes } from './art/motes.js'; // S4.8: غبار/اخگرِ آرامِ تم
import { glowBegin, glowAdd, glowDraw, GLOW } from './art/glow.js'; // S4.6: درخششِ ارزان
import { t, faNum } from './i18n.js';

const _sprCache = new Map(); // کش اسپرایت قهرمان (LRU)
const ENTS = []; // لیست موجودات قابل رندر — بازمصرف بین فریم‌ها
const _lights = []; // لیست تخت نورها — بدون تخصیص آبجکت
const _clights = []; // S4.1: لیست تختِ نورهای **رنگی** [x,y,rad,strength,colorId] — حداکثر ۶ روی صفحه
const TORCH_COL_ST = 132; // شدتِ تزریقِ رنگِ مشعل (رنگِ رمپیِ تیره‌تر ⇒ شدتِ بیشتر برای همان گرمی)
const MINI_BG = [12, 10, 24, 175], MINI_FLOOR = [82, 78, 100, 200], MINI_PILLAR = [50, 46, 66, 220], MINI_WATER = [90, 160, 180, 190], BOSS_DOT = [220, 80, 80, 255];
const SKILL_HALO = [140, 220, 255, 90], IFRAME_GLOW = [255, 255, 255, 60], IFRAME_BOX = [255, 255, 255, 26];
const EYE_GLOW = { ghost: 1, imp: 0, golem: 4, mummy: 2, skeleton: 1, bat: 5, spider: 5 }; // S4.6: جور→شناسه‌ی رنگِ درخششِ چشم
const _spC2 = [255, 224, 130, 255], _bossC = [226, 120, 120, 255]; // ن۴۱: رنگ اسپلش طبقه/باس — اسکرچ
const BY_Y = (a, b) => a.y - b.y; // مقایسه‌گر y-sort — ثابت ماژول
const _ho = { dir: 'down', anim: 'idle', phase: 0, breath: 0, moveW: 0, tool: 'sword', actP: -1, blink: false, equip: null }; // اسکرچ بدون تخصیص هر فریم

// اسپرایت قهرمان + نسخه‌ی قرمزِ آسیب (فلاش)
export function heroSprite(run, hurt = false) {
    const h = run.hero, l = h.loco;
    const anim = h.act >= 0 || l.moveW < 0.02 ? 'idle' : l.mix < 0.5 ? 'walk' : 'run';
    const o = _ho;
    o.dir = h.dir; o.anim = anim;
    o.phase = anim === 'idle' ? (l.t % 2.4) / 2.4 : l.mix < 0.5 ? l.phW : l.phR;
    o.breath = l.t; o.moveW = anim === 'idle' ? 0 : l.moveW;
    o.actP = h.skillT > 0 ? (0.55 - h.skillT) / 0.55 : h.act; o.blink = l.blink; o.equip = run.equip;
    o.phase = framePhase(o); // کوانت‌شده — همان چیزی که drawHeroFrame می‌کشد
    const key = frameKey(o) + '#' + (run.equipSig || '') + (hurt ? 'H' : '');
    let s = _sprCache.get(key);
    if (!s) {
      s = halfSprite(drawHeroFrame(o)); // ن۳۵: هم‌مقیاس با مزرعه — ۳۱px
      applyRim(s, null, 0.3); // جلای ظریف لبه‌ی بالا (هماهنگ با هیولاها)
      if (hurt) { // نسخه‌ی قرمز‌شده برای فلاش آسیب
        const t = new Raster(s.w, s.h); t.d.set(s.d);
        for (let i = 0; i < t.d.length; i += 4) if (t.d[i + 3] > 8) { t.d[i] = 255; t.d[i + 1] = Math.min(t.d[i + 1], 70); t.d[i + 2] = Math.min(t.d[i + 2] + 30, 90); }
        s = t;
      }
      if (_sprCache.size > 260) { const it = _sprCache.keys(); for (let i = 0; i < 80; i++) { const k = it.next(); if (k.done) break; _sprCache.delete(k.value); } } // سقف حافظه: ۲۶۰×۶۴KB≈۱۶MB
      _sprCache.set(key, s);
    }
    return s;
}

// کش ایستای هر طبقه: زمین + عمق + بافت — یک‌بار ساخته می‌شود، هر فریم فقط کپی
// کپی سریع ناحیه: از src در (sx0,sy0) به اندازه‌ی (w,h) → ابتدای dst (0,0)
function blitRegion(dst, src, sx0, sy0, w, h) {
  const dx0 = Math.max(0, -sx0), dy0 = Math.max(0, -sy0);       // برش خارج از src
  const dx1 = Math.min(w, src.w - sx0), dy1 = Math.min(h, src.h - sy0);
  const len = dx1 - dx0; // ن۳۹: ردیف‌های بلند — memcpy سریع‌تر از حلقه است
  for (let y = dy0; y < dy1; y++) {
    const sOff = (sy0 + y) * src.w + sx0 + dx0;
    const dOff = y * dst.w + dx0;
    dst.d.set(src.d.subarray(sOff * 4, (sOff + len) * 4), dOff * 4);
  }
}

// رندر کامل صحنه‌ی دانجن در Raster
let _dr = null; // S2.7: نگاشتِ سلولِ دانجن برای پیش‌بینیِ آب (بدون تخصیصِ هر فریم)
const _dcell = (x, y) => _dr.cell(x, y);
export function renderRun(run, r) {
    const D = run.dungeon, h = run.hero; _dr = D;
    const [shx, shy] = run.fx.offset(run.time);
    let cx = clamp(Math.round(run.cam.x) + shx, 0, WORLD_W - r.w);
    // S10.8: قهرمانِ بلند زیرِ نوارِ بالای HUD نرود — دوربین تا ۵۲px بالای لبه‌ی نقشه (ناحیه‌ی پشتِ HUD) آزاد است
    let cy = clamp(Math.round(run.cam.y) + shy, -52, WORLD_H - r.h);
    if (!run._floorCache || run._floorCache.w !== WORLD_W) { // S10.1: پختِ تکه‌تکه — تا آماده شود صفحه‌ی تیره (زیرِ فیدِ ورود)
      run._floorCache = bakeFloorStep(run, globalThis.__BAKE_BUDGET ?? (typeof requestAnimationFrame === 'function' ? 8 : Infinity)); // node/ابزارها: یک‌جا
      if (!run._floorCache) { r.d.fill(0); for (let i = 3; i < r.d.length; i += 4) r.d[i] = 255; return; }
    }
    blitRegion(r, run._floorCache, cx, cy, r.w, r.h);
    if (cy < 0) for (let i = 0; i < -cy * r.w; i++) { r.d[i * 4] = 8; r.d[i * 4 + 1] = 7; r.d[i * 4 + 2] = 14; r.d[i * 4 + 3] = 255; } // S10.8: نوارِ پشتِ HUD
    // آب زنده‌ی دانجن (روی کش ایستا) — فقط تایل‌های آبِ نمایان
    const dwf = [0, 1, 2, 1][Math.floor(run.time * 0.9) % 4]; // ن۳۷: سیکل آرام آب دانجن
    for (let ty = Math.max(0, Math.floor(cy / TILE)); ty <= Math.min(ROWS - 1, Math.ceil((cy + r.h) / TILE)); ty++)
      for (let tx = Math.floor(cx / TILE); tx <= Math.min(COLS - 1, Math.ceil((cx + r.w) / TILE)); tx++)
        // S2.7: همان ماژولِ آبِ مزرعه — عمق + کاستیک + ساحلِ سنگیِ هم‌تُن با کفِ تم
        if (D.cell(tx, ty).kind === 'water') drawWater(r, tx * TILE - cx, ty * TILE - cy, _dcell, tx, ty, dwf, dungeonShore(D.theme));
    {
      const sc = D.stairs;
      const sx = sc.x * TILE - cx, sy = sc.y * TILE - cy;
      if (run.stairsOpen() && Math.floor(run.time * 1.5) % 2 === 0 && sx > -TILE && sy > -TILE && sx < r.w && sy < r.h) r.rect(sx + 6, sy + 6, 4, 4, E.gold);
    }
    drawTorches(r, D, cx, cy, run.time);
    drawChests(r, D, cx, cy, run.time);
    drawShrines(r, D, cx, cy, run.time);
    // هاله‌ی تهدید باس (نبض قرمز زیر پا)
    const bossRef = D.enemies.find((e) => e.isBoss) || null; // یک find برای هاله + مینی‌مپ
    if (bossRef && bossRef.state !== 'die') {
      // S6.6: هاله‌ی تهدیدِ فاز‌محور — فاز ۲ گرم‌تر · فاز ۳ «هاله‌ی خشم» (دو حلقه، تندتر)
      const bph = bossRef.phase || 1, pw = bph === 3 ? 1.35 : bph === 2 ? 1.15 : 1;
      const pulse = Math.sin(run.time * (bph === 3 ? 6 : 3));
      const col = bph === 3 ? [236, 74, 52, 66] : bph === 2 ? [214, 92, 60, 52] : [190, 60, 60, 42];
      r.ellipse(Math.round(bossRef.x) - cx, Math.round(bossRef.y) + 2 - cy, Math.round((26 + pulse * 3) * pw), Math.round(8 * pw), col);
      if (bph === 3) r.ellipse(Math.round(bossRef.x) - cx, Math.round(bossRef.y) + 2 - cy, Math.round(34 + pulse * 5), 11, [236, 74, 52, 30]);
    }
    // رد دوج: شبح‌های آبی محوشونده
    if (run._trail) for (const g of run._trail) {
      const a = Math.round(70 * (1 - g.t / 0.3));
      r.ellipse(Math.round(g.x) - cx, Math.round(g.y) - 14 - cy, 7 - g.t * 12, 12 - g.t * 20, [140, 220, 255, Math.max(0, a)]);
    }
    // ن۴۱: اسپلش ورود طبقه — فونت دوزبانه‌ی بزرگ، محو ۲٫۲ث (روی تاریکی می‌افتد تا خوانا بماند)
    if (run._splash) {
      const k = run.time - run._splash.t0;
      if (k < 0 || k > 2.2 || !isFinite(k)) run._splash = null;
      else {
        const aIn = Math.min(1, k / 0.25), aOut = Math.min(1, (2.2 - k) / 0.45);
        const al = Math.round(255 * Math.min(aIn, aOut));
        if (al > 6) {
          _spC2[3] = al;
          // ن۵۰: تیترِ طبقه با حاشیه‌ی دوپیکسله + سایه (دورِ کلِ رشته، نه تک‌تکِ حروف)
          drawTitleC(r, t('floor') + ' ' + faNum(run._splash.n) + (run._splash.boss ? ' — ' + t('bossFloor') : ''), r.w / 2, 30, run._splash.boss ? _bossC : _spC2, 2);
        }
      }
    }
    // pool رپرها — بدون تخصیص آبجکت در هر فریم
    let ne = 0;
    for (const e of D.enemies) if (!e.dead) {
      let wp = ENTS[ne];
      if (!wp) { wp = ENTS[ne] = { y: 0, e: null, hero: false }; }
      wp.y = e.y; wp.e = e; wp.hero = false; ne++;
    }
    let hp = ENTS[ne];
    if (!hp) hp = ENTS[ne] = { y: 0, e: null, hero: false };
    hp.y = h.y; hp.hero = true; hp.e = null; ne++;
    ENTS.length = ne;
    ENTS.sort(BY_Y);
    // S9.2: موجوداتِ داخلِ هاله‌ی قهرمان **پس از تاریکی** کشیده می‌شوند (رنگِ کاملِ پالت ⇒ جدا از کف)؛ دورترها مثل قبل در تاریکی
    let nLit = 0;
    for (const en of ENTS) {
      if (!en.hero) { const e = en.e, dx = e.x - h.x, dy = e.y - h.y; if (dx * dx + dy * dy < LIT_R2) { LIT[nLit++] = en; continue; } }
      else { LIT[nLit++] = en; continue; }
      drawEnt(en);
    }
    LIT.length = nLit;
    function drawEnt(en) {
      if (en.hero) {
        const hx = Math.round(h.x) - HOX - cx, hy = Math.round(h.y) - HOY - cy;
        // S9.10: حلقه‌ی سفیدِ دورِ قهرمان حذف شد (حاشیه‌ی دوبل = حسِ برچسبِ بی‌کیفیت)؛ جدایی از کف با رسمِ پس از تاریکی
        run._heroSprite().over(r, hx, hy); // سایه داخل اسپرایت پخته شده (ن۳۵: دوبل حذف شد)
        // فلاش قرمز هنگام آسیب (سوسو)
        if (h.hurtT > 0 && Math.floor(h.hurtT * 30) % 2 === 0) run._heroSprite(true).over(r, hx, hy);
        // چشمک iframe دوج
        else if (h.iframe > 0 && Math.floor(h.iframe * 24) % 2 === 0) r.rect(hx + 14, hy + 14, 36, 36, IFRAME_BOX); // ن۳۵: بوم ۶۴px
      }
      else {
        const e = en.e, s = e.sprite();
        s.over(r, Math.round(e.x) - 64 - cx, Math.round(e.y) - (e.isBoss ? 112 : 100) - cy);
      }
    }
    drawProjs(r, run.projs || [], cx, cy); // ن۴۴: تیرها و گوی‌های آتش
    // S3.8: سرستون‌های ستون‌ها — بالای تایل بیرون می‌زنند و **بعد از موجودات/قهرمان** کشیده می‌شوند (y-sort یک‌لایه)
    // فهرستِ ستون‌ها یک‌بار به‌ازای هر دانجن ساخته می‌شود (نه هر فریم) ⇒ هزینه‌ی رندر ناچیز
    if (!D._pillars) { const a = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = D.cell(x, y); if (c && c.kind === 'pillar') a.push(x, y, c.v); } D._pillars = a; }
    const PL = D._pillars;
    for (let k = 0; k < PL.length; k += 3) {
      const px = PL[k] * TILE - cx, py = PL[k + 1] * TILE - cy;
      if (px > -16 && px < r.w && py > -16 && py < r.h) drawPillarHead(r, px, py, PL[k + 2], D.theme);
    }
    if (run.hero.chill > 0) { // ن۴۴: نشانگر کندی یخ — سه ذره‌ی ثابت سرد روی پا (سیگنال گیم‌پلی، نه دکور)
      const hx = Math.round(run.hero.x - cx), hy = Math.round(run.hero.y - cy);
      const a2 = Math.round(140 + Math.sin(run.time * 6) * 40);
      r.px(hx - 4, hy - 1, [170, 220, 250, a2]); r.px(hx + 4, hy - 2, [190, 235, 255, a2]); r.px(hx, hy - 3, [150, 205, 245, a2]);
    }
    drawDrops(r, D, cx, cy);
    if (run.hero.skillT > 0) r.ellipse(Math.round(h.x - cx), Math.round(h.y - 12 - cy), 40, 18, SKILL_HALO);
    if (run.hero.iframe > 0 && Math.floor(run.time * 16) % 2 === 0) r.ellipse(Math.round(h.x - cx), Math.round(h.y - 12 - cy), 14, 22, IFRAME_GLOW);

    // ---- تاریکی + منابع نور (آرت جدا در art/light.js) ----
    if (!run._dark || run._dark.w !== r.w || run._dark.h !== r.h) run._dark = new Raster(r.w, r.h);
    const L = _lights; L.length = 0;
    L.push(h.x - cx, h.y - 14 - cy, 78, 195); // دید باز — نه ذربین!
    for (const t of D.torches) { // نور مشعل (S3.7): شعاع/قدرت از TORCH_LIGHT — نفسِ کندِ کوانتیزه (۰٫۹Hz، فازِ مکانی)
      const st = TORCH_LIGHT.st0 + TORCH_LIGHT.stStep * (Math.floor(run.time * 0.45 + t.x * 2.1 + t.y) & 1);
      L.push(t.x * TILE + 8 - cx, t.y * TILE + TORCH_LIGHT.yOff - cy, TORCH_LIGHT.r, st);
    }
    for (const d of D.drops) if (d.kind === 'essence') L.push(d.x - cx, d.y - cy, 10, 100);
    L.push(D.stairs.x * TILE + 8 - cx, D.stairs.y * TILE + 8 - cy, 22, 135);
    if (D.shrine && !D.shrine.used) L.push(D.shrine.x - cx, D.shrine.y - cy, 20, 80 + 12 * Math.round((Math.sin(run.time * 2.4) + 1))); // نور فیروزه‌ای محراب
    // ---- S4.1: نورهای رنگی (حداکثر ۶ روی صفحه؛ شعاع ≤ ۴۰) — به ترتیبِ اهمیت پرش می‌کنند ----
    const C = _clights; C.length = 0;
    const pushC = (X, Y, rad, st, cid) => {
      if (C.length >= C_MAX * 5) return;                   // سقفِ نورهای رنگی روی صفحه (مشخصه: ≤۶)
      if (X < -rad || Y < -rad || X > r.w + rad || Y > r.h + rad) return; // بیرونِ فریم = هزینه‌ی بی‌فایده
      C.push(X, Y, Math.min(40, rad), st, cid);
    };
    if (COLOR_LIGHTS.on) {
      // ترتیبِ اهمیت: نورهای کارکردی (مشعل/محتوای دراپ) اول، تزئینی‌ها آخر
      for (const t of D.torches) pushC(t.x * TILE + 8 - cx, t.y * TILE + TORCH_LIGHT.yOff - cy, TORCH_LIGHT.r, TORCH_COL_ST, 0); // شدتِ رنگِ ملایم‌تر از شدتِ روشنایی
      for (const d of D.drops) if (d.kind === 'essence') pushC(d.x - cx, d.y - cy, 14, 90, 1);
      if (D.shrine && !D.shrine.used) pushC(D.shrine.x - cx, D.shrine.y - cy, 16, 66, 3);
      for (const e of D.enemies) if (!e.dead && e.isBoss) pushC(e.x - cx, e.y - 40 - cy, 30, 92, 2); // برقِ گدازه‌ایِ باس
      pushC(D.stairs.x * TILE + 8 - cx, D.stairs.y * TILE + 8 - cy, 14, 52, 5);
      pushC(h.x - cx, h.y - 14 - cy, 22, 44, 4);           // هالهٔ گرمِ ملایمِ قهرمان (آخر ⇒ بودجه‌ی باقی‌مانده)
    }
    // ---- S4.6: درخشش‌های افزایشی (استامپِ پیش‌پخته) — پس از تاریکی رسم می‌شوند ----
    glowBegin();
    if (GLOW.on) {
      for (const t2 of D.torches) glowAdd(t2.x * TILE + 8 - cx, t2.y * TILE + TORCH_LIGHT.yOff - cy, 0, 2, 96, 4); // مشعل
      for (const d2 of D.drops) if (d2.kind === 'essence') glowAdd(d2.x - cx, d2.y - cy, 1, 0, 74, 3);           // اسانس
      if (D.shrine && !D.shrine.used) glowAdd(D.shrine.x - cx, D.shrine.y - cy, 3, 1, 58 + (Math.sin(run.time * 2.4) > 0 ? 12 : 0), 3); // محراب
      glowAdd(D.stairs.x * TILE + 8 - cx, D.stairs.y * TILE + 8 - cy, 2, 0, 40, 2);                              // پله‌ی خروج
      for (const pr of run.projs || []) if (pr.kind === 'fire') glowAdd(pr.x - cx, pr.y - cy, 0, 0, 78, 3);       // گویِ آتش
      for (const e2 of D.enemies) {                                                                              // چشمِ روح/آتش‌جان + هاله‌ی باس
        if (e2.dead) continue;
        if (e2.isBoss) glowAdd(e2.x - cx, e2.y - 44 - cy, 4, 2, 58, 2);
        else if (EYE_GLOW[e2.kind]) glowAdd(e2.x - cx, e2.y - (MHEAD[e2.kind] ?? 76) - cy, EYE_GLOW[e2.kind], 0, 44, 1);
      }
    }
    setThemeGrade(GRADE.off ? -1 : D.theme);                     // S4.3: گریدینگِ رنگیِ تم (LUT یک‌بار در هر تغییرِ تم)
    applyDarkness(r, run._dark, L, C, cx, cy); // S4.2: دوربین برای دیترِ جهانی
    glowDraw(r);                               // S4.6: هاله‌ها روی تاریکی (افزودنی + clamp)
    for (const en of LIT) drawEnt(en);         // S9.2: موجوداتِ روشن روی تاریکی
    drawMotes(r, 'dungeon', D.theme, cx, cy, run.time, r.w, r.h); // S4.8: ذراتِ آرامِ تم (≤۶، ۱px)
    // افکت‌ها روی تاریکی (می‌درخشند)
    run.fx.render(r, cx, cy);
    // ---- نوار جان + علامت حمله + تاجِ نخبه + کمبو: بعد از تاریکی (خوانا حتی در تاریکی) ----
    for (const e of D.enemies) {
      if (e.dead) continue;
      // S6.1: تاجِ نخبه **پس از تاریکی** — در S4.2 تاریکی اضافه شد و تاج که پیش از آن کشیده می‌شد خفه/تیره می‌ماند
      // (elite47 همین را «۴/۱۴» گزارش می‌کرد). حالا مثل نوار جان/مؤلفه‌های خوانایی در لایهٔ روشن است.
      if (e.isElite) drawEliteMark(r, Math.round(e.x - cx), Math.round(e.y - cy), run.time, Math.round(e.y - cy) - (e.isBoss ? 118 : (MHEAD[e.kind] ?? 76)));
      if (e.hp < e.maxHp) {
        const bw = e.isBoss ? 40 : 18, top = Math.round(e.y - cy) - (e.isBoss ? 100 : 64);
        const bx = Math.round(e.x - cx) - bw / 2;
        r.rect(bx - 1, top - 1, bw + 2, 5, [12, 10, 24, 200]); // قاب — خوانایی کامل
        r.rect(bx, top, bw, 3, [20, 16, 33, 255]);
        r.rect(bx, top, Math.round(bw * e.hp / e.maxHp), 3, e.isBoss ? [201, 95, 95, 255] : [110, 190, 90, 255]);
      }
      if (e.state === 'attack' && e.t < 0.5 && Math.floor(run.time * 8) % 2 === 0) {
        r.rect(Math.round(e.x - cx) - 1, Math.round(e.y - cy) - (e.isBoss ? 112 : 78), 3, 5, E.gold);
      }
    }
    if (run.comboN >= 2 && run.comboT > 0) drawTextC(r, '×' + run.comboN, Math.round(h.x) - cx, Math.round(h.y) - 58 - cy, E.gold, 1, { outline: true }); // ن۴۱: فونت جدید + outline
    // پالس «مهارت آماده شد» — حلقه‌ی گسترنده‌ی آبی دور قهرمان
    if (run._skillPulse > 0) {
      const pk = 1 - run._skillPulse / 0.55;
      const rr2 = 10 + pk * 30, al = Math.round((1 - pk) * 150);
      r.ellipse(Math.round(h.x) - cx, Math.round(h.y) - 16 - cy, rr2, rr2 * 0.45, [150, 225, 255, al]);
      const r2 = Math.max(2, rr2 - 5);
      r.ellipse(Math.round(h.x) - cx, Math.round(h.y) - 16 - cy, r2, r2 * 0.45, [220, 245, 255, Math.round(al * 0.6)]);
    }
    // ---- مینی‌مپ (کش‌شده در هر طبقه — فقط نقطه‌های متحرک زنده) ----
    const s = 1, my = 3;
    const hsx = Math.round(h.x) - cx, hsy = Math.round(h.y) - cy;
    const mx = (hsx < COLS + 30 && hsy < ROWS + 30) ? r.w - COLS - 8 : 3; // ن۴۹: قهرمانِ گوشه‌ی بالا-چپ زیر مینی‌مپ گم می‌شد → مینی‌مپ می‌پرد گوشه‌ی راست
    if (!run._mini || run._miniFloor !== run.floor) {
      const m = run._mini = new Raster(COLS, ROWS);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = D.cell(x, y);
        if (c.kind === 'wall') continue;
        let col = MINI_FLOOR;
        if (c.kind === 'stairs') col = E.gold;
        else if (c.kind === 'pillar') col = MINI_PILLAR;
        else if (c.kind === 'decor' && c.v === 1) col = MINI_WATER;
        m.px(x, y, col);
      }
      run._miniFloor = run.floor;
    }
    r.rect(mx - 1, my - 1, COLS * s + 2, ROWS * s + 2, MINI_BG);
    run._mini.over(r, mx, my);
    // S9.10: برچسبِ طبقه زیرِ مینی‌مپ حذف شد — در نمای کوچک بزرگ و بریده از لبه‌ی چپ بود؛ شماره‌ی طبقه در نوارِ پایینِ HUD هست
    const hx = Math.floor(h.x / TILE), hy = Math.floor(h.y / TILE);
    if (Math.floor(run.time * 4) % 2 === 0) r.rect(mx + hx * s, my + hy * s, 2, 2, [255, 255, 255, 255]);
    if (bossRef) r.px(mx + Math.floor(bossRef.x / TILE) * s, my + Math.floor(bossRef.y / TILE) * s, BOSS_DOT);
  }
