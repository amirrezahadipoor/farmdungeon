// boss_ai.js — ن۱۴۸: حمله‌های ویژه + دو فازِ باس‌های خانواده (lord).
// هر خانواده ۲ حمله‌ی ویژه دارد (اهریمن ۳). فاز ۱: فقط اولی. فاز ۲ (جان ≤ ۵۰٪): خشم، احضارِ ۲ هم‌خانواده، هر دو حمله، خنک‌شدنِ ۴۰٪ سریع‌تر، تکرارِ موج.
// هشدار (tele) همیشه قبل از ضربه است تا بازیکن بتواند جاخالی دهد: run_render دایره/خط/هاله را می‌کشد.
// BOSS_AI(m, dt, target, hooks, spd) → true یعنی «این فریم حمله‌ی ویژه در جریان بود».
// هوک‌ها (run.js): onProj(from, kind, ang, dmg) · onQuake(x, y, r) · onPhase(from) · onHit(from, dmg) · solid(x, y)

// انواع: nova (حلقه‌ی پرتابه)، volley (بادبزنِ پرتابه به سمتِ قهرمان)، charge (یورشِ خطی)، quake (زمین‌لرزه در جای قهرمان)
export const BOSS_MOVES = {
  slime: [['quake'], ['nova', 'spore']], bat: [['charge'], ['nova', 'shard']], hare: [['charge'], ['quake']],
  spider: [['volley', 'web'], ['quake']], bandit: [['volley', 'arrow'], ['charge']], skeleton: [['volley', 'arrow'], ['quake']],
  ghost: [['nova', 'shard'], ['charge']], imp: [['nova', 'fire'], ['volley', 'fire']], archer: [['volley', 'arrow'], ['nova', 'arrow']],
  wolf: [['charge'], ['quake']], ram: [['charge'], ['quake']], yeti: [['quake'], ['nova', 'shard']],
  mummy: [['quake'], ['volley', 'spore']], golem: [['quake'], ['charge']], zombie: [['quake'], ['nova', 'spore']],
  scorpion: [['charge'], ['volley', 'spore']], shroom: [['nova', 'spore'], ['quake']], lizard: [['volley', 'arrow'], ['charge']],
  knight: [['charge'], ['quake']], demon: [['nova', 'fire'], ['charge'], ['quake']],
};
const TELE = { nova: 0.75, volley: 0.55, charge: 0.7, quake: 0.95 };
const CD = 4.2; // ثانیه بینِ حمله‌های ویژه (فاز ۲: ×۰٫۶)

export function BOSS_AI(m, dt, target, hooks, spd) {
  const B = m._b || (m._b = { cd: 2.2, act: null, t: 0, i: 0, p2: false, rep: 0 });
  if (!B.p2 && m.hp <= m.maxHp * 0.5) { // ---- ورود به فاز ۲ ----
    B.p2 = true; B.act = null; m.tele = null; B.cd = 0.9; m.enraged = true;
    hooks.onPhase && hooks.onPhase(m);
  }
  if (!B.act) {
    B.cd -= dt;
    if (B.cd > 0 || !target || m.state === 'attack') return false; // ماشینِ پایه (ضربه‌ی معمولی) ادامه می‌دهد
    const list = BOSS_MOVES[m.kind] || [['quake']], pool = B.p2 ? list : list.slice(0, 1);
    const mv = pool[B.i++ % pool.length];
    B.act = mv[0]; B.pk = mv[1] || 'fire'; B.t = 0; B.rep = B.p2 ? 1 : 0;
    startTele(m, B, target);
  }
  B.t += dt;
  const tdur = TELE[B.act] * (B.p2 ? 0.85 : 1);
  m.state = 'idle'; m.ph = 0; // ظاهر: ایستاده و در حالِ آماده‌شدن (لرزش در رندر)
  if (B.act === 'charge') return doCharge(m, B, dt, target, hooks, tdur);
  if (B.t < tdur) { if (m.tele) m.tele.k = B.t / tdur; if (B.act === 'volley' && target) aimAt(m, B, target); return true; }
  // ---- اجرای ضربه ----
  if (B.act === 'nova') {
    const n = B.p2 ? 14 : 10, off = B.rep ? Math.PI / n : 0;
    for (let i = 0; i < n; i++) hooks.onProj && hooks.onProj(m, B.pk, off + i * Math.PI * 2 / n, m.dmg * 0.8);
  } else if (B.act === 'volley') {
    const n = B.p2 ? 7 : 5;
    for (let i = 0; i < n; i++) hooks.onProj && hooks.onProj(m, B.pk, B.ang + (i - (n - 1) / 2) * 0.17, m.dmg * 0.75);
  } else if (B.act === 'quake') {
    const T = m.tele; hooks.onQuake && hooks.onQuake(T.x, T.y, T.r);
    if (target && Math.hypot(target.x - T.x, target.y - T.y) < T.r) hooks.onHit && hooks.onHit(m, m.dmg * 1.4);
  }
  if (B.rep > 0) { B.rep--; B.t = tdur * 0.45; if (B.act === 'quake') startTele(m, B, target); return true; } // فاز ۲: موجِ دوم
  endAct(m, B);
  return true;
}

function startTele(m, B, target) {
  if (B.act === 'quake') m.tele = { kind: 'quake', x: target.x, y: target.y, r: m.kind === 'golem' || m.kind === 'yeti' ? 40 : 34, k: 0 };
  else if (B.act === 'charge') { aimAt(m, B, target); m.tele = { kind: 'charge', x: m.x, y: m.y, ang: B.ang, len: 150, k: 0 }; }
  else { if (target) aimAt(m, B, target); m.tele = { kind: B.act, x: m.x, y: m.y, ang: B.ang, k: 0 }; }
}
function aimAt(m, B, target) { B.ang = Math.atan2(target.y - 10 - (m.y - 12), target.x - m.x); m.face = Math.cos(B.ang) >= 0 ? 1 : -1; if (m.tele) m.tele.ang = B.ang; }
function endAct(m, B) { B.act = null; m.tele = null; B.cd = CD * (B.p2 ? 0.6 : 1) * (0.85 + 0.3 * Math.random()); m.coolT = 0.6; m._set('cool'); }

function doCharge(m, B, dt, target, hooks, tdur) {
  if (B.t < tdur) { if (m.tele) { m.tele.k = B.t / tdur; m.tele.x = m.x; m.tele.y = m.y; } return true; }
  if (!B.dash) { B.dash = { t: 0, hit: false }; m.tele = null; }
  const D = B.dash, sp = 230 * (B.p2 ? 1.15 : 1), vx = Math.cos(B.ang) * sp * dt, vy = Math.sin(B.ang) * sp * dt;
  D.t += dt; m.state = 'move'; m.ph = (m.ph + sp * dt / 10) % 1;
  const solid = hooks.solid || (() => false);
  let stop = D.t > 0.62;
  if (!solid(m.x + vx, m.y)) m.x += vx; else stop = true;
  if (!solid(m.x, m.y + vy)) m.y += vy; else stop = true;
  if (!D.hit && target && Math.hypot(target.x - m.x, target.y - m.y) < 18) { D.hit = true; hooks.onHit && hooks.onHit(m, m.dmg * 1.3); }
  if (stop) {
    B.dash = null;
    if (B.rep > 0 && target) { B.rep--; B.t = tdur * 0.4; aimAt(m, B, target); m.tele = { kind: 'charge', x: m.x, y: m.y, ang: B.ang, len: 150, k: 0.4 }; return true; }
    hooks.onQuake && hooks.onQuake(m.x, m.y, 14); // برخورد به دیوار/پایان: گردوخاک
    endAct(m, B);
  }
  return true;
}
