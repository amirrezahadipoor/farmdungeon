// hero.js — رسم قهرمان: اسکلت ۱۷ مفصلی (ریاضی پوز در hero_pose.js) —
// ۴ جهت واقعی با پای نزدیک/دور و ترتیب لایه درست. همه‌چیز رویه‌ای روی Raster 128×۱۲۸.
import { C } from './palette_hero.js';
import { Raster, rot } from '../raster.js';
import { ik, GAITS, bodyBob, ease } from '../skeleton.js';
import { SPR, OX, OY, DIRS, GEO, ACT, actionPose, gaitPose, poseLerp, mapPts } from './hero_pose.js';
import { drawEquipHat, drawEquipBody, drawEquipBoots, swordPal } from './equipment.js';
import { drawHeroPx, up2 } from './hero_px.js';
import { bake } from './bake.js';                       // S6.1: خط لولهٔ واحدِ پخت (half/rim/outline/lock)

// ---------- قطعات ----------
// ---------- ابزارها (گریپ در مبدأ، سرِ کار در +x) ----------
// S6.2: ghost=1/2 — اسمیرِ ضربه با رمپ فلز (۱=نزدیک metal، ۲=دور metalSh)
export function drawTool(r, kind, gx, gy, ang, swordId, ghost = 0) {
  const T = (x, y) => { const q = rot(x, y, ang); return [gx + q[0], gy + q[1]]; };
  const tl = (x1, y1, x2, y2, w, c) => { const a = T(x1, y1), b = T(x2, y2); r.lineW(a[0], a[1], b[0], b[1], w, c); };
  const sp = kind === 'sword' ? swordPal(swordId) : null;
  const gc = ghost === 2 ? C.metalSh : C.metal;
  const wood = ghost ? gc : C.wood, met = ghost ? gc : (sp ? sp.met : C.metal), metHi = ghost ? gc : (sp ? sp.metHi : C.metalHi);
  if (kind === 'hoe') {
    tl(-6, 0, 10, 0, 2, wood);
    tl(10, -3, 12.5, 3, 3, met);
    tl(10, -3, 12, -2, 1, metHi);
  } else if (kind === 'can') {
    tl(2, -3.5, 2, 3.5, 8, met);
    tl(5, -2, 11, -5, 2, met);
    tl(0, -4.5, 4, -5.5, 1, metHi);
    r.px(...T(11.5, -6).map(Math.round), metHi);
  } else if (kind === 'sickle') {
    tl(-3, 0, 1, 0, 2, wood);
    const pts = [[1, 0], [5, -4], [9, -7], [12, -6.5]];
    for (let i = 0; i < pts.length - 1; i++) tl(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2, met);
    tl(1, -1, 9, -8, 1, metHi);
  } else if (kind === 'sword') {
    tl(-4, 0, -1, 0, 2, ghost ? gc : C.bootSh);
    tl(-1, -3, -1, 3, 1, met);
    tl(0, 0, 12, 0, 2, met);
    tl(0, -1, 12, -1, 1, metHi);
    r.px(...T(13, 0).map(Math.round), metHi);
  }
}

// ---------- فریم نهایی ----------
// opts: {dir, anim:'idle'|'walk'|'run', phase, breath, moveW, tool, actP(-1..1), blink}
// S6.2: ساعت انیمیشن از phase کوانت‌شده می‌آید (breath snapped) ⇒ پوز فقط تابعِ کلید کش است
export function drawHeroFrame(opts) {
  const { dir, anim = 'idle', phase = 0, moveW = 1, tool = 'none', actP = -1, blink = false, equip = null } = opts;
  const breath = (phase || 0) * 2.4 - 0.3; // ۴ فریمِ idle ← breathY=[0,1,0,-1]؛ walk/run هم قطعی
  const g = GAITS[anim === 'idle' ? 'walk' : anim];
  const p = gaitPose(dir, g, phase, breath, anim === 'idle' ? 1 : 1 - moveW);
  const q = gaitPose(dir, GAITS.walk, 0, breath, 1);
  const pose = anim === 'idle' ? q : moveW >= 0.999 ? p : poseLerp(q, p, moveW);
  // bob زیرپیکسلی: بخش صحیح در hero_pose (گام ۱px) — بخش کسری/علامت اینجا به رنگ (خال dither + باند سایه)
  // S6.2: bob زیرپیکسلی به رنگ ترجمه می‌شود — فریم‌های idle سینه را با باندِ رنگ بالا/پایین می‌برند
  const bobF = anim === 'idle' ? 0 : bodyBob(g, phase) * moveW * 0.75;
  const bobQ = anim === 'idle' ? [0, 1, 0, -1][Math.round((phase || 0) * 4) % 4]
    : Math.max(-1, Math.min(1, Math.round(bobF)));
  const dPhase = (anim === 'idle' ? bobQ : bobF) < 0 ? 1 : 0;

  let toolAng = null;
  if (tool !== 'none') {
    if (actP >= 0) {
      const a = actionPose(tool, dir, actP);
      const [fx, fy] = DIRS[dir];
      const sh = pose.arms.near.shoulder;
      let hand;
      if (fx !== 0) hand = [sh[0] + a.hand[0] * fx, sh[1] - a.hand[1]];
      else hand = [sh[0] + a.hand[0] * 0.4, sh[1] - a.hand[1] + fy * a.hand[0] * 0.6];
      const bend = fx !== 0 ? (fx > 0 ? 1 : -1) : (sh[0] < 0 ? 1 : -1);
      const { mid } = ik(sh, hand, GEO.uarm, GEO.farm, bend);
      pose.arms.near.hand = hand; pose.arms.near.elbow = mid;
      toolAng = a.ang;
      const lg = a.lunge * 2.5;
      pose.legs.near.ankle = [pose.legs.near.ankle[0] + fx * lg, pose.legs.near.ankle[1] + fy * lg];
      const kb = fx !== 0 ? (fx > 0 ? -1 : 1) : (pose.legs.near.hip[0] < 0 ? 1 : -1);
      pose.legs.near.knee = ik(pose.legs.near.hip, pose.legs.near.ankle, GEO.thigh, GEO.shin, kb).mid;
    } else {
      let ang = ACT[tool].ang.rest;
      if (dir === 'left') ang = Math.PI - ang;
      toolAng = ang;
    }
  }

  const body = new Raster(SPR, SPR);
  const P = mapPts(pose);
  // ترتیب لایه: بازوی دور → پای دور → تنه → پای نزدیک → سر/کلاه → بازوی نزدیک → ابزار
  // S9.3: بدنه‌ی دست‌پیکسل در مقیاس نهایی (۶۴) → ۲× روی بومِ ۱۲۸؛ تجهیزات/ابزار همچنان در ۱۲۸
  const lo = new Raster(SPR / 2, SPR / 2);
  drawHeroPx(lo, dir, P, 'back');
  up2(lo, body); lo.d.fill(0);
  if (equip && equip.body) drawEquipBody(body, dir, P, equip.body);
  drawHeroPx(lo, dir, P, 'front', { blink, noHat: !!(equip && equip.hat) });
  up2(lo, body);
  if (equip && equip.hat) drawEquipHat(body, dir, P.headC, equip.hat);
  if (equip && equip.boots) drawEquipBoots(body, dir, P, equip.boots);
  if (tool !== 'none' && toolAng !== null) {
    const gx0 = Math.round(P.arms.near.hand[0]), gy0 = Math.round(P.arms.near.hand[1]) + 1;
    // S6.2: اسمیر ۲–۳ فریمیِ ضربه — دو ردِ عقب‌ترِ ابزار با رمپ فلز (دور=metalSh، نزدیک=metal)
    // نمونه‌ها زیرفریمی‌اند (qA−0.08 و qA−0.16) تا روی قوسِ سریعِ strike بیفتند، نه بازه‌ی ساکن windup
    if (actP >= 0) {
      const qA = Math.min(7, Math.floor(actP * 8)) / 8;
      if (qA >= 0.30 && qA <= 0.85) {
        for (let k = 2; k >= 1; k--) {
          const gp = qA - k * 0.08;
          if (gp < 0.05) continue;
          drawTool(body, tool, gx0, gy0, actionPose(tool, dir, gp).ang, equip && equip.sword, k);
        }
      }
    }
    drawTool(body, tool, gx0, gy0, toolAng, equip && equip.sword);
  }
  // S6.1: سایهٔ تماس از خط لولهٔ واحد (bake) — همان ۵ باندِ قبلی (۱۳×۴ روی OY+2)
  return bake(body, [{ op: 'shadow', spec: 'hero', x: OX, y: OY + 2, color: [8, 6, 14] }]);
}

// نصف‌مقیاس ۲:۱ سپس rim → outline جوهر → قفلِ پالت (S6.1: بدنهٔ مراحل در art/bake.js)
// ترتیب دست‌نخورده است: half → rim → outline(ink) → lock؛ ۱px در مقیاسِ نهایی
export function halfSprite(s) {
  return bake(s, [{ op: 'half' }, { op: 'outline', mode: 'ink' }, { op: 'lock' }]);
}

// کلید کش: S6.2 — ۶ فریم walk/run · ۴ فریم idle (تنفس) · blend شروع/توقف به ۳ پله کوانت می‌شود
export const GAIT_FRAMES = 6, IDLE_FRAMES = 4;
export function frameKey(o) {
  const N = o.anim === 'idle' ? IDLE_FRAMES : GAIT_FRAMES;
  const f = Math.floor((((o.phase % 1) + 1) % 1 * N) + 0.5) % N;
  const mw = o.anim === 'idle' ? 1 : Math.min(2, Math.round((o.moveW ?? 1) * 2));
  const ap = o.actP == null || o.actP < 0 ? -1 : Math.min(7, Math.floor(o.actP * 8));
  return `h|${o.dir}|${o.anim}|${f}|${mw}|${o.tool}|${ap}|${o.blink ? 1 : 0}`;
}
export function framePhase(o) {
  const N = o.anim === 'idle' ? IDLE_FRAMES : GAIT_FRAMES;
  return (Math.floor((((o.phase % 1) + 1) % 1) * N + 0.5) % N + 0.5) / N;
}
