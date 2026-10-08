// art/ground.js — تایل‌های زمین مزرعه: چمن/خاک/آب/پرچین/حصار/دروازه/بوته
import { TILE, E, sprite, h2 } from './palette_env.js';
import { rp } from './ramps.js';
import { drawFence, drawHedge } from './fence.js'; // S2.8
import { hash2 } from './noise.js'; // S2.4: خوشه‌های چمنِ قطعی
// ---------- تایل‌های زمین ----------
// کش عددی — حلقه‌ی رندر ~۶۰۰ بار/فریم صدا می‌زند؛ کلید رشته‌ای = زبال‌ساز پنهان
export const KIND_ID = { grass: 0, soil: 1, path: 2, hedge: 3, water: 4, fence: 5, dfloor: 6, wall: 7, stairs: 8, gateL: 9, gateR: 10, pillar: 11, decor: 12, bush: 13, fencePost: 14 };
const _gnum = new Array(15 * 512 * 4).fill(null); // S2.8: ۶۴ واریانت × (خیس/نه) × ۴ فریم = ۵۱۲ اسلات به‌ازای هر کیند؛ ۴ تم دانجن (ن۳۲)

// تم رنگی دانجن (ن۳۲ → S1.4): هر تم یک رمپ سنگ + رمپِ هویتِ خزه/گدازه/یخ
// قانون کنتراست S1.4 (اندازه‌گیری‌شده): L کف ≈ ۵۲/۶۵ · نمای دیوار (brick) = ۳۸ → ΔL ۲۰ ✓ · کلاهک (stone) = ۷۸ → ΔL ۲۰ ✓
// کلیدهای قدیمی DPAL حفظ شده‌اند (brick/brickHi/brickOut/stone/stoneHi/stoneSh/warm/mortar/cap/moss/mossD/stairs/stairsSh/glint) + تازه: floorA/floorB
// S3.9: تم ۳ (یخ) از رمپِ **موجودِ** waterDeep می‌آید (هم‌نردبانِ L با بقیه‌ی تم‌ها: brick[2]/floor[3]/[4]) —
// «مجموعه‌ی رمپ‌ها» دست‌نخورده می‌ماند چون outline.js برای اسپرایت‌های مزرعه (درخت/خانه) از همین مجموعه رنگ می‌گیرد (درس ۸۹)
const STONE_THEMES = ['stoneCool', 'stoneMoss', 'stoneForge', 'waterDeep'];  // تم ۰..۳
const MOSS_THEMES = ['leaf', 'leaf', 'fire', 'magicCyan'];                  // هویتِ خزه/گدازه/یخ
const DTHEME = STONE_THEMES.map((X, t) => {
  const M = MOSS_THEMES[t];
  const O = {
    brick: rp(X, t === 0 ? 1 : 2), brickHi: rp(X, t === 0 ? 2 : 3), brickOut: rp(X, 0), glint: rp(X, 4),      // بدنه‌ی دیوار (تیره) + جلای آجر
    stone: rp(X, 5), stoneHi: rp(X, 6), stoneSh: rp(X, 3),                        // سنگِ روشن (کلاهک/ستون/دروازه/پله)
    cap: rp(X, 4), mortar: rp(X, t === 0 ? 1 : 2), deep: rp(X, t === 0 ? 0 : 1),                              // خطِ کلاهک + درزهای کف + **رویِ توده‌ی دیوار (S3.2: L۲۶)**
    // S3.9: تمِ یخ — کف از رمپِ magicCyan (هم‌روشنی با stoneIce[3]/[4] ⇒ نردبانِΔL دست‌نخورده) با هیوئی سردِ آبی
    floorA: rp(X, 3), floorB: rp(X, 4), warm: rp(X, 4),
    stairs: rp(X, 5), stairsSh: rp(X, 3),
    moss: rp(M, 5), mossD: rp(M, 3),                                              // خزه/گدازه/یخ — هویت تم
  };
  return O;
});
export const DPAL = (t) => DTHEME[t] || DP0;

// سرستونِ بیرون‌زده (S3.8): ۶px بالای تایل + ۴px هم‌پوشانِ تنه — در رندر **بعد از موجودات** کشیده می‌شود
// ⇒ اگر قهرمان/موب شمالِ ستون بایستد، ستون آن‌ها را می‌پوشاند (ی-sort طبیعی با یک لایه‌ی دینامیک)
export function drawPillarHead(r, sx, sy, variant, theme) {
  const P = DPAL(theme | 0);
  r.rect(sx + 3, sy - 6, 10, 6, P.brick);        // تنه‌ی بالایی
  r.rect(sx + 3, sy - 6, 3, 6, P.brickHi);       // نور بالا-چپ
  r.rect(sx + 11, sy - 6, 2, 6, P.brickOut);
  r.rect(sx + 1, sy - 10, 14, 4, P.stone);       // سرستون
  r.rect(sx + 1, sy - 10, 14, 1, P.stoneHi);
  r.rect(sx + 1, sy - 7, 14, 1, P.stoneSh);      // سایه‌ی زیرِ سرستون
  if (variant === 1) {                            // ترک‌خورده: لبه‌ی شکسته
    r.px(sx + 3, sy - 10, P.stoneSh); r.px(sx + 4, sy - 9, P.stoneSh);
    r.px(sx + 12, sy - 10, P.stoneSh); r.line(sx + 6, sy - 6, sx + 8, sy - 2, P.brickOut);
  } else { r.px(sx + 6, sy - 9, P.stoneSh); r.px(sx + 10, sy - 5, P.brickOut); }
}

export function groundSprite(kind, variant = 0, wet = false, waterFrame = 0, theme = 0) {
  const nk = theme * 7680 + KIND_ID[kind] * 512 + ((variant & 63) | (wet ? 64 : 0)) * 4 + (waterFrame & 3); // S2.8: ۶۴ واریانت
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
    } else if (kind === 'soil') { // S2.6: خاکِ شخم‌خورده — شیارهای **هم‌ترازِ جهانی** (۴/۸/۱۲)؛ لبه‌های بیرونی در soilBake اضافه می‌شوند
      // (خطِ روشنِ همواره-بالا حذف شد: بین دو خاکِ مجاور درزِ ۱px می‌ساخت؛ حالا فقط سمتِ بی‌همسایه = کلوخه)
      const base = wet ? E.soilWet : E.soil, hi = wet ? E.soilWetHi : E.soilHi, sh = wet ? E.soilWetSh : E.soilSh;
      r.rect(0, 0, 16, 16, base);
      // شیار = نوارِ ۲px یک پله زیرِ تُنِ پایه (ΔL≈۱۳، هم‌سبکِ قانونِ S2.4) — نه خطِ دو پله‌ای که M6 را زیرِ بازه می‌برد
      for (const y of [4, 8, 12]) r.rect(0, y, 16, 2, sh);
      const onFur = (y) => y >= 4 && y <= 13 && ((y - 4) % 4) <= 1; // ردیف‌های ۴–۵ · ۸–۹ · ۱۲–۱۳
      for (let i = 0; i < 9; i++) { // دانه‌بندیِ خاک از hash2 (variant) — هرگز روی شیار، تا هم‌ترازی دقیق بماند
        const px = Math.floor(hash2(variant * 17 + i, i * 7, 21) * 16), py = Math.floor(hash2(i * 11, variant * 13 + i, 21) * 16);
        if (onFur(py)) continue;
        r.px(px, py, i % 3 === 0 ? hi : sh);
      }
      r.px(2 + Math.floor(hash2(variant, 3, 22) * 10), 7, P.stoneHi); // سنگ‌ریزه (رویِ پشته، نه شیار)
      if (wet) { // لکهٔ رطوبتِ ۲px از رمپِ آب (نه نقطهٔ آبیِ منفرد)
        const wc = rp('water', 3);
        for (let i = 0; i < 3; i++) {
          const px = 2 + Math.floor(hash2(i, variant * 7 + i, 23) * 11), py = 2 + Math.floor(hash2(variant * 5 + i, i, 23) * 11);
          r.px(px, py, wc); r.px(px + 1, py, wc);
        }
      }
    } else if (kind === 'path') { // S2.5: خاک‌راهِ کوبیده — ردِّ چرخِ **جهت‌دار** (variant: بیت۰=راهِ افقی E/W · بیت۱=راهِ عمودی N/S)
      // رِیلِ چرخ هم‌راستا با راه کشیده می‌شود ⇒ بین تایل‌های هم‌جهت پیوسته می‌ماند (variant از farm_terrain می‌آید)
      const base = rp('dust', 4), rut = rp('dust', 3), ew = variant & 1, ns = variant & 2;
      r.rect(0, 0, 16, 16, base);
      if (ew) { r.rect(0, 5, 16, 1, rut); r.rect(0, 11, 16, 1, rut); }
      if (ns) { r.rect(5, 0, 1, 16, rut); r.rect(11, 0, 1, 16, rut); }
      // بافتِ سطح **عمداً صفر** است: تُنِ بومیِ تایل فقط base + رِیل است و همه‌ی دانه‌بندی/لکه‌ها
      // از میدان‌های **جهانی** در drawPathEdge می‌آید ⇒ جهشِ L در مرزِ دو تایلِ راه ≈۰ (پذیرشِ S2.5: ≤۴)
    } else if (kind === 'hedge') { // S2.8: ۱۶ شکلِ mask4 + رویه‌ی روشن + سایه‌ی پایین + گوشه‌ی گرد
      drawHedge(r, variant);
    } else if (kind === 'fence') { // S2.8: ریل/تیرک بر اساسِ mask4 (در farm_terrain ساخته می‌شود)
      drawFence(r, variant);
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
    } else if (kind === 'stairs') { // پله/چاهِ طبقه (S3.8): ۴ پلهی باریکشونده به سمتِ پایین + چاهِ تاریکِ دهانه با درخششِ گرم
      r.rect(0, 0, 16, 16, P.brickOut);
      for (let i = 0; i < 4; i++) {
        const x = 1 + i, y = 1 + i * 3, w = 14 - i * 2;
        r.rect(x, y, w, 2, i < 3 ? (i % 2 ? P.stairs : P.stairsSh) : P.deep); // رویهی پله (پلهی آخر: تاریکیِ چاه)
        r.rect(x, y, w, 1, i < 3 ? P.stoneHi : P.brickOut);                   // لبِ روشنِ پله (لبهی نورگیر)
        r.rect(x, y + 2, w, 1, P.brickOut);                                   // ریزرِ تیره ⇒ پلهها از هم جدا خوانده شوند
      }
      r.rect(0, 0, 16, 1, P.stoneHi); r.rect(0, 0, 1, 16, P.stoneHi); // S3.2: پخِ هم‌تراز با کف
      r.rect(15, 0, 1, 16, P.stoneSh); r.rect(0, 15, 16, 1, P.stoneSh);
      r.rect(6, 12, 4, 4, P.deep); r.rect(6, 12, 4, 1, P.brickOut); // چاهِ دهانه — بعد از پخ، تا درخشش خورده نشود
      r.rect(6, 13, 4, 3, rp('fire', 4)); r.rect(7, 13, 2, 3, rp('fire', 5));
      r.px(7, 15, rp('fire', 6)); r.px(8, 15, rp('fire', 6)); r.px(7, 14, rp('fire', 6));
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
    } else if (kind === 'pillar') { // ستون (S3.8): پایه + تنه + سرستونِ بیرون‌زده (drawPillarHead) — v1 ترک‌خورده
      r.rect(0, 0, 16, 16, P.brickOut);
      r.rect(3, 0, 10, 16, P.brick);            // تنه (ادامه‌ی سرستونِ دینامیک)
      r.rect(3, 0, 3, 16, P.brickHi);           // نورِ بالا-چپِ تنه
      r.rect(11, 0, 2, 16, P.brickOut);         // لبه‌ی تاریکِ راستِ تنه
      r.rect(2, 9, 12, 2, P.stone);             // حلقه‌ی میانی
      r.rect(2, 9, 12, 1, P.stoneHi);
      r.rect(1, 11, 14, 4, P.stone);            // پایه (پلینت)
      r.rect(1, 11, 14, 1, P.stoneHi);
      r.rect(1, 14, 14, 1, P.stoneSh);
      r.rect(0, 15, 16, 1, P.brickOut);         // سایه‌ی کف زیرِ پایه
      if (variant === 1) {                      // ترک‌خورده
        r.line(6, 2, 8, 8, P.brickOut); r.line(8, 8, 7, 12, P.brickOut);
        r.px(9, 5, P.brickOut); r.px(10, 10, P.stoneSh);
        r.rect(4, 0, 3, 1, P.brickOut); r.px(9, 0, P.brickOut);   // لبه‌ی شکسته‌ی بالا (زیر سرستون)
      } else { r.px(9, 4, P.brickOut); r.px(7, 12, P.stoneSh); }
    } else if (kind === 'decor') { // دکور کف دانجن (S3.8): 0 استخوان 1 قارچ 2 ترک 3 کریستال 4 تار + 40..55 = فرشِ autotile
      if (variant >= 40) { // فرش تالار (S3.8): لبه فقط روی ضلعِ بی‌همسایه (mask4: N=1 E=2 S=4 W=8)
        const m = variant - 40;
        const CR = rp('clothRed', 3), CH_ = rp('clothRed', 5), CS = rp('clothRed', 2), CD = rp('clothRed', 1);
        const GD = rp('gold', 4), GH = rp('gold', 6);
        r.rect(0, 0, 16, 16, CR);
        r.rect(0, 0, 16, 1, CS); r.rect(0, 0, 1, 16, CS);            // رگه‌ی بافت
        r.rect(15, 0, 1, 16, CS); r.rect(0, 15, 16, 1, CS);
        if (!(m & 1)) r.rect(0, 0, 16, 1, GH);                        // لبه‌ی طلایی فقط روی ضلعِ باز
        if (!(m & 4)) r.rect(0, 15, 16, 1, GH);
        if (!(m & 8)) r.rect(0, 0, 1, 16, GH);
        if (!(m & 2)) r.rect(15, 0, 1, 16, GH);
        if ((m & 1) && (m & 4) && (m & 2) && (m & 8)) {               // تایلِ داخلی: نقشِ لوزیِ طلایی
          r.px(8, 3, GD); r.rect(7, 4, 3, 1, GH); r.rect(6, 5, 5, 1, GD);
          r.rect(6, 6, 5, 3, CD); r.rect(7, 6, 3, 3, CR);
          r.rect(6, 9, 5, 1, GD); r.rect(7, 10, 3, 1, GH); r.px(8, 11, GD);
        } else { r.rect(3, 3, 10, 10, CH_); r.rect(4, 4, 8, 8, CR); }  // نوارِ داخلیِ لبه‌دار
      } else {
      r.rect(0, 0, 16, 16, P.stone);                 // بستر: سنگ‌فرشِ کف (رمپِ تم)
      r.rect(0, 0, 16, 1, P.stoneHi); r.rect(15, 0, 1, 16, P.stoneSh); r.rect(0, 15, 16, 1, P.stoneSh);
      const BONE = rp('bone', 6), BONE_D = rp('bone', 4), INK = rp('ink', 1);
      if (variant === 0) { // استخوان‌ها (رمپ + outline)
        r.rect(3, 8, 9, 4, INK);
        r.lineW(4, 10, 10, 7, 2, BONE); r.px(3, 9, BONE); r.px(3, 11, BONE_D);
        r.px(11, 6, BONE); r.px(11, 8, BONE_D); r.rect(7, 12, 4, 2, BONE); r.px(8, 12, BONE_D);
      } else if (variant === 1) { // قارچ‌های نورانی (رمپِ magicCyan)
        r.rect(3, 7, 5, 3, INK); r.rect(8, 5, 5, 3, INK);
        r.rect(4, 10, 2, 3, rp('magicCyan', 2)); r.rect(9, 8, 2, 4, rp('magicCyan', 2));
        r.rect(4, 8, 3, 2, rp('magicCyan', 5)); r.rect(9, 6, 3, 2, rp('magicCyan', 5));
        r.px(4, 8, E.white); r.px(10, 6, E.white);
      } else if (variant === 2) { // ترک زمین
        r.line(3, 3, 7, 8, P.brickOut); r.line(7, 8, 6, 13, P.brickOut); r.line(7, 8, 12, 10, P.brickOut);
        r.px(12, 10, P.brickOut); r.px(3, 3, P.stoneSh); r.px(5, 6, P.deep);
      } else if (variant === 3) { // کریستال درخشان (رمپِ magicCyan + outline)
        r.rect(5, 6, 5, 8, INK);
        r.px(4, 12, rp('magicCyan', 2)); r.px(11, 11, rp('magicCyan', 2));
        r.lineW(7, 13, 7, 7, 2, rp('magicCyan', 5));       // بلورِ اصلی
        r.px(6, 6, E.white); r.px(8, 8, rp('magicCyan', 6));
        r.lineW(11, 13, 11, 10, 1, rp('magicCyan', 4)); r.px(11, 9, E.white);
      } else if (variant === 4) { // تار عنکبوت (گوشه)
        r.px(1, 1, E.white); r.px(2, 2, E.white); r.px(3, 3, P.stoneHi);
        r.line(1, 1, 6, 1, E.white); r.line(1, 1, 1, 6, E.white);
        r.line(2, 2, 6, 2, rp('bone', 4)); r.line(2, 2, 2, 6, rp('bone', 4));
        r.line(1, 4, 4, 1, rp('bone', 4)); r.px(4, 4, E.white); r.px(5, 3, rp('bone', 4));
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
