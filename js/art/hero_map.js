// art/hero_map.js — S10.7/S10.8: قهرمانِ مرجع با «ریگِ قطعه‌ای»:
// بالاتنه (کلاه تا دامن) از نقشه‌ی ۲۲×۳۲ hero_art.js؛ پاها رویه‌ای (ران/ساق با IK + چکمه) ⇒ گامِ واقعی با زانو.
// هیچ فریمی جداگانه کشیده/تولید نمی‌شود — همه‌ی جهت‌ها/انیمیشن‌ها/ابزارها/تجهیزات از همین یک منبع.
// بوم ۶۴×(۶۴+PAD)، زمین روی ردیفِ GROUND؛ فقط رنگ‌های palette_hero ⇒ قفلِ پالت و recolorِ کارگرها مثلِ قبل.
import { C } from './palette_hero.js';
import { HERO_ART } from './hero_art.js';
import { actionPose, DIRS, PAD } from './hero_pose.js';
import { ik } from '../skeleton.js';

const K = {
  H: C.hair, h: C.hairSh, K: C.skinHi, S: C.skin, s: C.skinSh, e: C.out,
  Y: C.hatHi, y: C.hat, t: C.hatSh, r: C.scarf, R: C.scarfSh,
  J: C.jacketHi, j: C.jacket, d: C.jacketSh, D: C.jacketDeep, c: C.shirt, x: C.shirtSh,
  b: C.boot, B: C.bootHi, n: C.bootSh, P: C.pantsHi, p: C.pants, q: C.pantsSh,
  M: C.metalHi, m: C.metal, w: C.metalSh,
};
const MW = 22, UH = 32, LEG = 12;                         // عرض · ردیف‌های بالاتنه · قدِ پا (۸ شلوار + ۴ چکمه)
export const MAP_H = UH + LEG;                            // ۴۴
const GROUND = 46 + PAD, OXL = 32, X0 = OXL - MW / 2, TOP = GROUND - (MAP_H - 1);
const SH = 17, FORE = 23, HAND = 30, TORSO_END = 28;      // شانه · ساعد · دست · انتهای جلیقه (ردیفِ نقشه)
const ARMF = { L: [0, 3], R: [18, 21] }, ARMS = [7, 12];  // بازوهای روبه‌رو/پشت · بازوی کنار
const EYES = { front: [[10, 7], [10, 8], [10, 13], [10, 14]], side: [[10, 13], [10, 14]] };
// ---- گامِ ۶ فریمی: تماس · پایین · عبور · تماسِ مقابل · پایین · عبور (پای دور = نیم‌دور بعد) ----
const FX = [5, 2, -1, -5, -2, 2];                         // کنار: جای پنجه‌ی پای نزدیک نسبت به لگن
const FL = [0, 0, 0, 0, 2, 3];                            // کنار: بلندیِ پا (پای در گذر)
const FOOT_F = [1, 0, -1, -2, -3, -1];                    // روبه‌رو/پشت: ارتفاعِ پای چپ (+۱ جلو/نزدیکِ دوربین، منفی = بالا)؛ راست = نیم‌دور بعد
const BOB = [0, 1, -1, 0, 1, -1], BOB_RUN = [0, 2, -1, 0, 2, -1];
const IDLE_BOB = [0, 0, 1, 1];
// S10.9: پوزهای پای کنار (offs = جابه‌جاییِ هر ردیفِ شلوار از لگن، boot = جای چکمه، lift = بالا) —
// CF تماسِ جلو · DP پایین/کاشته · PP عبورِ کاشته · CB تماسِ عقب · DL پایین/جداشده · PL عبورِ در هوا (زانو جلو)
const SIDE_POSE = {
  CF: { offs: [0, 0, 1, 1, 2, 3, 3, 4], boot: 4, lift: 0 }, DP: { offs: [0, 0, 0, 1, 1, 1, 2, 2], boot: 2, lift: 0 },
  PP: { offs: [0, 0, 0, 0, 0, -1, -1, -1], boot: -1, lift: 0 }, CB: { offs: [0, 0, -1, -1, -2, -3, -3, -4], boot: -4, lift: 0 },
  DL: { offs: [0, 0, -1, -1, -2, -2, -3], boot: -3, lift: 1 }, PL: { offs: [0, 1, 1, 2, 1], boot: 1, lift: 3 },
};
const SIDE_BOOT = ['BBBBb', 'eeeee', 'Bbbbb', 'Bbbbbb'];   // ساقه · بند · رویه · پنجه (از چکمه‌ی AI)                            // تنفس (پاها ثابت، لگن همراهِ بالاتنه)
export const HERO_MAP_GAIT = { GAIT_DX: FX, LIFT: FL, BOB, IDLE_BOB };

// ---- تجهیزات: بازرنگِ نواحی به رمپ‌های همان پالت ----
const RC = {
  helmLeather: { Y: 'B', y: 'b', t: 'n', r: 'n', R: 'n' }, helmIron: { Y: 'M', y: 'm', t: 'w', r: 'w', R: 'e' },
  crownWar: { Y: 'Y', y: 'Y', t: 'y', r: 'r', R: 'R' },
  vestLeather: { J: 'B', j: 'b', d: 'n', D: 'n' }, plateIron: { J: 'M', j: 'm', d: 'w', D: 'w' },
  robeMage: { J: 'd', j: 'D', d: 'D', D: 'e', c: 'd', x: 'D' },
  bootsSwift: { B: 'M', b: 'M', n: 'm' }, bootsWar: { B: 'm', b: 'w', n: 'w' },
};
const zoneOf = (j) => (j <= 8 ? 'hat' : j >= 14 && j < UH ? 'body' : j >= UH ? 'boots' : '');

// o: {dir, frame(0..5), anim:'idle'|'walk'|'run', blink, act:{tool,p}|null, equip}
// برمی‌گرداند لنگرها (بومِ ۶۴+PAD): headC, neck, pelvis, shoulderN/F, handN/F, ankleN/F, top
export function drawHeroMap(r, o) {
  const dir = o.dir, side = dir === 'left' || dir === 'right', flip = dir === 'left', kd = side ? 'side' : dir === 'up' ? 'back' : 'front';
  const map = HERO_ART[kd], idle = o.anim === 'idle', run = o.anim === 'run';
  const f = ((o.frame | 0) % 6 + 6) % 6;
  const bob = idle ? IDLE_BOB[f & 3] : (run ? BOB_RUN : BOB)[f];
  const eq = o.equip || {};
  const tab = { hat: RC[eq.hat], body: RC[eq.body], boots: RC[eq.boots] };
  const col = (ch, z) => { const t = tab[z]; return K[(t && t[ch]) || ch]; };
  const blink = o.blink && EYES[kd] ? new Set(EYES[kd].map(([j, i]) => j * MW + i)) : null;
  const sg = flip ? -1 : 1;
  const X = (i, off) => (flip ? X0 + (MW - 1 - i) - off : X0 + i + off);
  const blit = (j0, j1, i0, i1, dy, offX, keep) => {
    for (let j = j0; j <= j1; j++) {
      const row = map[j], ox = offX ? offX(j) : 0;
      for (let i = i0; i <= i1; i++) {
        let ch = row[i];
        if (ch === '.' || (keep && !keep(i, j))) continue;
        if (blink && blink.has(j * MW + i)) ch = 'S';
        const c = col(ch, zoneOf(j)); if (c) r.px(X(i, ox), TOP + j + dy, c);
      }
    }
  };
  const hipY = TOP + UH + bob;                             // پاها از زیرِ دامن (همراهِ bob ⇒ هیچ شکافی نمی‌ماند)
  const anchors = { top: TOP + bob, headC: [OXL, TOP + 11 + bob], neck: [OXL, TOP + 14 + bob], pelvis: [OXL, hipY] };
  const act = o.act && o.act.tool ? o.act : null;
  if (side) {
    const amp = run ? 1.5 : 1, hx = OXL - 2;                 // ستونِ چپِ پا (۴px) در نمای راست
    const occ = new Set();
    const put = (x, y, c, mark) => { const X1 = flip ? 2 * OXL - 1 - x : x; r.px(X1, y, c); if (mark) occ.add(X1 * 1000 + y); };
    // پای دست‌چیده: هر ردیفِ شلوار یک دهانه‌ی صاف ۴px با پله‌ی ≤۱px (بی‌زانوی کج)؛ چکمه = مُهرِ نقشه‌ی AI
    const leg = (ps, far) => {
      const P = SIDE_POSE[ps], lift = idle ? 0 : P.lift + (run && P.lift ? 1 : 0);
      const sc = (v) => (idle ? 0 : Math.round(v * amp));
      const ay = GROUND - 3 - lift, n = ay - hipY, L = P.offs.length;
      const [cL, cD] = far ? ['p', 'q'] : ['P', 'p'];
      for (let k = 0; k < n; k++) {
        const x = hx + sc(P.offs[Math.min(L - 1, Math.round(k * (L - 1) / Math.max(1, n - 1)))]), y = hipY + k;
        if (!far && occ.has((flip ? 2 * OXL - 1 - (x - 1) : x - 1) * 1000 + y)) put(x - 1, y, K.e);
        for (let q = 0; q < 4; q++) put(x + q, y, col(q === 3 ? cD : cL), far);
      }
      const bx = hx + sc(P.boot), tone = far ? { B: 'b', b: 'n' } : null;
      SIDE_BOOT.forEach((row, j) => { for (let q = 0; q < row.length; q++) if (row[q] !== '.') {
        if (!far && j > 1 && q === 0 && occ.has((flip ? 2 * OXL - 1 - (bx - 1) : bx - 1) * 1000 + ay + j)) put(bx - 1, ay + j, K.e);
        put(bx + q, ay + j, row[q] === 'e' ? K.e : col(tone ? tone[row[q]] || row[q] : row[q], 'boots'), far);
      } });
      return [flip ? 2 * OXL - 1 - (bx + 2) : bx + 2, ay + 3];
    };
    const NEAR = ['CF', 'DP', 'PP', 'CB', 'DL', 'PL'];
    const ankF = leg(NEAR[(f + 3) % 6], true), ankN = leg(NEAR[f], false);
    const inArm = (i, j) => j >= SH && i >= ARMS[0] && i <= ARMS[1];
    blit(0, UH - 1, 0, MW - 1, bob, null, (i, j) => !inArm(i, j));
    for (let j = SH; j <= TORSO_END; j++) for (let i = ARMS[0]; i <= ARMS[1]; i++) {   // پشتِ بازو: جلیقه
      if (map[j][i] === '.') continue;
      r.px(X(i, 0), TOP + j + bob, i === ARMS[0] ? K.e : col('d', 'body'));
    }
    if (!idle) {                                             // دنباله‌ی شال: پشتِ گردن، یک فریم عقب‌تر از بدن تکان می‌خورد
      const fl = (f + 5) % 3, ty = TOP + 15 + (run ? 0 : (BOB[(f + 5) % 6] > 0 ? 1 : 0));
      r.px(X(6, 0), ty, col('r')); r.px(X(5, 0), ty + (fl === 1 ? -1 : 0), col('R'));
      if (fl !== 2 || run) r.px(X(4, 0), ty + (fl === 0 ? 1 : 0), col('R'));
    }
    const shoulder = [X(10, 0), TOP + SH + bob];
    let hand;
    if (act) hand = actArm(r, shoulder, act, dir);
    else {
      const dxA = idle ? 0 : -Math.round(FX[f] * 0.6 * amp);
      blit(SH, UH - 1, ARMS[0], ARMS[1], bob, (j) => Math.round(dxA * (j - SH) / (UH - SH)), inArm);
      hand = [X(10, dxA), TOP + HAND + bob];
    }
    return { ...anchors, shoulderN: shoulder, shoulderF: [X(13, 0), TOP + SH + bob], handN: hand, handF: [X(13, 0), TOP + TORSO_END + bob], ankleN: ankN, ankleF: ankF };
  }
  // ---- روبه‌رو/پشت: دو ستونِ ۶px؛ پای در گذر کوتاه می‌شود (زانو رو به دوربین)، بازوی مخالف جلو می‌آید ----
  const fy = (k) => { const v = FOOT_F[k]; return run && v < 0 ? v - 1 : v; };
  const lA = idle ? 0 : -fy(f), lB = idle ? 0 : -fy((f + 3) % 6);   // lift: مثبت = بالا
  const fleg = (x0, lift, outer) => {                      // outer: −۱ چپ / +۱ راست (پنجه کمی به بیرون)
    const ay = GROUND - 3 - lift;
    for (let y = hipY; y < ay; y++) for (let k = 0; k < 6; k++) {
      const knee = lift > 0 && y === ay - 1 ? 'q' : null;      // سایه‌ی زیرِ زانوی خم
      r.px(x0 + k, y, col(knee || (k === 5 ? 'p' : y === ay - 1 ? 'q' : 'P')));
    }
    // چکمه‌ی روبه‌رو (مُهرِ AI): ساقه · بند · رویه · پنجه‌ی پهن‌تر به بیرون
    for (let k = 0; k < 6; k++) r.px(x0 + k, ay, col(k === 5 ? 'b' : 'B', 'boots'));
    for (let k = 0; k < 6; k++) r.px(x0 + k, ay + 1, K.e);
    for (let k = 0; k < 6; k++) r.px(x0 + k, ay + 2, col(k === (outer < 0 ? 5 : 0) ? 'B' : 'b', 'boots'));
    for (let k = outer < 0 ? -1 : 0; k < (outer < 0 ? 6 : 7); k++) r.px(x0 + k, ay + 3, col(k === (outer < 0 ? 5 : 0) ? 'B' : 'b', 'boots'));
    return [x0 + 3, ay + 3];
  };
  const ankL = fleg(X0 + 4, lA, -1), ankR = fleg(X0 + 12, lB, 1);
  const inArms = (i) => i <= ARMF.L[1] || i >= ARMF.R[0];
  blit(0, UH - 1, 0, MW - 1, bob, null, (i, j) => j < SH || !inArms(i));
  const arm = (rng, sw) => { blit(SH, FORE - 1, rng[0], rng[1], bob, null, null); blit(FORE, UH - 1, rng[0], rng[1], bob - sw, null, null); };
  const swOf = (l) => (l < 0 ? 2 : l >= 2 ? 0 : 1);       // پای جلو ⇒ دستِ همان سمت عقب (ساعد پنهان‌تر)
  const swL = idle ? 0 : swOf(lA), swR = idle ? 0 : swOf(lB);
  arm(ARMF.L, swL);
  const shoulderN = [X0 + 19, TOP + SH + bob], shoulderF = [X0 + 2, TOP + SH + bob];
  let handN;
  if (act) handN = actArm(r, shoulderN, act, dir);
  else { arm(ARMF.R, swR); handN = [X0 + 20, TOP + HAND + bob - swR]; }
  return { ...anchors, shoulderN, shoulderF, handN, handF: [X0 + 1, TOP + HAND + bob - swL], ankleN: ankR, ankleF: ankL };
}

// بازوی ابزار در حالِ اکشن: از شانه تا دست (کی‌فریمِ actionPose) — آستین + دستِ ۳×۳ با خطِ دور
const ACT_K = 0.95;
function actArm(r, sh, act, dir) {
  const a = actionPose(act.tool, dir, act.p), [fx, fy] = DIRS[dir];
  let hx, hy;
  if (fx !== 0) { hx = sh[0] + a.hand[0] * fx * ACT_K; hy = sh[1] - a.hand[1] * ACT_K; }
  else { hx = sh[0] + a.hand[0] * 0.4 * ACT_K; hy = sh[1] - a.hand[1] * ACT_K + fy * a.hand[0] * 0.6 * ACT_K; }
  hx = Math.round(hx); hy = Math.round(hy);
  r.lineW(sh[0], sh[1], hx, hy, 5, K.e);
  r.lineW(sh[0], sh[1], hx, hy, 3, K.c);
  r.rect(hx - 2, hy - 2, 5, 5, K.e);
  r.rect(hx - 1, hy - 1, 3, 3, K.S);
  r.px(hx + 1, hy + 1, K.s);
  return [hx, hy];
}
