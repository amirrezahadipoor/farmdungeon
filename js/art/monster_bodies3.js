// monster_bodies3.js — بخش‌بندیِ monster_bodies.js (S6.4): خفاش/عنکبوت/روح + جزئیات
// چرا: monster_bodies.js از سقفِ ۲۸۰ خط گذشته بود (۳۱۵) — قبل از افزودن جزئیات سه بدنه این‌جا آمد.
// هر بدنه: (r, f) با f={state,t,ph,face,time} — فقط هندسه/انیمیشن؛ rim/outline/سایه در monsters.js
import { ik, ease } from '../skeleton.js';
import { MC, MOY, lm, wind } from './monster_parts.js';
import { bayer4 } from './dither.js';

const sin = Math.sin, cos = Math.cos, PI = Math.PI; // نام‌کوتاه‌های محلی

// ---------- خفاش: بال ۴ فریم + پرواز موجی (+ غشا و رگ بال — S6.4) ----------
function dBat(r, f) {
  const g = lm(r, f.face);
  let yOff = -46, flap = 0, fold = 0, limp = 0, tilt = 0;
  if (f.state === 'idle') { yOff += sin(f.time * 2) * 3; flap = sin(f.time * 5) * 0.5; }
  else if (f.state === 'move') { yOff += sin(f.time * 3.2) * 7; flap = sin(f.ph * PI * 4); }
  else if (f.state === 'attack') {
    if (f.t < 0.45) { const e = wind(f.t, 0.45); yOff -= e * 12; fold = e; }                     // بالا رفتن
    else if (f.t < 0.65) { const e = (f.t - 0.4) / 0.25; yOff += e * 22; tilt = e * 0.5; }     // شیرجه
    else { yOff += 8; }
  } else if (f.state === 'die') {
    const e = f.t;
    yOff = -46 + e * e * 40; limp = 1; tilt = sin(e * 9) * 0.4 * (1 - e);
  }
  const bx = 0, by = MOY + yOff;
  const wing = (sgn) => {
    const tipY = by - 8 - flap * 9 - fold * 5 + limp * 8;
    const midY = by - 3 - flap * 4 - fold * 8 + limp * 6;
    g.lineW(bx + sgn * 3, by - 3, bx + sgn * 15, tipY, 2, MC.batSh);
    g.lineW(bx + sgn * 3, by - 3, bx + sgn * 10, midY, 2, MC.batSh);
    g.lineW(bx + sgn * 15, tipY, bx + sgn * 10, midY, 1, MC.bat);
    g.lineW(bx + sgn * 3, by - 1, bx + sgn * 9, by - 3 - flap * 2, 1, MC.bat); // غشای داخلی
    g.lineW(bx + sgn * 6, by, bx + sgn * 12, tipY + 3, 1, MC.batMid); // S1.5a: پله‌ی میانی بال
    g.px(bx + sgn * 8, by - 1, MC.batDeep); g.px(bx + sgn * 9, by, MC.batDeep); // تیره‌ی مفصل بال
    // S6.4: غشای کشیده بین دو استخوان + رگ‌های ۱px (الگوی استخوان‌بندیِ بال)
    for (let s = 0.3; s <= 0.92; s += 0.31) {
      const vx = bx + sgn * (3 + 12 * s), vy = (by - 3) + (tipY - (by - 3)) * s;
      const mx = bx + sgn * (3 + 7 * s), my = (by - 3) + (midY - (by - 3)) * s;
      g.lineW(mx, my, vx, vy, 1, MC.batMid);               // پرده‌ی میان استخوان‌ها
      g.px(bx + sgn * (4 + 11 * s), vy - 1, MC.batDeep);   // سایه‌ی زیرِ رگ
    }
    g.lineW(bx + sgn * 12, tipY + 1, bx + sgn * 9, midY + 2, 1, MC.batDeep); // لبه‌ی عقبیِ غشا
  };
  wing(1); wing(-1);
  g.rect(bx - 4, by - 5, 9, 9, MC.bat);          // بدن
  g.rect(bx - 3, by - 5, 7, 2, MC.batHi);
  g.px(bx - 4, by - 7, MC.bat); g.px(bx + 4, by - 7, MC.bat); // گوش‌ها
  g.rect(bx - 3, by - 3, 2, 5, MC.batMid); // S6.4: سایه‌ی میانیِ تنه (حجمِ کرک‌دار)
  g.rect(bx - 2, by + 3, 4, 1, MC.batEdge); // S1.5a: ته بدن — خوشه
  g.px(bx - 4, by + 1, MC.batEdge); g.px(bx + 4, by + 1, MC.batEdge);
  if (f.state !== 'die') {
    g.px(bx - 2, by - 2, MC.eyeRed); g.px(bx + 2, by - 2, MC.eyeRed);
    if (f.state === 'attack' && f.t > 0.4 && f.t < 0.7) { g.px(bx, by + 3, MC.fang); g.px(bx - 2, by + 3, MC.fang); }
  } else { g.px(bx - 2, by - 2, MC.batSh); g.px(bx + 2, by - 2, MC.batSh); }
}

// S6.4: جدولِ ۸ پا (زاویه، دسترسی) — جفتِ نزدیک/دور یکی‌درمیان؛ بادبزنِ دستی ⇒ هیچ دو پایی روی هم نمی‌افتد
const LEG8 = [[-0.25, 14], [-0.60, 14], [-0.95, 14], [-1.30, 14], [2.05, 15], [2.40, 13], [2.75, 16], [3.10, 14]];

// ---------- عنکبوت: ۸ پا با گام موجی (+ بند پا + نقطه‌چشم — S6.4) ----------
function dSpider(r, f) {
  const g = lm(r, f.face);
  let rear = 0, lunge = 0, curl = 0, bob = sin(f.time * 2.5) * 0.8;
  if (f.state === 'attack') {
    if (f.t < 0.5) { rear = wind(f.t, 0.5); }
    else if (f.t < 0.72) { const e = (f.t - 0.5) / 0.22; lunge = e; rear = 1 - e; }
    else { lunge = 1 - (f.t - 0.72) / 0.28; }
  } else if (f.state === 'die') { curl = f.t; }
  const cx = lunge * 12 - rear * 5;
  const bodyY = MOY - 13 + bob + rear * -3 + curl * 9;
  // پاها: ۴ جلو (این‌دست‌آن‌دست) + ۴ عقب
  for (let i = 0; i < 8; i++) {
    const front = i < 4;
    const side = i % 2 === 0 ? 1 : -1;              // بالا/پایین تصویر
    const [baseA, reach] = LEG8[i]; // S6.4: جدولِ دستیِ ۸ پا (زاویه، دسترسی) ⇒ بادبزنِ تمیز، بدون افتادن روی هم
    const anchor = [cx + (front ? 6 : -5) + (side < 0 ? 0.5 : 0), bodyY - 2];
    const far = side < 0;                       // S6.4: پایِ سمتِ دور = یک پیکسل بالاتر (عمق)
    let foot = [anchor[0] + cos(baseA) * reach, MOY - 1 - (far ? 1 : 0)];
    if (f.state === 'move' && !curl) {              // گام موجی: جفت‌های یک‌درمیان
      const ph = (f.ph + (i % 2) * 0.5 + (front ? 0.25 : 0)) % 1;
      const lift = ph < 0.5 ? sin(ph * PI * 2) * 4 : 0;
      foot = [anchor[0] + cos(baseA) * (reach + sin(ph * PI * 2) * 2), MOY - 1 - (far ? 1 : 0) - lift];
    }
    if (front && (rear || lunge)) foot[1] -= rear * 7 + lunge * 3;  // جلو بالا در wind-up
    if (curl) foot = [anchor[0] + (foot[0] - anchor[0]) * (1 - curl) * 0.9 + (front ? 4 : -4) * curl, bodyY - 6 - curl * 4 + (i % 3)]; // جمع‌شدن
    const { mid } = ik([g.m(anchor[0]), anchor[1]], [g.m(foot[0]), foot[1]], 9, 9, side);
    r.lineW(g.m(anchor[0]), anchor[1], mid[0], mid[1], 2, MC.spider);
    r.lineW(mid[0], mid[1], g.m(foot[0]), foot[1], 2, MC.spiderSh);
    r.lineW(g.m(anchor[0]), anchor[1] - 1, mid[0], mid[1] - 1, 1, MC.spiderHi); // S6.4: رویِ پا (براقیِ کیتین)
    r.px(mid[0], mid[1], MC.spiderMid);                                          // S6.4: زانو
    r.px(g.m(foot[0]), foot[1], MC.spiderOut);
    r.px(g.m(foot[0]) + (front ? 1 : -1), foot[1], MC.spiderOut); // S6.4: پنجه‌ی ۲px ⇒ ۸ پا متمایز
  }
  // بدن: شکم + سر
  g.ellipse(cx - 6, bodyY, 8, 6, MC.spider);
  g.ellipse(cx - 7, bodyY - 2, 5, 3, MC.spiderHi);
  g.ellipse(cx - 6, bodyY + 2, 6, 2, MC.spiderMid); // S1.5a: شکم — پله‌ی میانی
  g.ellipse(cx - 6, bodyY + 4, 3, 1, MC.spiderDeep); // نوک شکم تیره
  g.px(cx - 9, bodyY + 1, MC.spiderEdge); g.px(cx - 8, bodyY + 1, MC.spiderEdge); g.px(cx + 3, bodyY - 5, MC.spiderMid); g.px(cx + 4, bodyY - 5, MC.spiderMid);
  g.rect(cx + 2, bodyY - 4, 7, 6, MC.spiderSh);
  if (!curl) {
    // S6.4: نقطه‌چشم‌های درخشان (هاله + هسته — ۴ چشمِ جفتی)
    for (const [ex, ey] of [[4, -3], [7, -3], [3, -1], [8, -1]]) g.px(cx + ex, bodyY + ey, MC.spiderHi); // هاله
    for (const [ex, ey] of [[5, -2], [7, -2], [4, 0], [7, 0]]) g.px(cx + ex, bodyY + ey, MC.eyeRed);     // هسته
    if (f.state === 'attack' && f.t > 0.5 && f.t < 0.75) { g.px(cx + 9, bodyY + 1, MC.fang); g.px(cx + 8, bodyY + 2, MC.fang); }
  } else { g.px(cx + 5, bodyY - 2, MC.spiderOut); g.px(cx + 7, bodyY - 2, MC.spiderOut); }
}

// ---------- روح: شفاف، شناور، لبه‌ی محوِ dither-شده (S6.4) ----------
function dGhost(r, f) {
  const g = lm(r, f.face);
  let yOff = sin(f.time * 2) * 3, wob = 0, rage = 0, fade = 1, dash = 0;
  if (f.state === 'idle') { yOff += sin(f.time * 0.7) * 2; }
  else if (f.state === 'move') { yOff = sin(f.time * 3) * 4; wob = sin(f.time * 6) * 1.5; }
  else if (f.state === 'attack') {
    if (f.t < 0.55) { const e = wind(f.t, 0.55); rage = e; wob = e * 2; }                    // لرزش + چشم روشن
    else if (f.t < 0.75) { dash = (f.t - 0.55) / 0.2; rage = 1; }
    else { rage = 1 - (f.t - 0.75) / 0.25; dash = 1 - rage; }
  } else if (f.state === 'die') { fade = 1 - f.t; yOff = -f.t * 18; }
  const a = (col) => [col[0], col[1], col[2], Math.round(col[3] * fade)];
  const cx = wob + dash * 14, cy = MOY - 34 + yOff - rage * 2;
  // بدنه: نیم‌بیضی بالا + دنباله‌ی موجی — لبه با ditherِ بایر محو می‌شود (S6.4)
  const body = MC.ghost, hi = MC.ghostHi, sh = MC.ghostSh;
  for (let dy = -14; dy <= 10; dy++) {
    let w2 = dy < 0 ? Math.round(10 * Math.sqrt(1 - (dy / 15) ** 2)) : Math.round(10 - dy * 0.35);
    if (dy > 4) { const k = (dy - 4) / 6; w2 = Math.round((10 - dy * 0.35) * (0.75 + 0.25 * Math.abs(sin(f.time * 4 + k * 6))) * (1 - k * 0.5)); }
    if (w2 < 1) continue;
    const row = a(dy < -6 ? hi : dy > 8 ? MC.ghostDeep : dy > 6 ? sh : dy > 4 ? MC.ghostDe2 : dy > 2 ? MC.ghostMid : dy > -1 ? MC.ghostVeil : body); // S1.5a: پله‌های روشنایی روح
    for (let dx = -w2; dx <= w2; dx++) {
      // حاشیه‌ی محو: هرچه پایین‌تر/لبه‌ای‌تر، احتمالِ حذفِ پیکسل بیشتر (الگوی بایر ایستا)
      const edge = 1 - Math.abs(dx) / (w2 + 1);
      if (dy > 1 && bayer4(cx + dx, cy + dy) > edge * 1.15) continue;
      g.px(cx + dx, cy + dy, row);
    }
  }
  // S6.4: هاله‌ی بیرونیِ dither (یک پیکسل دورِ سیلوئت — محو شدن در هوا)
  for (let dy = -13; dy <= 9; dy++) {
    if (bayer4(cx * 2 + 1, cy + dy) < 0.55) continue;
    const w2 = dy < 0 ? Math.round(11 * Math.sqrt(1 - (dy / 15) ** 2)) : Math.round(11 - dy * 0.35);
    if (w2 < 2) continue;
    g.px(cx + w2, cy + dy, a(MC.ghostVeil)); g.px(cx - w2, cy + dy, a(MC.ghostVeil));
  }
  // چشم‌ها + دهان (درخشان در خشم — S6.4: هاله + هسته)
  const eyeC = rage > 0.4 ? a(MC.ghostHi) : [20, 26, 34, Math.round(200 * fade)];
  for (const ex of [-4, 3]) { g.rect(cx + ex, cy - 4, 3, 4, eyeC); }
  if (rage > 0.4) { g.px(cx - 5, cy - 3, a(MC.ghostHi)); g.px(cx + 6, cy - 3, a(MC.ghostHi)); }
  if (f.state === 'attack' && f.t > 0.55 && f.t < 0.8) g.rect(cx - 1, cy + 2, 4, 3 + rage * 2, [20, 26, 34, Math.round(200 * fade)]);
  else g.rect(cx - 1, cy + 2, 3, 1, [20, 26, 34, Math.round(160 * fade)]);
  // رشته‌های محوشدن در مرگ
  if (f.state === 'die') for (let i = 0; i < 4; i++) g.px(cx + (i - 2) * 4, cy - 16 - f.t * 10 - i * 3, a(hi));
}

// بدنه‌های بخش ۳ (خفاش/عنکبوت/روح) — ادغام در monster_bodies.js (ن۱۰۲)
export const MBODY_A3 = { bat: dBat, spider: dSpider, ghost: dGhost };
export const MOUT_A3 = { bat: MC.batOut, spider: MC.spiderOut, ghost: null };
export const MSHW_A3 = { bat: [8, 3], spider: [13, 4], ghost: [9, 3] };
