// monster_bodies.js — بدنه‌ی ۴ هیولای کلاسیک (اسلایم/گرگ/اسکلت/گولم) — جداسازی از monsters.js (ن۳۴)
// بخش‌بندیِ S6.4: خفاش/عنکبوت/روح به monster_bodies3.js رفتند (سقفِ ۲۸۰ خط) و این‌جا ادغام می‌شوند.
// هر بدنه: (r, f) با f={state,t,ph,face,time} — فقط هندسه/انیمیشن؛ rim/outline/سایه در monsters.js
import { ik, ease } from '../skeleton.js';
import { MC, MOY, lm, wind } from './monster_parts.js';
import { MBODY_A3, MOUT_A3, MSHW_A3 } from './monster_bodies3.js';

const sin = Math.sin, cos = Math.cos, PI = Math.PI; // نام‌کوتاه‌های محلی

// ---------- اسلایم: بدن فنری squash/stretch ----------
function dSlime(r, f) {
  const g = lm(r, f.face);
  let w = 26, h = 20, xOff = 0, yOff = 0, dead = 0;
  const br = sin(f.time * 2.2);
  if (f.state === 'idle') { w += br; h -= br * 0.7; }
  else if (f.state === 'move') {
    const ph = f.ph % 1, hop = Math.abs(sin(PI * ph));
    yOff = -hop * 11;
    const sq = ph < 0.14 || ph > 0.92 ? 1.28 : (ph > 0.25 && ph < 0.7 ? 0.82 : 1);
    w *= sq; h /= sq; xOff = ph * 14 - 7;
  } else if (f.state === 'attack') {
    if (f.t < 0.45) { const e = wind(f.t, 0.45); w *= 1 + 0.32 * e; h *= 1 + 0.32 * e; }       // باد کردن
    else if (f.t < 0.7) { const e = (f.t - 0.45) / 0.25; w *= 1.35 - 0.25 * e; h *= 0.68; xOff = 4 + e * 14; } // پرش
    else { w *= 1.12; h *= 0.9; xOff = 16 * (1 - (f.t - 0.7) / 0.3 * 0.4); }
  } else if (f.state === 'die') { dead = ease.outCubic(f.t); h = 20 * (1 - dead) + 3 * dead; w = 26 + 14 * dead; }
  const cy = MOY - h / 2 - yOff;
  g.ellipse(xOff, cy, w / 2, h / 2, MC.slime);
  g.ellipse(xOff, cy - h * 0.18, w * 0.3, h * 0.26, MC.slimeHi);
  g.ellipse(xOff, cy + h * 0.06, w * 0.42, h * 0.12, MC.slimeMid); // S1.5a: پله‌ی میانی
  g.ellipse(xOff, MOY - h * 0.18 - yOff, w * 0.4, h * 0.3, MC.slimeSh);
  g.ellipse(xOff, MOY - 2 - yOff, w * 0.34, 2.5, MC.slimeDeep); // S1.5a: پله‌ی عمیق زیر بدن
  // S6.4: هسته‌ی تیره‌ی داخلی (عمقِ ژله) + هایلایتِ خیسِ رویه
  g.ellipse(xOff, cy + h * 0.20, w * 0.17, h * 0.13, MC.slimeDeep);
  g.px(xOff - 1, cy + h * 0.20, MC.slimeDark);
  g.rect(xOff - w * 0.30, cy - h * 0.34, 2, 3, MC.slimeHi);
  g.px(xOff - w * 0.30 + 1, cy - h * 0.34 - 1, MC.white); // درخششِ ژله (نقطه‌ی براق)
  g.px(xOff + w * 0.22, cy - h * 0.26, MC.slimeHi);       // هایلایتِ دومِ کوچک
  if (dead < 0.7) { // چشم‌های جدا
    for (const ex of [xOff - 4, xOff + 4]) {
      g.rect(ex - 1, cy - 4, 3, 3, MC.dark);
      if (f.state === 'die' && dead > 0.35) { g.px(ex - 2, cy - 5, MC.dark); g.px(ex + 1, cy - 2, MC.dark); }
      else g.px(ex, cy - 4, MC.white);
    }
    g.rect(xOff - 1, cy + 2, 3, 1, MC.dark); // دهان
    g.rect(xOff - 2, cy + 3, 4, 1, MC.slimeDark); // S1.5a: خوشه‌ی سایه‌ی زیر دهان
    g.px(xOff - 5, MOY - 4 - yOff, MC.slimeDeep); g.px(xOff + 4, MOY - 4 - yOff, MC.slimeDeep);
    g.rect(xOff - 8, MOY - 3 - yOff, 4, 1, MC.slimeEdge); // S1.5a: لبه‌ی عمیقِ کف‌چسب
  }
}

// ---------- گرگ: چهارپا با تات (گام مورب) ----------
function dWolf(r, f) {
  const g = lm(r, f.face);
  let bob = 0, crouch = 0, lunge = 0, jaw = 0, dead = 0;
  if (f.state === 'idle') { bob = sin(f.time * 2) * 0.8; }
  else if (f.state === 'move') { bob = Math.abs(sin(f.ph * PI * 2)) * -1.6; }
  else if (f.state === 'attack') {
    if (f.t < 0.55) { crouch = wind(f.t, 0.55); }                                              // نشستن عقب
    else if (f.t < 0.78) { const e = (f.t - 0.55) / 0.23; lunge = e; jaw = 1; }                  // گاز
    else { lunge = 1 - (f.t - 0.78) / 0.22; jaw = (f.t - 0.78) / 0.22 < 0.4 ? 1 : 0; }
  } else if (f.state === 'die') { dead = ease.outCubic(f.t); }
  const back = crouch * -5 + lunge * 12;
  const bodyY = MOY - 17 + bob + crouch * 3 + dead * 12;
  // دم
  g.lineW(back - 12, bodyY - 2, back - 17, bodyY - 7 - dead * -5 + (f.state === 'move' ? sin(f.ph * PI * 4) * 2 : 0), 2, MC.wolfSh);
  // پاها: جفت‌های مورب (FL+BR سپس FR+BL)
  const hips = [[-10, 0], [-7, 0.5], [8, 0.5], [11, 0]];
  for (const [hx, off] of hips) {
    let fx = hx + back, fy = MOY;
    if (f.state === 'move' && !dead) {
      const ph = (f.ph + off) % 1;
      const sw = sin(ph * PI * 2) * 5;
      const lift = ph < 0.5 ? sin(ph * PI * 2) * 3 : 0;
      fx = hx + sw; fy = MOY - lift;
    } else if (dead) { fx = hx + back; fy = MOY - 2; }
    else { fx = hx + back + (hx > 0 ? 2 : -2); }
    g.lineW(hx + back, bodyY + 3, fx, fy - 1, 3, MC.wolf);   // S1.5a: پای روشن (خوانایی روی کف تیره)
    g.lineW(hx + back, bodyY + 3, fx, fy - 1, 3, MC.wolfSh);
    g.px(fx + 1, fy - 1, MC.wolfDark);
  }
  // بدن
  g.lineW(back - 11, bodyY, back + 9, bodyY, 8, MC.wolf);
  g.lineW(back - 10, bodyY - 3, back + 8, bodyY - 3, 2, MC.wolfHi);
  g.lineW(back - 8, bodyY + 2, back + 7, bodyY + 2, 1, MC.wolfSh);   // شکم روشن
  g.lineW(back - 8, bodyY + 3, back + 7, bodyY + 3, 1, MC.wolfDeep); // S1.5a: لبه‌ی تیره‌ی شکم (حجم)
  g.lineW(back - 10, bodyY - 1, back + 7, bodyY - 1, 1, MC.wolfMid); // S1.5a: پله‌ی میانی
  g.lineW(back - 7, bodyY - 4, back + 2, bodyY - 4, 1, MC.wolfDeep); // رگه‌ی خز
  g.px(back - 5, bodyY - 6, MC.wolfDeep); g.px(back - 4, bodyY - 6, MC.wolfDeep); g.px(back + 1, bodyY - 8, MC.wolfDeep);
  g.px(back - 4, bodyY + 1, MC.wolfDark); g.px(back - 3, bodyY + 1, MC.wolfDark); g.px(back + 3, bodyY + 2, MC.wolfDark);
  // S6.4: رگه‌های روشنِ خز (جهتِ خوابِ پوشش: پشت → پهلو) + کاکلِ دم
  for (const [fx, fy] of [[-6, -4], [-1, -5], [4, -6], [-8, 0], [0, 1], [7, -3], [-3, 2]]) {
    g.px(back + fx, bodyY + fy, MC.wolfHi); g.px(back + fx + 1, bodyY + fy, MC.wolfCream);
  }
  g.px(back - 17, bodyY - 8, MC.wolfCream); g.px(back - 16, bodyY - 7, MC.wolfHi); // کاکلِ دم
  // سر + پوزه
  const hx = back + 11, hy = bodyY - 4 - crouch * 1 + lunge * 1;
  g.rect(hx, hy - 5, 9, 7, MC.wolf);
  g.rect(hx + 8, hy - 2, 5, 3, MC.wolfHi);                     // پوزه
  g.rect(hx + 8, hy - 2, 5, 1, MC.wolfCream); // S1.5a: پوزه‌ی گرم‌رنگ
  g.rect(hx + 1, hy - 6, 2, 2, MC.wolfCream);
  g.rect(hx, hy + 1, 9, 1, MC.wolfCream); // S1.5a: چانه/گونه — حجم سر
  g.rect(hx + 12, hy - 1 + jaw, 2, 1, MC.dark);                // بینی/دهان باز
  if (jaw) { g.rect(hx + 8, hy + 1, 5, 2, MC.wolfDark); g.px(hx + 9, hy + 1, MC.white); g.px(hx + 12, hy + 1, MC.white); }
  g.rect(hx + 1, hy - 8, 2, 4, MC.wolf); g.px(hx + 4, hy - 7, MC.wolfDeep); // گوش‌ها
  if (dead > 0.4) { g.px(hx + 4, hy - 3, MC.dark); g.px(hx + 6, hy - 1, MC.dark); } // چشم ×
  else g.px(hx + 4, hy - 3, f.state === 'attack' && jaw ? MC.eyeRed : MC.dark);
}

// ---------- اسکلت: مفصل‌بندی کامل + شمشیر زنگ‌زده ----------
function dSkeleton(r, f) {
  const g = lm(r, f.face);
  let step = 0, swordA = 2.2, fall = 0, bob = sin(f.time * 1.8) * 0.8;
  if (f.state === 'move') { step = f.ph; bob = Math.abs(sin(f.ph * PI * 2)) * -1.2; }
  else if (f.state === 'attack') {
    if (f.t < 0.5) swordA = 2.2 + wind(f.t, 0.5) * 1.1;                    // بالا بردن
    else if (f.t < 0.72) swordA = 3.3 - ((f.t - 0.5) / 0.22) * 4.2;        // برش
    else swordA = -0.9 + (f.t - 0.72) / 0.28 * 3.1;
  } else if (f.state === 'die') { fall = f.t; }
  const pelY = MOY - 15 + bob + fall * 12;
  const shake = f.state === 'die' ? sin(fall * 12) * 2 * (1 - fall) : 0;
  const cx = shake;
  // پاها
  for (const [off, sgn] of [[0, -1], [0.5, 1]]) {
    const ph = (step + off) % 1;
    const sw = f.state === 'move' ? sin(ph * PI * 2) * 4 : (sgn < 0 ? -2 : 2);
    const lift = f.state === 'move' && ph < 0.5 ? sin(ph * PI * 2) * 3 : 0;
    const hy2 = pelY + 3 + fall * 4;
    g.lineW(cx + sgn * 2, hy2, cx + sgn * 2 + sw, MOY - lift - fall * 8, 2, MC.bone);
    g.px(cx + sgn * 2 + sw + 1, MOY - lift - fall * 8, MC.boneSh);
  }
  // ستون فقرات + لگن + دنده‌ها
  g.lineW(cx, pelY, cx, pelY - 11, 2, MC.bone);
  g.lineW(cx + 1, pelY, cx + 1, pelY - 11, 1, MC.boneDeep); // S1.5a: سایه‌ی ستون فقرات
  g.rect(cx - 3, pelY - 1, 7, 2, MC.bone);
  g.rect(cx - 2, pelY + 1, 5, 1, MC.boneDeep); // S1.5a: خوشه‌ی سایه‌ی لگن
  g.rect(cx - 4, pelY - 9, 3, 1, MC.boneWorn); g.px(cx + 3, pelY - 8, MC.boneWorn);
  g.px(cx - 3, pelY + 4, MC.boneDark); g.px(cx - 2, pelY + 4, MC.boneDark); g.px(cx + 2, pelY + 4, MC.boneDark);
  g.px(cx - 4, pelY - 12, MC.boneMid); g.px(cx + 4, pelY - 12, MC.boneMid); g.px(cx - 3, pelY - 11, MC.boneMid);
  const ribGap = 3 + fall * 2; // S6.4: تیغه‌ی ۲px با فاصله‌ی ۳ (ردیفِ جمجمه اشغال نمی‌شود)
  // S6.4: دنده‌های ۲px (حجم) + سایه‌ی زیرِ هر دنده + جناغ میانی
  for (let i = 0; i < 3; i++) g.lineW(cx - 5 + fall * i, pelY - 4 - i * ribGap, cx + 5 - fall * i, pelY - 4 - i * ribGap, 2, MC.bone);
  for (let i = 0; i < 3; i++) g.lineW(cx - 5 + fall * i, pelY - 2 - i * ribGap, cx + 5 - fall * i, pelY - 2 - i * ribGap, 1, MC.boneMid);
  g.lineW(cx, pelY - 12, cx, pelY - 3, 1, MC.boneWorn); // جناغ
  // جمجمه
  const skullY = pelY - 15 - fall * (fall > 0.4 ? (fall - 0.4) * 26 : 0);
  g.rect(cx - 3, skullY - 4, 8, 8, MC.bone);
  g.rect(cx - 3, skullY - 4, 8, 1, MC.boneHi);
  g.rect(cx - 3, skullY + 3, 8, 1, MC.boneMid); // فک/سایه‌ی جمجمه
  g.px(cx - 4, skullY + 4, MC.boneEdge); g.px(cx + 4, skullY + 4, MC.boneEdge); g.px(cx - 4, skullY + 5, MC.boneEdge); // S1.5a: لبه‌ی فک
  // S6.4: کاسه‌ی چشم (فرورفتگی) + مردمک درونِ کاسه
  g.rect(cx - 2, skullY - 2, 3, 3, MC.boneDeep); g.rect(cx + 1, skullY - 2, 3, 3, MC.boneDeep);
  g.px(cx - 2, skullY - 2, MC.boneOut); g.px(cx + 3, skullY - 2, MC.boneOut); // گوشه‌ی تیره‌ی کاسه
  g.px(cx - 1, skullY - 1, MC.dark); g.px(cx + 2, skullY - 1, MC.dark);
  g.rect(cx, skullY + 2, 2, 1, MC.dark);
  // بازوها: دور آزاد + نزدیک با شمشیر
  const shY = pelY - 9;
  g.lineW(cx - 1, shY, cx - 6 + (f.state === 'move' ? sin((step + 0.5) * PI * 2) * 3 : 0), shY + 8, 2, MC.bone);
  const hand = [cx + 7 * cos(0.6), shY + 7 * sin(0.6)];
  if (f.state === 'attack') { hand[0] = cx + 8 * cos(swordA - 1.2); hand[1] = shY + 8 * sin(swordA - 1.2); }
  g.lineW(cx + 1, shY, hand[0], hand[1], 2, MC.bone);
  // شمشیر (مبدأ دست، تیغه به بیرون)
  const ang = f.state === 'attack' ? swordA : 0.9;
  const T = (x2, y2) => [hand[0] + x2 * cos(ang) - y2 * sin(ang), hand[1] + x2 * sin(ang) + y2 * cos(ang)];
  const t1 = T(2, 0), t2 = T(13, 0);
  r.lineW(g.m(hand[0]), hand[1], g.m(t1[0]), t1[1], 2, MC.rust);
  r.px(g.m(hand[0]), hand[1] - 1, MC.rustHi); r.px(g.m(hand[0]) + (f.face >= 0 ? 1 : -1), hand[1] - 1, MC.rustHi); // S1.5a: چرم دسته
  r.px(g.m(t1[0]), t1[1], MC.gold); r.px(g.m(t1[0]) + (f.face >= 0 ? 1 : -1), t1[1], MC.gold); // نگین
  r.lineW(g.m(t1[0]), t1[1], g.m(t2[0]), t2[1], 3, MC.boneSh);
  r.lineW(g.m(t1[0]), t1[1] - 1, g.m(t2[0]), t2[1] - 1, 1, MC.boneHi);
  r.lineW(g.m(t1[0]), t1[1] + 1, g.m(t2[0]), t2[1] + 1, 1, MC.boneDeep); // لبه‌ی تیره‌ی تیغه
}

// ---------- گولم سنگی: سنگین و کند + تکان زمین ----------
function dGolem(r, f) {
  const g = lm(r, f.face);
  let bob = sin(f.time * 1.1) * 1, lean = 0, armUp = 0, shake = 0, crack = 0, xOff = 0;
  if (f.state === 'move') { const st = Math.abs(sin(f.ph * PI)); bob = -st * 2; lean = sin(f.ph * PI * 2) * 0.05; xOff = 0; }
  else if (f.state === 'attack') {
    if (f.t < 0.55) { const e = wind(f.t, 0.55); armUp = e; lean = -e * 0.12; }               // بالا کشیدن
    else if (f.t < 0.72) { armUp = 1 - (f.t - 0.55) / 0.17; lean = 0.14; shake = 2; }          // کوبیدن
    else { lean = 0.1 * (1 - (f.t - 0.72) / 0.28); }
  } else if (f.state === 'die') { crack = f.t; }
  const gy = MOY + bob + (crack > 0.6 ? (crack - 0.6) * 14 : 0);
  const sx = xOff + shake * (f.t > 0.55 && f.t < 0.72 ? (Math.floor(f.t * 40) % 2 ? 1 : -1) : 0);
  // پاها
  g.rect(sx - 12, gy - 14, 9, 14, MC.golemSh); g.rect(sx + 3, gy - 14, 9, 14, MC.golemSh);
  g.rect(sx - 12, gy - 14, 9, 2, MC.golem); g.rect(sx + 3, gy - 14, 9, 2, MC.golem);
  // بدن (بلوک‌های سنگی)
  const ty = gy - 44;
  g.rect(sx - 15, ty, 30, 30, MC.golem);
  g.rect(sx - 15, ty, 30, 3, MC.golemHi); g.rect(sx - 15, ty + 3, 30, 1, MC.golemMid); /* S1.5a */ g.rect(sx - 15, ty + 27, 30, 3, MC.golemSh);
  g.rect(sx - 8, ty + 22, 6, 2, MC.golemDeep); g.rect(sx + 2, ty + 16, 5, 2, MC.golemDeep); // حفره‌های سنگ
  g.px(sx - 12, ty + 12, MC.golemCrack); g.px(sx - 11, ty + 12, MC.golemCrack); g.px(sx + 9, ty + 8, MC.golemCrack); g.px(sx + 10, ty + 8, MC.golemCrack);
  g.px(sx - 10, ty + 10, MC.mossD); g.px(sx - 9, ty + 10, MC.mossD);
  g.line(sx - 6, ty + 4, sx - 6, ty + 26, MC.golemSh); g.line(sx + 7, ty + 4, sx + 7, ty + 26, MC.golemSh);
  g.px(sx - 11, ty + 8, MC.moss); g.px(sx - 10, ty + 9, MC.moss); g.px(sx + 12, ty + 20, MC.moss);
  // S6.4: درزهای سنگی (درزِ تیره + لبه‌ی روشنِ زیر = چمفر) و دسته‌خزه‌ها
  for (const sy2 of [ty + 9, ty + 19]) {
    g.line(sx - 15, sy2, sx + 14, sy2, MC.golemOut);
    g.line(sx - 15, sy2 + 1, sx + 14, sy2 + 1, MC.golemHi);
  }
  g.line(sx - 15, ty + 14, sx - 1, ty + 14, MC.golemOut); g.line(sx + 1, ty + 22, sx + 14, ty + 22, MC.golemOut); // درزِ نیم‌کاره
  g.px(sx - 13, ty + 6, MC.moss); g.px(sx - 12, ty + 7, MC.moss); g.px(sx - 12, ty + 6, MC.mossD); // دسته‌ی خزه
  g.px(sx + 13, ty + 12, MC.mossD); g.px(sx + 14, ty + 13, MC.moss);
  g.px(sx - 14, gy - 16, MC.moss); g.px(sx - 13, gy - 16, MC.mossD); // خزه‌ی پا
  g.px(sx + 11, gy - 17, MC.moss); g.px(sx + 12, gy - 18, MC.moss);
  g.px(sx + 10, gy - 18, MC.mossD); g.px(sx - 13, gy - 17, MC.mossD);
  // بازوها (بالا/پایین بسته به armUp)
  for (const sgn of [-1, 1]) {
    const ay = ty + 4 - armUp * 16;
    g.rect(sx + sgn * 19 - 4, ay, 8, 16, MC.golem); g.rect(sx + sgn * 19 - 4, ay + 2, 8, 1, MC.golemMid);
    g.rect(sx + sgn * 19 - 4, ay + (armUp > 0.3 ? -6 : 12), 9, 9, MC.golemSh); // مشت
  }
  // سر + چشم
  const hy = ty - 11 + armUp * -2;
  g.rect(sx - 6, hy, 12, 11, MC.golem);
  g.rect(sx - 6, hy, 12, 2, MC.golemHi);
  // S6.4: چشمِ درخشان (emissive — هسته‌ی اخگری + هاله/جرقه؛ در حمله تندتر)
  const eyeY = hy + 4, hot = f.state === 'attack' && f.t < 0.72;
  g.rect(sx - 3, eyeY, 7, 2, hot ? MC.ember : MC.golemSh);      // کاسه
  g.rect(sx - 2, eyeY, 2, 2, MC.ember);                          // هسته
  g.px(sx + 2, eyeY, MC.ember); g.px(sx - 4, eyeY + 1, MC.gold); // هاله + جرقه
  // ترک‌های مرگ
  if (crack > 0) {
    const c = MC.golemOut;
    g.line(sx - 8, ty + 2, sx - 2, ty + 12 * crack + 4, c); g.line(sx + 6, ty + 26, sx + 2, ty + 26 - 16 * crack, c);
    if (crack > 0.5) { g.line(sx - 14, gy - 30, sx + 13, gy - 34, c); g.rect(sx - 15, ty + 13, 8, 6, MC.golemOut); g.rect(sx + 6, ty + 18, 9, 7, MC.golemOut); }
  }
  // گرد و غبار کوبش
  if (f.state === 'attack' && f.t >= 0.6 && f.t < 0.8) { for (const [dx, dy] of [[-20, -3], [22, -3], [-26, -6], [27, -7]]) g.px(sx + dx, MOY + dy, MC.dust); }
}

// بدنه‌های کلاسیک (۷ = ۴ این‌جا + ۳ از monster_bodies3) — رجیستری ادغام در monster_registry.js (ن۴۷)
export const MBODY_A = { slime: dSlime, wolf: dWolf, skeleton: dSkeleton, golem: dGolem, ...MBODY_A3 };
export const MOUT_A = { slime: MC.slimeOut, wolf: MC.wolfOut, skeleton: MC.boneOut, golem: MC.golemOut, ...MOUT_A3 };
export const MSHW_A = { slime: [11, 4], wolf: [14, 4], skeleton: [10, 3], golem: [16, 5], ...MSHW_A3 };
