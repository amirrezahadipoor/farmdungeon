// hero.js — رسم قهرمان: اسکلت ۱۷ مفصلی (ریاضی پوز در hero_pose.js) —
// ۴ جهت واقعی با پای نزدیک/دور و ترتیب لایه درست. همه‌چیز رویه‌ای روی Raster 128×۱۲۸.
import { C } from './palette_hero.js';
import { Raster, rot } from '../raster.js';
import { ik, GAITS, bodyBob, ease } from '../skeleton.js';
import { SPR, OX, OY, DIRS, GEO, ACT, actionPose, gaitPose, poseLerp, mapPts } from './hero_pose.js';
import { drawEquipHat, drawEquipBody, drawEquipBoots, swordPal } from './equipment.js';
import { bake } from './bake.js';                       // S6.1: خط لولهٔ واحدِ پخت (half/rim/outline/lock)

// ---------- قطعات ----------
const TRIP = {
  pantsN: [C.pants, C.pantsHi, C.pantsSh], pantsF: [C.pantsSh, C.pants, C.pantsSh],
  bootN: [C.boot, C.bootHi, C.bootSh], bootF: [C.bootSh, C.boot, C.bootSh],
  jacketN: [C.jacket, C.jacketHi, C.jacketSh], jacketF: [C.jacketSh, C.jacket, C.jacketSh],
};

function bootSide(r, an, pitch, trip) {
  const [cb, ch, cs] = trip;
  const rp = (x, y) => { const q = rot(x, y, pitch); return [an[0] + q[0], an[1] + q[1]]; };
  r.lineW(an[0], an[1], ...rp(0, -3.5), 4, cb);
  r.lineW(...rp(-2.5, 2.6), ...rp(3.5, 2.6), 3, cb);
  r.line(...rp(-2.5, 3.6), ...rp(3.5, 3.6), cs);
  r.line(...rp(1, 0.6), ...rp(3.5, 0.9), ch);
}
function bootFront(r, an, trip) {
  const [cb, ch, cs] = trip;
  const x = Math.round(an[0]) - 2, y = Math.round(an[1]) - 1;
  r.rect(x, y, 5, 5, cb);
  r.rect(x, y, 5, 1, ch); r.rect(x, y + 4, 5, 1, cs);
}
function drawLeg(r, dir, leg) {
  const [cp, ch, cs] = leg.trip;
  r.seg(leg.hip[0], leg.hip[1], leg.knee[0], leg.knee[1], 4, cp, ch, cs);          // S6.2: ضخامت ۲px نهایی
  r.seg(leg.knee[0], leg.knee[1], leg.ankle[0], leg.ankle[1] - 1, 4, cp, ch, cs);
  if (dir === 'left' || dir === 'right') bootSide(r, leg.ankle, leg.pitch * (dir === 'right' ? 1 : -1), leg.trip === TRIP.pantsN ? TRIP.bootN : TRIP.bootF);
  else bootFront(r, leg.ankle, leg.trip === TRIP.pantsN ? TRIP.bootN : TRIP.bootF);
}
function drawArm(r, dir, arm, near) {
  const [cj, ch, cs] = near ? TRIP.jacketN : TRIP.jacketF;
  r.seg(arm.shoulder[0], arm.shoulder[1], arm.elbow[0], arm.elbow[1], 4, cj, ch, cs); // S6.2: ضخامت ۲px نهایی
  r.seg(arm.elbow[0], arm.elbow[1], arm.hand[0], arm.hand[1], 4, cj, ch, cs);
  const hx = Math.round(arm.hand[0]) - 1, hy = Math.round(arm.hand[1]) - 1;
  r.rect(hx, hy, 3, 3, near ? C.skin : C.skinSh);
  r.px(hx, hy + 3, near ? C.skinSh : C.skinSh);
}
// شال: از پشت گردن به سمت مخالف جهت نگاه، با موج سینوسی (شخصیت + حس حرکت)
function drawScarf(r, dir, P, opts) {
  const nx = P.neck[0], ny = P.neck[1] + 3;
  const wave = Math.sin((opts.phase ?? 0) * Math.PI * 4 + (opts.breath ?? 0) * 2.2);
  const run = opts.anim === 'run' ? 1 : opts.anim === 'walk' ? 0.5 : 0.2;
  if (dir === 'left' || dir === 'right') {
    const fx = dir === 'right' ? -1 : 1; // پشت سر
    let px2 = nx + fx * 3, py2 = ny;
    for (let i = 0; i < 3; i++) {
      const qx = px2 + fx * (2 + run * 1.2), qy = py2 - 1 + wave * (1 + i) * 0.8 + run * i * 0.6;
      r.lineW(px2, py2, qx, qy, 3 - (i > 1 ? 1 : 0), i === 0 ? C.scarf : C.scarfSh);
      r.px(qx, qy - 1, C.scarf);
      px2 = qx; py2 = qy;
    }
  } else {
    // نمای جلو/پشت: دو دنباله کوتاه به طرفین پایین
    r.lineW(nx - 2, ny, nx - 4 - wave * 0.7, ny + 4 + run * 2, 2, C.scarf);
    r.lineW(nx + 2, ny, nx + 4 + wave * 0.7, ny + 3 + run * 2, 2, C.scarfSh);
    r.rect(nx - 3, ny - 1, 7, 2, C.scarf); // گره
  }
}
function drawTorso(r, dir, p, bobQ = 0, dPhase = 0) {
  const [fx] = DIRS[dir];
  const side = fx !== 0;
  r.seg(p.pelvis[0], p.pelvis[1] + 1, p.neck[0], p.neck[1] + 1, side ? 9 : 10, C.jacket, C.jacketHi, C.jacketSh);
  const drag = side ? -fx * p.lean * 9 : 0;
  const hy = Math.round(p.pelvis[1] / 2) * 2 - 2, cx = Math.round(p.pelvis[0]) + Math.round(drag); // S6.2: لنگرِ زوج — بقای باندها و dither در نصف‌سازی
  // S6.2: سایه‌زنی ۴ پله (Hi/base/Sh/Deep) — لبه‌ی پایین با jacketDeep؛ بخش کسریِ bob به رنگ می‌رود
  r.rect(cx - 5, hy, 11, 4, C.jacket);
  r.rect(cx - 5, hy + 1, 11, 1, bobQ > 0 ? C.jacket : C.jacketSh);
  r.rect(cx - 5, hy + 2, 11, 2, bobQ < 0 ? C.jacketSh : C.jacketDeep);
  if (bobQ > 0) r.rect(cx - 5, hy, 11, 1, C.jacketHi); // بدن بالا ← لبه‌ی بالایی روشن‌تر (اختلاف رنگ، نه مقیاس)
  // خال dither روی پارچه (۲×۲ پیکسل نهایی، checker روی مرز Sh/Deep) — فاز با bob عوض می‌شود
  const d2 = (x, y, c) => r.rect(x, y, 2, 2, c);
  const dx0 = (cx + 1) & ~1;
  const a = dPhase ? C.jacketDeep : C.jacketSh, b = dPhase ? C.jacketSh : C.jacketDeep;
  d2(dx0, hy, a); d2(dx0 + 2, hy, b);
  d2(dx0, hy + 2, b); d2(dx0 + 2, hy + 2, a);
  const nx = Math.round(p.neck[0]), ny = Math.round(p.neck[1]);
  if (side) {
    r.line(nx + fx * 3, ny + 3, cx + fx * 3, hy + 1, C.jacketSh);
    r.rect(cx + fx * 3 - 1, hy - 4, 3, 2, C.jacketSh);
  } else if (dir === 'down') {
    r.rect(nx - 2, ny + 2, 5, 1, C.shirt);
    r.px(nx, ny + 5, C.out); r.px(nx, ny + 8, C.out);
    r.rect(nx - 1, ny + 12, 2, 1, C.shirtSh);
  } else {
    r.line(nx - 4, ny + 4, nx + 4, ny + 4, C.jacketSh);
    r.line(nx, ny + 4, nx, hy + 1, C.jacketSh);
  }
}
function drawHead(r, dir, hc, blink) {
  const hx = Math.round(hc[0]) & ~1, hy = Math.round(hc[1]) & ~1;
  // S6.2 تناسب: سر ≈ ۳۵٪ قد (یک‌کله ۲۲px در مقیاس ۲× ≈ ۱۱px نهایی) — چهره/کلاه در ۳۱px خوانا
  // ترازِ زوجِ hy: باندهای ۲ردیفی با شبکه‌ی نصف‌سازی هم‌پار می‌شوند (رأی اکثریت تساوی←تیره‌تر، درسِ خال dither)
  if (dir === 'left' || dir === 'right') {
    const fx = dir === 'right' ? 1 : -1;
    r.rect(hx - 6, hy - 5, 12, 12, C.skin);                 // S6.2: عرض زوج — نصف‌سازی قطعی
    r.px(hx + 5 * fx, hy + 6, C.skin); r.px(hx + 5 * fx + 1 * fx, hy + 6, C.skin); // چانه
    r.rect(hx - 6, hy - 7, 12, 3, C.hair);
    r.rect(fx > 0 ? hx - 8 : hx + 4, hy - 6, 4, 10, C.hair); // پشت سر
    r.rect(fx > 0 ? hx - 8 : hx + 6, hy - 8, 2, 2, C.hair);  // تار موی نافرمانی
    r.rect(hx - fx, hy - 1, 2, 4, C.skinSh);                // گوش
    const ex = hx + 1 * fx;
    if (blink) r.rect(ex, hy + 1, 3, 1, C.out);
    else r.rect(ex, hy, 2, 3, C.out);
    r.rect(ex - fx, hy - 2, 3, 1, C.hair);                  // ابرو
    r.px(hx + 5 * fx, hy + 2, C.skin); r.px(hx + 5 * fx + fx, hy + 2, C.skin); // بینی
    r.px(hx + 3 * fx, hy + 4, C.skinSh); r.px(hx + 3 * fx + fx, hy + 4, C.skinSh);
  } else if (dir === 'down') {
    // S6.2: عرضِ زوجِ سیلوئت (۱۲@۲× = ۶px نهایی) — نصف‌سازی قطعی، نه شیرِ سکه‌ای ۶/۷px
    r.rect(hx - 6, hy - 5, 12, 12, C.skin);
    r.rect(hx - 6, hy - 7, 12, 3, C.hair);
    r.rect(hx - 6, hy - 5, 2, 2, C.hair); r.rect(hx + 4, hy - 5, 2, 2, C.hair); // چتری کنار
    for (const ex of [hx - 5, hx + 2]) {
      if (blink) r.rect(ex, hy + 1, 3, 1, C.out);
      else r.rect(ex, hy, 3, 3, C.out);                     // چشم ۳×۳ (۲×۲ نهایی خوانا)
      r.rect(ex, hy - 2, 3, 1, C.hair);                     // ابرو
    }
    r.rect(hx - 1, hy + 3, 3, 1, C.skinSh);                 // بینی/دهان
    r.px(hx - 4, hy + 2, C.skinSh); r.px(hx + 3, hy + 2, C.skinSh); // گونه
  } else {
    r.rect(hx - 6, hy - 5, 12, 12, C.hair);
    r.rect(hx - 6, hy + 5, 12, 2, C.hairSh);                // پس گردن
    r.rect(hx - 4, hy - 6, 8, 2, C.hair);
    r.rect(hx - 8, hy + 2, 2, 2, C.skin); r.rect(hx + 6, hy + 2, 2, 2, C.skin); // گوش‌ها
    r.rect(hx - 8, hy + 4, 2, 2, C.skinSh); r.rect(hx + 6, hy + 4, 2, 2, C.skinSh);
  }
}
function drawHat(r, dir, hc) {
  const hx = Math.round(hc[0]) & ~1, hy = Math.round(hc[1]) & ~1;
  const fx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
  // S6.2: کلاه حصیری — باندهای ۲ردیفیِ هم‌پار با نصف‌سازی (تیره‌تر در تساوی می‌برد):
  // (hy-14..13) تاجِ روشن · (hy-12..11) تاج · (hy-10..9) نوار · (hy-8..7) لبه‌ی روشنِ ۱۵px
  r.rect(hx - 5, hy - 14, 10, 2, C.hatHi);  // تاج — بالای روشن (عرض زوج)
  r.rect(hx - 5, hy - 12, 10, 2, C.hat);
  r.rect(hx - 5, hy - 10, 10, 2, C.hatSh);  // نوار
  r.rect(hx - 7, hy - 8, 14, 2, C.hatHi);   // لبه‌ی روشن
  if (fx !== 0) { r.px(hx + 7 * fx, hy - 8, C.hat); r.px(hx + 8 * fx, hy - 7, C.hatSh); }
  else { r.px(hx - 7, hy - 6, C.hat); r.px(hx + 7, hy - 6, C.hat); }
}

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
  drawArm(body, dir, P.arms.far, false);
  drawLeg(body, dir, { ...P.legs.far, trip: TRIP.pantsF });
  body.lineW(P.neck[0], P.neck[1] + 2, P.headC[0], P.headC[1] + 6, 3, C.skin);
  drawTorso(body, dir, P, bobQ, dPhase);
  drawScarf(body, dir, P, { phase, breath, anim });
  if (equip && equip.body) drawEquipBody(body, dir, P, equip.body); // زره روی تنه
  drawLeg(body, dir, { ...P.legs.near, trip: TRIP.pantsN });
  drawHead(body, dir, P.headC, blink);
  if (equip && equip.hat) drawEquipHat(body, dir, P.headC, equip.hat); // کلاه/خود جایگزین
  else drawHat(body, dir, P.headC);
  if (equip && equip.boots) drawEquipBoots(body, dir, P, equip.boots); // روی مچ پاها
  drawArm(body, dir, P.arms.near, true);
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
  return bake(s, [{ op: 'half' }, { op: 'rim', lift: 0.62 }, { op: 'outline', mode: 'ink' }, { op: 'lock' }]);
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
