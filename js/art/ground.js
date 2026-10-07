// art/ground.js — تایل‌های زمین مزرعه: چمن/خاک/آب/پرچین/حصار/دروازه/بوته
import { TILE, E, sprite, h2 } from './palette_env.js';
import { rp } from './ramps.js';
import { hash2 } from './noise.js'; // S2.4: خوشه‌های چمنِ قطعی
// ---------- تایل‌های زمین ----------
// کش عددی — حلقه‌ی رندر ~۶۰۰ بار/فریم صدا می‌زند؛ کلید رشته‌ای = زبال‌ساز پنهان
export const KIND_ID = { grass: 0, soil: 1, path: 2, hedge: 3, water: 4, fence: 5, dfloor: 6, wall: 7, stairs: 8, gateL: 9, gateR: 10, pillar: 11, decor: 12, bush: 13, fencePost: 14 };
const _gnum = new Array(15 * 64 * 4).fill(null); // S2.4: ۸ واریانت → ۶۴ اسلات به‌ازای هر کیند؛ ۴ تم دانجن (ن۳۲)

// تم رنگی دانجن (ن۳۲ → S1.4): هر تم یک رمپ سنگ + رمپِ هویتِ خزه/گدازه/یخ
// قانون کنتراست S1.4 (اندازه‌گیری‌شده): L کف ≈ ۵۲/۶۵ · نمای دیوار (brick) = ۳۸ → ΔL ۲۰ ✓ · کلاهک (stone) = ۷۸ → ΔL ۲۰ ✓
// کلیدهای قدیمی DPAL حفظ شده‌اند (brick/brickHi/brickOut/stone/stoneHi/stoneSh/warm/mortar/cap/moss/mossD/stairs/stairsSh/glint) + تازه: floorA/floorB
const STONE_THEMES = ['stoneCool', 'stoneMoss', 'stoneForge', 'stoneIce'];   // تم ۰..۳
const MOSS_THEMES = ['leaf', 'leaf', 'fire', 'magicCyan'];                  // هویتِ خزه/گدازه/یخ
const DTHEME = STONE_THEMES.map((X, t) => {
  const M = MOSS_THEMES[t];
  return {
    brick: rp(X, 2), brickHi: rp(X, 3), brickOut: rp(X, 0), glint: rp(X, 4),      // بدنه‌ی دیوار (تیره) + جلای آجر
    stone: rp(X, 5), stoneHi: rp(X, 6), stoneSh: rp(X, 3),                        // سنگِ روشن (کلاهک/ستون/دروازه/پله)
    cap: rp(X, 4), mortar: rp(X, 2),                                              // خطِ کلاهک + درزهای کف
    floorA: rp(X, 3), floorB: rp(X, 4), warm: rp(X, 4),                           // سنگ‌فرش دو‌تُن کف
    stairs: rp(X, 5), stairsSh: rp(X, 3),
    moss: rp(M, 5), mossD: rp(M, 3),                                              // خزه/گدازه/یخ — هویت تم
  };
});
export const DPAL = (t) => DTHEME[t] || DP0;

export function groundSprite(kind, variant = 0, wet = false, waterFrame = 0, theme = 0) {
  const nk = theme * 960 + KIND_ID[kind] * 64 + (variant & 7) * 8 + (wet ? 4 : 0) + (waterFrame & 3); // S2.4: ۸ واریانت
  let cached = _gnum[nk];
  if (cached) return cached;
  const P = DPAL(theme); // پالت سنگ دانجن — تم ۰ همان E است
  const key = `g|${kind}|${variant}|${wet ? 1 : 0}|${waterFrame}|${theme}`;
  return _gnum[nk] = sprite(key, (r) => {
    if (kind === 'grass') { // S2.4: ۸ واریانت — تُن پایه + تافت‌های ۲–۳px (L/خطی). بدون گل (گل = دکال S2.9)
      const base = rp('grass', 4), side = (variant & 1) ? rp('grass', 5) : rp('grass', 3); // هر تایل فقط یک سمتِ ±۱ پله (ΔL درون‌تایل ≈ ۱۳ ✓)
      r.rect(0, 0, 16, 16, base);
      for (let sl = 0; sl < 6; sl++) { // ۶ اسلات (۲×۳) → خوشه‌های ۲–۳px بدون تلنبار
        const hh = (k) => hash2(variant * 31 + sl, k * 7 + 3, 7);
        if (hh(0) < 0.14) continue; // تایلِ تُنُک‌تر
        const px = 1 + (sl % 3) * 5 + ((hh(1) * 3) | 0), py = 1 + ((sl / 3) | 0) * 8 + ((hh(2) * 4) | 0);
        const len = 2 + ((hh(3) * 2) | 0); // ۲ یا ۳
        if (hh(4) < 0.5) { // خطیِ افقی
          r.rect(px, py, len, 1, side);
          if (hh(5) < 0.55) r.px(px + (hh(6) < 0.5 ? 0 : len - 1), py + 1, side); // خمِ L
        } else {           // خطیِ عمودی
          r.rect(px, py, 1, len, side);
          if (hh(5) < 0.55) r.px(px + 1, py + (hh(6) < 0.5 ? 0 : len - 1), side);
        }
      }
    } else if (kind === 'soil') {
      const base = wet ? E.soilWet : E.soil, hi = wet ? E.soilWetHi : E.soilHi, sh = wet ? E.soilWetSh : E.soilSh;
      r.rect(0, 0, 16, 16, base);
      r.rect(0, 0, 16, 1, hi);
      for (const y of [4, 8, 12]) { r.rect(0, y, 16, 2, sh); r.rect(0, y, 16, 1, wet ? E.soilWetSh : E.furrow); }
      r.px(3, 2, hi); r.px(12, 6, hi); r.px(6, 10, hi); r.px(13, 14, hi);
      // دانه‌بندی ریز + سنگ‌ریزه (بافت خاک واقعی‌تر)
      for (let i = 0; i < 6; i++) {
        const px = Math.floor(h2(variant * 17 + i, i * 7) * 16), py = 2 + Math.floor(h2(i * 11, variant * 13 + i) * 14);
        r.px(px, py, sh);
      }
      r.px(2 + Math.floor(h2(variant, 3) * 10), 6 + Math.floor(h2(5, variant) * 8), P.stoneHi);
      if (wet) { r.px(4, 3, E.wet); r.px(11, 9, E.wet); r.px(7, 13, E.wet); r.px(14, 5, E.wet); r.px(2, 11, E.wet); }
    } else if (kind === 'path') { // خاک‌راه کوبیده — پر تا لبه تا تایل‌ها پیوسته شوند؛ حاشیه‌ی چمن per-همسایه در drawPathEdge
      r.rect(0, 0, 16, 16, E.soilHi);
      for (let i = 0; i < 22; i++) { // بافت خاک: لکه‌های تیره/روشن قطعی
        const px = Math.floor(h2(variant * 29 + i, i * 5) * 16), py = Math.floor(h2(i * 7, variant * 11 + i) * 16);
        r.px(px, py, i % 3 === 0 ? E.soil : (i % 3 === 1 ? E.soilHi : E.soilSh));
      }
      r.rect(3 + variant * 4, 7 + variant, 5, 1, E.furrow); // ردّ چرخ/پا
    } else if (kind === 'hedge') {
      r.rect(0, 0, 16, 16, E.hedgeSh);
      for (const [bx, by] of [[2, 3], [7, 2], [12, 4], [4, 8], [10, 9], [13, 12], [2, 12], [7, 12]]) {
        r.rect(bx, by, 3, 3, (bx + by) % 3 ? E.hedge : E.hedgeHi);
        r.px(bx + 1, by, E.hedgeHi);
        r.rect(bx, by + 2, 3, 1, E.hedgeSh);
      }
      // ن۳۸: ردیف‌های تختِ hedgeSh (y0,1,6,7,15) با dither روشن شکسته شدند — حذف نوار تیره‌ی هر-۱۶px در حصار عمودی
      for (let x = 0; x < 16; x++) {
        const m = x & 3;
        if (m === 1 || m === 3) r.px(x, 15, E.hedge);
        else if (m === 2) r.px(x, 15, E.hedgeHi);
        if (m === 0 || m === 2) r.px(x, 0, E.hedge);
        else if (m === 1) r.px(x, 0, E.hedgeHi);
        if (m === 0) { r.px(x, 1, E.hedge); r.px(x, 6, E.hedge); }
        else if (m === 2) { r.px(x, 1, E.hedgeHi); r.px(x, 7, E.hedgeHi); }
        else if (m === 3) r.px(x, 7, E.hedge);
      }
    } else if (kind === 'water') { // ۳ فریم موجی: سیکل 0→1→2→1 — یکدست (ن۳۸: نوارهای هر-تایلی حذف شدند؛ لبه‌ی کرانه در رندر صحنه بر اساس همسایه‌ها)
      r.rect(0, 0, 16, 16, E.water);
      // ن۳۸: فاز موج = فریم + واریانتِ مختصاتی → تایل‌های مجاور هم‌فاز نیستند، شبکه‌ی ۱۶px نامرئی
      const ph = (waterFrame + (variant & 3)) & 3;
      r.rect(2, 4 + ph, 5, 1, E.waterHi);
      r.rect(9, 9 - ph, 5, 1, E.waterHi);
      r.rect(4 + ph, 12, 4, 1, E.waterSh);
      r.px(12 + ph, 3, E.sparkle);
      r.px(3, 8 - waterFrame, E.sparkle);
    } else if (kind === 'fence') { // ریل در تمام عرض → اتصال به همسایه‌های چپ/راست
      r.rect(0, 5, 16, 2, E.wood); r.rect(0, 11, 16, 2, E.wood);
      r.rect(0, 5, 16, 1, E.woodHi); r.rect(0, 11, 16, 1, E.woodHi);
      r.rect(6, 2, 4, 12, E.wood); r.rect(6, 2, 1, 12, E.woodHi); r.rect(9, 2, 1, 12, E.woodSh);
      r.rect(6, 1, 4, 1, E.woodHi); r.rect(6, 13, 4, 1, E.woodSh);
    } else if (kind === 'dfloor') {
      // سنگ‌فرش با دو تُن متناوب + درز تیره + جزئیات
      const warm = variant % 2 ? P.floorB : P.floorA;
      r.rect(0, 0, 16, 16, warm);
      r.rect(0, 0, 16, 1, P.stoneHi);
      r.rect(0, 0, 1, 16, P.stoneHi);
      r.rect(15, 0, 1, 16, P.stoneSh); r.rect(0, 15, 16, 1, P.stoneSh);
      // درزها: چیدمان متفاوت per variant (ن۴۳) — قبلاً صلیبِ یکسان در x=7,y=7 همه‌ی تایل‌ها = شبکه‌ی مکانیکی ۸×۸
      if (variant === 1) { r.rect(0, 7, 16, 1, P.mortar); r.rect(7, 0, 1, 8, P.mortar); r.px(7, 7, P.stoneHi); }
      else if (variant === 2) { r.rect(0, 5, 16, 1, P.mortar); r.rect(0, 11, 16, 1, P.mortar); r.rect(7, 5, 1, 6, P.mortar); r.px(7, 5, P.stoneHi); r.px(7, 11, P.stoneHi); }
      else { r.rect(0, 7, 16, 1, P.mortar); r.rect(7, 0, 1, 16, P.mortar); r.px(7, 7, P.stoneHi); }
      if (variant === 1) { r.rect(4, 5, 3, 2, P.stoneSh); r.rect(10, 10, 2, 2, P.stoneSh); }
      else if (variant === 2) { r.line(3, 12, 8, 12, P.stoneSh); r.line(9, 4, 13, 4, P.stoneSh); }
    } else if (kind === 'wall') {
      // کلاهک سنگی روشن (پرسپکتیو بالا) + بدنه‌ی آجر با جلا و خزه
      const off = (variant % 2) * 8;
      r.rect(0, 0, 16, 16, P.brick);
      r.rect(0, 0, 16, 4, P.stone);            // کلاهک
      r.rect(0, 0, 16, 1, P.stoneHi); r.rect(0, 1, 16, 1, P.cap);
      r.rect(0, 3, 16, 1, P.brickOut);          // سایه‌ی لبه‌ی کلاهک
      for (let i = 0; i < 3; i++) r.px(2 + Math.floor(h2(variant * 3 + i, i) * 12), 1 + Math.floor(h2(i, variant) * 2), P.stoneSh);
      for (let row = 1; row < 4; row++) {
        const y = row * 4;
        r.rect(0, y, 16, 1, P.brickHi);
        r.rect(0, y + 3, 16, 1, P.brickOut);
        // ن۴۳: آجرچینی رگه‌ای واقعی — درز عمودی ردیف‌های زوج/فرد ۴px جابه‌جا
        // (قبلاً shift=۰/۸ هر دو درز x=۰,۸ می‌دادند → کانال عمودی پیوسته در کل دیوار)
        const shift = ((row + off) % 2) * 4;
        for (let bx = -8 + shift; bx < 16; bx += 8) r.rect(bx, y, 1, 3, P.brickOut);
        // جلای آجر: هایلایت کوتاه per تم (قبلاً بنفش هاردکد در همه‌ی تم‌ها)
        r.px(((row * 5 + off) % 14) + 1, y + 1, P.glint);
      }
      // خزه روی درزها
      r.px(2 + (off ? 5 : 0), 5, P.moss); r.px(3 + (off ? 5 : 0), 5, P.mossD);
      r.px(11 - (off ? 4 : 0), 13, P.moss);
      if (variant === 2) { // خرابی: آجر افتاده + ترک (ن۴۳: قبلاً کد مرده — v فقط ۰/۱ می‌شد)
        r.rect(3, 6, 3, 2, P.brickOut); r.rect(4, 7, 1, 1, P.stoneSh);
        r.rect(11, 10, 3, 2, P.brickOut);
        r.line(6, 9, 9, 14, P.brickOut); r.px(10, 14, P.stoneSh);
      } else if (variant === 3) { // خزه‌گرفته: رگه‌های خزه روی خط آجر (هم‌زبان با تم طبقه)
        r.rect(0, 4, 5, 1, P.moss); r.rect(11, 4, 5, 1, P.mossD);
        r.rect(6, 8, 4, 1, P.moss); r.rect(0, 12, 6, 1, P.mossD); r.rect(10, 12, 4, 1, P.moss);
        r.px(5, 6, P.mossD); r.px(12, 10, P.moss);
      }
    } else if (kind === 'stairs') {
      r.rect(0, 0, 16, 16, P.brickOut);
      for (let i = 0; i < 4; i++) {
        r.rect(2 + i, 2 + i * 3, 12 - i * 2, 3, i % 2 ? P.stairs : P.stairsSh);
        r.rect(2 + i, 2 + i * 3, 12 - i * 2, 1, P.stoneHi);
      }
    } else if (kind === 'gateL' || kind === 'gateR') { // دروازه‌ی دانجن ۲×۲: variant 0 = ردیف بالا (سردر)، 1 = ردیف پایین (آستانه) — یک طاق یکپارچه
      const L2 = kind === 'gateL', top = variant === 0;
      const ox = L2 ? 4 : 0, ow = 12; // دهانه‌ی بنفش (سمت داخلی هر نیمه)
      r.rect(0, 0, 16, 16, P.stone);
      r.rect(ox, top ? 4 : 0, ow, top ? 12 : 12, rp('ink', 1)); // S1.3: سیاه جوهری (رمپ)
      r.rect(ox, top ? 4 : 0, ow, 1, rp('ink', 0));
      if (L2) { r.rect(0, 0, 5, 16, P.stone); r.rect(1, 0, 3, 16, P.stoneHi); r.rect(0, top ? 8 : 4, 5, 2, P.stoneSh); r.rect(4, 0, 1, 16, P.stoneSh); }
      else { r.rect(11, 0, 5, 16, P.stone); r.rect(12, 0, 3, 16, P.stoneHi); r.rect(11, top ? 8 : 4, 5, 2, P.stoneSh); r.rect(11, 0, 1, 16, P.stoneSh); }
      if (top) { // سردر: سنگ‌چین + کلید طاق
        r.rect(0, 0, 16, 4, P.brick); r.rect(0, 0, 16, 1, P.brickHi); r.rect(0, 3, 16, 1, P.brickOut);
        r.rect(L2 ? 12 : 0, 0, 4, 4, P.cap); r.rect(L2 ? 12 : 0, 0, 4, 1, P.brickHi);
        if (!L2) r.px(0, 1, P.brickHi); else r.px(15, 1, P.brickHi);
        r.px(L2 ? 14 : 1, 2, rp('magicCyan', 6)); // رون کلید طاق (رمپ)
      } else { // آستانه: پله‌ی سنگی روشن
        r.rect(0, 12, 16, 4, P.stairs); r.rect(0, 12, 16, 1, P.stoneHi); r.rect(0, 15, 16, 1, P.stairsSh);
        r.rect(ox, 11, ow, 1, rp('clothPurple', 3));
      }
      if (L2) { r.px(7, top ? 8 : 4, rp('magicCyan', 6)); r.px(9, top ? 12 : 8, [...rp('magicCyan', 6).slice(0, 3), 200]); }
      else { r.px(5, top ? 11 : 6, rp('magicCyan', 6)); r.px(8, top ? 7 : 2, [...rp('magicCyan', 6).slice(0, 3), 200]); }
      r.px(L2 ? 2 : 13, top ? 6 : 2, rp('magicCyan', 6)); r.px(L2 ? 2 : 13, top ? 11 : 8, rp('magicCyan', 5)); // رون‌های ستون
    } else if (kind === 'pillar') { // ستون سنگی روی کف (مانع) — v1: ترک‌خورده
      if (variant === 1) {
        r.rect(0, 0, 16, 16, P.stone);
        r.rect(0, 15, 16, 1, P.stoneSh);
        r.rect(2, 8, 12, 8, P.stoneSh);
        r.rect(3, 4, 10, 11, P.brick);
        r.rect(3, 4, 3, 11, P.brickHi);
        r.rect(11, 4, 2, 11, P.brickOut);
        r.rect(1, 2, 14, 3, P.stone);
        r.rect(1, 2, 14, 1, P.stoneHi); r.rect(1, 4, 14, 1, P.brickOut);
        // ترک عمیق مورب + لبه‌های شکسته
        r.line(5, 4, 8, 10, P.brickOut); r.line(8, 10, 7, 14, P.brickOut);
        r.px(6, 6, P.brickOut); r.px(8, 12, P.brickOut); r.px(9, 8, P.stoneSh);
        r.rect(4, 3, 2, 1, P.brickOut); r.rect(10, 3, 3, 1, P.brickOut); // سرستون شکسته
      } else {
      r.rect(0, 0, 16, 16, P.stone);
      r.rect(0, 15, 16, 1, P.stoneSh);
      r.rect(2, 8, 12, 8, P.stoneSh);          // سایه پایه
      r.rect(3, 4, 10, 11, P.brick);           // بدنه ستون
      r.rect(3, 4, 3, 11, P.brickHi);
      r.rect(11, 4, 2, 11, P.brickOut);
      r.rect(1, 2, 14, 3, P.stone);            // سرستون
      r.rect(1, 2, 14, 1, P.stoneHi); r.rect(1, 4, 14, 1, P.brickOut);
      r.px(6, 8, P.brickOut); r.px(9, 12, P.brickOut); // ترک
      }
    } else if (kind === 'decor') { // دکور کف دانجن: variant 0=استخوان 1=قارچ 2=ترک 5=فرش (ن۳۲)
      if (variant === 5) { // فرش قرمز تالار تخت — لبه‌ی طلایی، بافت صلیبی
        r.rect(0, 0, 16, 16, [142, 38, 44, 255]);
        r.rect(0, 0, 16, 1, [186, 58, 58, 255]); r.rect(0, 0, 1, 16, [186, 58, 58, 255]);
        r.rect(15, 0, 1, 16, [94, 24, 30, 255]); r.rect(0, 15, 16, 1, [94, 24, 30, 255]);
        r.rect(3, 3, 10, 10, [120, 30, 38, 255]);
        r.rect(7, 2, 2, 12, [170, 52, 52, 255]); r.rect(2, 7, 12, 2, [170, 52, 52, 255]);
        r.px(4, 4, [230, 199, 74, 255]); r.px(11, 4, [230, 199, 74, 255]); r.px(4, 11, [230, 199, 74, 255]); r.px(11, 11, [230, 199, 74, 255]);
      } else {
      r.rect(0, 0, 16, 16, P.stone);
      r.rect(0, 0, 16, 1, P.stoneHi); r.rect(15, 0, 1, 16, P.stoneSh); r.rect(0, 15, 16, 1, P.stoneSh);
      if (variant === 0) { // استخوان‌ها
        r.lineW(4, 10, 10, 7, 2, E.bone ?? E.white);
        r.px(3, 9, E.white); r.px(3, 11, E.white); r.px(11, 6, E.white); r.px(11, 8, E.white);
        r.rect(7, 12, 4, 2, E.white); r.px(8, 12, P.stoneSh);
      } else if (variant === 1) { // قارچ‌های نورانی
        r.rect(4, 10, 2, 3, E.essenceSh ?? P.stoneSh); r.rect(9, 8, 2, 4, E.essenceSh ?? P.stoneSh);
        r.rect(3, 8, 4, 2, E.essence); r.rect(8, 6, 4, 2, E.essence);
        r.px(4, 8, [230, 250, 255, 255]); r.px(10, 6, [230, 250, 255, 255]);
      } else if (variant === 2) { // ترک زمین
        r.line(3, 3, 7, 8, P.brickOut); r.line(7, 8, 6, 13, P.brickOut); r.line(7, 8, 12, 10, P.brickOut);
        r.px(12, 10, P.brickOut); r.px(3, 3, P.stoneSh);
      } else if (variant === 3) { // کریستال درخشان
        r.px(4, 12, E.essenceSh); r.px(11, 11, E.essenceSh);
        r.lineW(7, 13, 7, 7, 2, E.essence);       // بلور اصلی
        r.px(6, 6, [230, 250, 255, 255]); r.px(8, 8, [230, 250, 255, 255]);
        r.px(5, 9, E.essenceSh); r.px(9, 11, E.essenceSh);
        r.lineW(11, 13, 11, 10, 1, E.essence);    // بلور کوچک
        r.px(11, 9, [230, 250, 255, 255]);
      } else if (variant === 4) { // تار عنکبوت (گوشه)
        r.px(1, 1, E.white); r.px(2, 2, E.white); r.px(3, 3, P.stoneHi);
        r.line(1, 1, 6, 1, E.white); r.line(1, 1, 1, 6, E.white);
        r.line(2, 2, 6, 2, P.stoneHi); r.line(2, 2, 2, 6, P.stoneHi);
        r.line(1, 4, 4, 1, P.stoneHi); r.px(4, 4, E.white); r.px(5, 3, P.stoneHi);
      }
      }
    } else if (kind === 'bush') { // بوته‌ی مرز زمین قفل‌شده (روی چمن)
      r.rect(4, 9, 8, 5, E.hedgeSh);
      r.rect(5, 7, 6, 4, E.hedge);
      r.rect(6, 6, 3, 2, E.hedgeHi);
      r.px(6, 9, E.berry); r.px(9, 10, E.berry);
    } else if (kind === 'fencePost') { // ستون + دنباله‌ی کوتاه ریل (برای حصار عمودی)
      r.rect(0, 5, 4, 2, E.wood); r.rect(12, 5, 4, 2, E.wood);
      r.rect(0, 11, 4, 2, E.wood); r.rect(12, 11, 4, 2, E.wood);
      r.rect(6, 2, 4, 12, E.wood); r.rect(6, 2, 1, 12, E.woodHi); r.rect(9, 2, 1, 12, E.woodSh);
      r.rect(6, 1, 4, 1, E.woodHi); r.rect(6, 13, 4, 1, E.woodSh);
    }
  });
}
