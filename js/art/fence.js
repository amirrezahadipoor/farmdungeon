// art/fence.js — حصار و پرچینِ متصل (S2.8)
// شکل از **mask4** (در farm_terrain از همسایه‌ی هم‌جنس ساخته می‌شود) · بافت از هشِ per-تایل
// variant = mask4 | (واریانتِ چوب/برگ << ۴) ⇒ شبکه‌ی ۱۶px دیده نمی‌شود
// قانونِ تُن (ادامه‌ی S2.6/S2.7): هر لبه یک پله ⇒ M8 پرچین/حصار↔چمن = ۰ (سایه‌ی تماس در farm_terrain کاملش می‌کند)
import { TILE, E } from './palette_env.js';
import { hash2 } from './noise.js';

const BN = 1, BE = 2, BS = 4, BW = 8;
// [بیت، افقی، ازابتدا، ضلعِ مجاور در آغاز، ضلعِ مجاور در پایان]
const SIDE = [[BN, 1, 1, BW, BE], [BE, 0, 0, BN, BS], [BS, 1, 0, BW, BE], [BW, 0, 1, BN, BS]];

// حصار — روی چمن کشیده می‌شود (زمینه‌ی تایل را farm_terrain می‌کشد؛ این‌جا فقط چوب است)
// ریل در امتدادِ هر محور که **همسایه‌ی حصار** دارد می‌رود؛ سرِ باز پیش از لبه با کلاهک تمام می‌شود
// ⇒ ریل هیچ‌وقت روی چمنِ همسایه بیرون نمی‌زند (اتصالِ درست + حذفِ جهشِ L در مرز)
// تیرک فقط در انتها/گوشه/تقاطع/تک — در **راستای ساده** نمی‌آید (حصار شلوغ نمی‌شود)
export function drawFence(r, v) {
  const m = v & 15, wv = (v >> 4) & 3;
  const wood = E.wood, hi = E.woodHi, sh = E.woodSh;
  if (m & (BE | BW)) { // ریلِ افقی (بالا + پایین، هر کدام ۲px با هایلایتِ رویه)
    const x0 = (m & BW) ? 0 : 1, x1 = (m & BE) ? TILE : TILE - 1;
    r.rect(x0, 5, x1 - x0, 2, wood); r.rect(x0, 5, x1 - x0, 1, hi);
    r.rect(x0, 11, x1 - x0, 2, wood); r.rect(x0, 11, x1 - x0, 1, hi);
    if (!(m & BW)) { r.px(1, 6, sh); r.px(1, 12, sh); }   // کلاهکِ انتهای باز
    if (!(m & BE)) { r.px(14, 6, sh); r.px(14, 12, sh); }
  }
  if (m & (BN | BS)) { // ریلِ عمودی (برای حصارِ ایستاده)
    const y0 = (m & BN) ? 0 : 1, y1 = (m & BS) ? TILE : TILE - 1;
    r.rect(5, y0, 2, y1 - y0, wood); r.rect(5, y0, 1, y1 - y0, hi);
    r.rect(11, y0, 2, y1 - y0, wood); r.rect(11, y0, 1, y1 - y0, hi);
    if (!(m & BN)) { r.px(6, 1, sh); r.px(12, 1, sh); }
    if (!(m & BS)) { r.px(6, 14, sh); r.px(12, 14, sh); }
  }
  if (m !== (BE | BW) && m !== (BN | BS)) { // تیرک: انتها / گوشه / تقاطع / تک
    r.rect(6, 2, 4, 12, wood); r.rect(6, 2, 1, 12, hi); r.rect(9, 2, 1, 12, sh);
    r.rect(6, 1, 4, 1, hi); r.rect(6, 13, 4, 1, sh);
    if (wv === 1) { r.px(7, 7, sh); r.px(8, 7, sh); r.px(7, 8, sh); }      // گره‌ی چوب
    else if (wv === 2) { r.px(7, 5, sh); r.px(8, 8, sh); r.px(7, 9, sh); } // ترک
    else r.px(7, 6, hi);                                                   // رگه
  } else if (wv === 1) { r.px(3, 6, sh); r.px(12, 12, sh); }               // گره روی ریلِ راستا
  else if (wv === 2) { r.px(2, 5, sh); r.px(13, 11, sh); }
}

// پرچین — تایلِ کدر (حاشیه‌ی جهان): بدنه + رویه‌ی روشن و سایه‌ی تیره **فقط روی ضلعِ بی‌همسایه**
// (روی ضلعِ دارای همسایه کشیده نمی‌شود ⇒ نوارِ تختِ هر-۱۶px ساخته نمی‌شود — همان درسِ ن۳۸)
// + لبه‌ی نمایانِ ۱px هم‌تراز با چمن (hedgeHi = L۵۲ در برابر چمنِ L۶۶ ⇒ ΔL ۱۴؛ با سایه‌ی تماس ⇒ ۰)
export function drawHedge(r, v) {
  const m = v & 15, lv = (v >> 4) & 3;
  r.rect(0, 0, TILE, TILE, E.hedge);                              // بدنه (L۳۹)
  if (!(m & BN)) r.rect(0, 0, TILE, 2, E.hedgeHi);                // رویه‌ی روشن (تاج)
  if (!(m & BS)) r.rect(0, TILE - 2, TILE, 2, E.hedgeSh);         // سایه‌ی تیره‌ی لبه‌ی پایین
  // تودرتوی برگِ خوشه‌ای (۷ لکه با جابه‌جاییِ هش — نه شبکه‌ی ۳×۳ مربعی)
  for (let i = 0; i < 7; i++) {
    const a = hash2(lv * 31 + i, i * 7 + 3, 51), b = hash2(i * 13, lv * 17 + i, 51);
    const bx = 1 + ((a * 12) | 0), by = 3 + ((b * 7) | 0), s = 2 + ((a * 3) | 0);
    r.rect(bx, by, s, s, (i & 1) ? E.hedgeHi : E.hedge);
    r.rect(bx, by + s, s, 1, E.hedgeSh);                          // زیرِ برگ
    r.px(bx, by, E.hedgeHi);                                      // جلا
  }
  // لبه‌ی نمایان: ۱px روشن با گوشه‌ی گرد (قوسِ ۲px)
  for (const [bit, horiz, fromStart, sAdj, eAdj] of SIDE) {
    if (m & bit) continue;                                        // ضلعِ متصل: باز می‌ماند
    for (let a = 0; a < TILE; a++) {
      if ((a < 2 && !(m & sAdj)) || (a > TILE - 3 && !(m & eAdj))) continue; // قوسِ گوشه
      const p = fromStart ? 0 : TILE - 1;
      if (horiz) r.px(a, p, E.hedgeHi); else r.px(p, a, E.hedgeHi);
    }
  }
}
