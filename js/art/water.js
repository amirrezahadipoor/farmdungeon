// art/water.js — آب و کرانه (S2.7): **یک منبع** برای مزرعه و دانجن
// سه لایه: (۱) بدنه بر اساسِ عمق (فاصله تا خشکی → shallow/mid/deep) + کاستیکِ ۴ فریم با فازِ جهانی
//          (۲) ساحلِ ۱–۳px از تُنِ «زمینِ ساحلی» با گوشه‌ی گرد (mask4)
//          (۳) کفِ موجِ خط‌چین با نوسانِ ±۱px روی لبه‌ی درونیِ ساحل
// هر سه لایه در یک اسپرایتِ ۱۶×۱۶ پخته و با **کلید عددی** کش می‌شوند (مسیر داغ: هر تایلِ آب، هر فریم)
// قانونِ تُن: هر گذر (خشکی→ساحل→کم‌عمق→میان→عمیق، و کاستیک/موج) **یک پله** (ΔL≈۱۳)
// ⇒ هیچ مرزِ سختی پدید نمی‌آید (M8 آب↔زمین = ۰) و عمق با ditherِ تایل‌به‌تایل نیاز ندارد.
import { TILE, E } from './palette_env.js';
import { Raster } from '../raster.js';
import { rp } from './ramps.js';
import { hash2 } from './noise.js';
import { DPAL } from './ground.js';

// ضلع‌ها (بیت‌های mask4): [بیت، افقی، ازابتدا، ضلعِ مجاور در آغاز، ضلعِ مجاور در پایان، dx، dy]
const SIDE = [[1, 1, 1, 8, 2, 0, -1], [2, 0, 0, 1, 4, 1, 0], [4, 1, 0, 8, 2, 0, 1], [8, 0, 1, 1, 4, -1, 0]];
const MAXD = 3;

// پالت‌های ساحل: تُنِ خشکی + کف + بدنه/کاستیک/موج به‌ازای هر عمق
// مزرعه: ساحلِ ماسه‌ایِ **هم‌تراز با چمن** (sand[3] همان L چمنِ پایه است ⇒ ΔL با تُفتِ تیره/روشن هم ≤۱۳)
export const SHORE_FARM = {
  id: 'f', n: 0,
  // ساحلِ عادی: ماسه‌ای **هم‌تراز با چمنِ پایه** (L۶۵ در برابر تُفت‌های ۵۲/۷۹ و چمنِ ۶۶ ⇒ بیشینه ΔL ۱۴)
  // ساحلِ تیره (کنارِ پرچین/سازه): ماسه‌ی خیس ⇒ در برابر پرچین (L۲۵/۳۹/۵۲) بیشینه ΔL ۱۴
  rim: [rp('sand', 4), rp('sand', 2)], speck: [rp('sand', 5), rp('sand', 3)], speckD: [rp('sand', 3), rp('sand', 1)],
  dark: { hedge: 1 }, foam: E.sparkle, // کفِ سفید-آبی
  body: [rp('water', 3), rp('water', 2), rp('water', 1)],
  up: [rp('water', 4), rp('water', 3), rp('water', 2)],
  dn: [rp('water', 2), rp('water', 1), rp('water', 0)],
};
// دانجن: ساحلِ سنگیِ هم‌تُن با کفِ همان تم (کف = floorA/floorB؛ لبه‌ی برخورد = stoneSh)
const _dsh = [];
export function dungeonShore(t) {
  if (!_dsh[t]) {
    const P = DPAL(t);
    const WB = ['water', 'water', 'stoneForge', 'magicCyan', 'leaf', 'metal'][t] || 'water';   // رمپِ بدنه‌ی آبِ تم (S3.10: باتلاق سبز · معدن خاکستریِ معدنی)
    const WF = [['water', 4], ['water', 4], ['fire', 6], ['magicCyan', 6], ['leaf', 6], ['metal', 6]][t] || ['water', 4]; // [رمپِ کفِ موج، پله]
    _dsh[t] = {
      // ساحلِ **تیره**: سنگِ خیس یک پله زیرِ کف (L۳۹ در برابر کفِ L۵۲) — غار تاریک است و
      // روشناییِ لبه از کفِ موج می‌آید نه از سنگ؛ آبِ کم‌عمق یک پله روشن‌تر از ساحل ⇒ مرزِ سخت نداریم
      n: 1 + t, id: 'd' + t, rim: [P.mortar, P.stone], speck: [P.floorA, P.stoneHi], speckD: [P.brickOut, P.floorB],
      dark: {}, bevel: [4 | 2, 'dfloor'], // کفِ دانجن در بالا/چپ بِوِلِ روشن (stoneHi) دارد ⇒ ساحلِ روشن روبه‌رویش
      // S3.9 هویتِ تم در آب: بدنه/کاستیک/کفِ موج از رمپِ خودِ تم — ساختارِ پله‌ایِ S2.7 دست‌نخورده
      // (هر گذر یک پله ⇒ M8 آب↔زمین = ۰) · گدازه: بدنه‌ی تیره‌ی گرم + کاستیکِ fire · یخ: آبِ روشنِ فیروزه‌ای
      foam: rp(WF[0], WF[1]),
      body: [rp(WB, 3), rp(WB, 2), rp(WB, 1)],
      up: t === 2 ? [rp('fire', 4), rp('fire', 3), rp(WB, 2)] : [rp(WB, 4), rp(WB, 3), rp(WB, 2)],
      dn: [rp(WB, 2), rp(WB, 1), rp(WB, 0)],
    };
  }
  return _dsh[t];
}

// عمق = فاصله‌ی چبیشف تا نخستین تایلِ غیرآب (۱ = کنار ساحل · ۳ = عمیق)
export function waterDepth(isW, tx, ty) {
  for (let d = 1; d <= MAXD; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.abs(dx) !== d && Math.abs(dy) !== d) continue; // فقط پوسته‌ی مربع
      if (!isW(tx + dx, ty + dy)) return d;
    }
  }
  return MAXD;
}
// عرضِ نوارِ ساحل در امتدادِ ضلع — قطعی از مختصاتِ **جهانی** (تکرارِ ۱۶px ندارد)
function rimW(tx, ty, bit, a, horiz) {
  const ga = horiz ? tx * TILE + a : ty * TILE + a;
  const h = hash2(bit * 37 + (horiz ? ty * 131 : tx * 131) + 11, ga, 43);
  return 1 + (h > 0.52 ? 1 : 0) + (h > 0.84 ? 1 : 0); // ۱..۳px
}
// کشِ بدنه با **کلید عددی** (مسیر داغ هر فریم است: رشته نساز — درسِ S2.2)
const _body = new Map();
function body(sh, tx, ty, side4, dk, d, ph) {
  const k = ((((sh.n * 20 + ty) * 30 + tx) * 16 + side4) * 16 + dk) * 16 + d * 4 + ph;
  let s = _body.get(k);
  if (!s) { s = new Raster(TILE, TILE); paint(s, sh, tx, ty, side4, dk, d, ph); s.markOpaque(); _body.set(k, s); }
  return s;
}
// یادداشتِ اطلاعاتِ تایل (عمق/ماسک/تُنِ ساحل): پویشِ حلقه‌ها فقط وقتی سلول‌ها عوض شوند
// (تعویضِ طبقه ⇒ شیء‌های سلول تازه ⇒ ناهماهنگی با یادداشت ⇒ بازپویش؛ در غیر این صورت ۵ فراخوانی به‌جای ~۵۶)
const _info = new Map();
function info(cell, tx, ty, sh, c0, cN, cE, cS, cW) {
  const key = tx * 64 + ty, e = _info.get(key);
  if (e && e[0] === c0 && e[1] === cN && e[2] === cE && e[3] === cS && e[4] === cW) return e;
  const isW = (c) => !!c && c.kind === 'water';
  const m8 = (isW(cN) ? 1 : 0) | (isW(cE) ? 2 : 0) | (isW(cS) ? 4 : 0) | (isW(cW) ? 8 : 0);
  const d = waterDepth((x, y) => isW(cell(x, y)), tx, ty);
  let dk = 0;
  for (const [bit, horiz, fromStart, sAdj, eAdj, dx, dy] of SIDE) {
    if (m8 & bit) continue;
    const nc = dx > 0 ? cE : dx < 0 ? cW : dy > 0 ? cS : cN;
    if (!nc || (sh.dark && sh.dark[nc.kind])) dk |= bit;                            // همسایه‌ی تیره/سازه
    else if (sh.bevel && (sh.bevel[0] & bit) && nc.kind === sh.bevel[1]) dk |= bit;  // لبه‌ی روشنِ کف
  }
  const out = [c0, cN, cE, cS, cW, m8, d, dk];
  _info.set(key, out);
  return out;
}
// بدنه‌ی کش‌شده: عمق + کاستیکِ هم‌فاز‌نشده + ساحل (کف روی آن می‌آید)
function paint(r, sh, tx, ty, side4, dk, d, ph) {
  const i = d - 1;
  r.rect(0, 0, TILE, TILE, sh.body[i]);
  // کاستیکِ ۴ فریم: دو نوارِ روشن + یک موجِ تیره که با فازِ جهانی می‌لغزند (تایل‌ها هم‌فاز نیستند)
  r.rect(1 + ph, 4 + ph, 5, 1, sh.up[i]);
  r.rect(9 - ph, 9 + ph, 4, 1, sh.up[i]);
  r.rect(4 + ph, 13 - ph, 5, 1, sh.dn[i]);
  r.px(11 - ph, 2 + (ph & 1), E.sparkle); // جلای سطح (یک پیکسل)
  // ساحل: نوارِ ۱–۳px روی هر ضلعِ بی‌همسایه، گوشه با قوسِ ۲px (دو ضلعِ مجاور = گوشه‌ی گرد)
  for (const [bit, horiz, fromStart, sAdj, eAdj] of SIDE) {
    if (side4 & bit) continue;                       // ضلعِ داخلی (آب↔آب): باز
    const j = (dk & bit) ? 1 : 0;                    // همسایه‌ی تیره (سازه/پرچین) ⇒ ساحلِ تیره
    const rimC = sh.rim[j], spC = sh.speck[j], spDC = sh.speckD[j];
    for (let a = 0; a < TILE; a++) {
      let w = rimW(tx, ty, bit, a, horiz);
      if (a < 2 && !(side4 & sAdj)) w -= 2 - a;
      else if (a > TILE - 3 && !(side4 & eAdj)) w -= 2 - (TILE - 1 - a);
      for (let k = 0; k < w; k++) {
        const hh = hash2(bit * 29 + a, k * 7 + 3, 47);
        const c = hh > 0.90 ? spC : (hh < 0.08 ? spDC : rimC); // لکه‌های ماسه/سنگ روی ساحل
        const p = fromStart ? k : TILE - 1 - k;
        if (horiz) r.px(a, p, c); else r.px(p, a, c);
      }
    }
  }
  // کفِ موج: خط‌چینِ ۱px روی نخستین پیکسلِ آب پس از نوار با نوسانِ ±۱px — **در بدنه پخته می‌شود**
  // (جایِ کف فقط به فاز وابسته است، نه به زمانِ پیوسته ⇒ هیچ هزینه‌ای هر فریم ندارد)
  const off = ph < 2 ? 0 : 1;
  for (const [bit, horiz, fromStart, sAdj, eAdj, dx, dy] of SIDE) {
    if (side4 & bit) continue;
    for (let a = 0; a < TILE; a++) {
      let w = rimW(tx, ty, bit, a, horiz);
      if (a < 2 && !(side4 & sAdj)) w -= 2 - a;
      else if (a > TILE - 3 && !(side4 & eAdj)) w -= 2 - (TILE - 1 - a);
      if (w <= 0) continue;
      const ga = horiz ? tx * TILE + a : ty * TILE + a;
      if (hash2(bit * 53 + 7, ga, 41) > 0.42) continue; // خط‌چینِ قطعی (~۴۲٪ پوشش)
      const k = w + off, p = fromStart ? k : TILE - 1 - k; // نخستین پیکسلِ آب پس از نوار (نه روی خودِ نوار)
      if (horiz) r.px(a, p, sh.foam); else r.px(p, a, sh.foam);
    }
  }
}
// یک تایلِ آب — cell(x,y) سلول را برمی‌گرداند (بیرونِ نقشه = undefined)
export function drawWater(r, sx, sy, cell, tx, ty, frame, sh) {
  const c0 = cell(tx, ty), cN = cell(tx, ty - 1), cE = cell(tx + 1, ty), cS = cell(tx, ty + 1), cW = cell(tx - 1, ty);
  const [, , , , , side4, d, dk] = info(cell, tx, ty, sh, c0, cN, cE, cS, cW);
  const ph = (frame + ((tx * 5 + ty * 3) & 3)) & 3; // فازِ جهانی: موج از تایلی به تایل هم‌فاز نیست
  body(sh, tx, ty, side4, dk, d, ph).over(r, sx, sy); // بدنه + کاستیک + ساحل + کف — همه کش‌شده
}
