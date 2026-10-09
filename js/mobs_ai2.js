// mobs_ai2.js — ن۱۴۹ (N2): رفتارِ متفاوت برای ۱۵ خانواده‌ای که هنوز ماشینِ پایه داشتند.
// قرارداد مثل mobs_new: AI2[kind](m, dt, target, hooks, s, spd) → true = «حرکتِ این فریم را من انجام دادم».
// false یعنی ماشینِ پایه ادامه دهد (ضربه‌ی نزدیک، cool، idle) — پس انیمیشن‌های attack/move همان قبلی می‌مانند.
// هوک‌ها: solid · onProj(from, kind, ang, dmg) · onHit(from, dmg)
const busy = (m) => m.state === 'attack' || m.state === 'cool';
function step(m, ux, uy, sp, dt, hooks, ghost = false) { // حرکت با سر خوردن روی دیوار؛ روح از دیوار رد می‌شود
  const solid = ghost ? () => false : (hooks.solid || (() => false)), ox = m.x, oy = m.y;
  const nx = m.x + ux * sp * dt, ny = m.y + uy * sp * dt;
  if (!solid(nx, m.y)) m.x = nx; if (!solid(m.x, ny)) m.y = ny;
  const mv = Math.hypot(m.x - ox, m.y - oy); if (Math.abs(ux) > 0.1) m.face = ux > 0 ? 1 : -1;
  return mv;
}
function walk(m, mv, s) { m.state = 'move'; m.ph = (m.ph + mv / s.stride) % 1; }
const vec = (m, t) => { const dx = t.x - m.x, dy = t.y - m.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d, d]; };
const shoot = (m, hooks, kind, t, k = 0.7, spread = 0) => hooks.onProj && hooks.onProj(m, kind, Math.atan2(t.y - 10 - (m.y - 8), t.x - m.x) + spread, m.dmg * k);

// لجن: جهش‌های کوتاه با مکث (فشرده‌شدن → پرش)
function slime(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [ux, uy, d] = vec(m, t); if (d <= s.range) return false;
  m._c = (m._c || 0) + dt; const c = m._c % 0.9;
  if (c < 0.35) { m.state = 'idle'; m.t += dt; return true; } // جمع شدن
  walk(m, step(m, ux, uy, spd * 2.1, dt, hooks), s); return true;
}
// خفاش: پروازِ موجی + شیرجه‌ی سریع و عقب‌نشینی
function bat(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; m._c = (m._c || 0) + dt; const [ux, uy, d] = vec(m, t);
  if (m._dive > 0) { m._dive -= dt; walk(m, step(m, ux, uy, spd * 2.6, dt, hooks), s); if (d <= s.range) { m._dive = 0; return false; } return true; }
  if (m._back > 0) { m._back -= dt; walk(m, step(m, -ux, -uy, spd * 1.2, dt, hooks), s); return true; }
  if (d < 70 && m._c > 1.6) { m._c = 0; m._dive = 0.6; m._back = 0; return true; }
  const w = Math.sin(m.time * 5) * 0.9; walk(m, step(m, ux - uy * w, uy + ux * w, spd * 0.8, dt, hooks), s);
  if (d <= s.range) { m._back = 0.5; return false; } return true;
}
// عنکبوت: فاصله می‌گیرد و تار پرتاب می‌کند (کندی)، نزدیک = نیش
function spider(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [ux, uy, d] = vec(m, t); m._c = (m._c || 0) - dt;
  if (d <= s.range) return false;
  if (d < 90 && m._c <= 0) { m._c = 3.2; shoot(m, hooks, 'web', t, 0.4); m.state = 'idle'; return true; }
  const side = d < 50 ? -0.6 : 1; walk(m, step(m, ux * side - uy * 0.5, uy * side + ux * 0.5, spd, dt, hooks), s); return true;
}
// اسکلت: از فاصله‌ی متوسط استخوان پرت می‌کند، بعد نزدیک می‌شود
function skeleton(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [ux, uy, d] = vec(m, t); m._c = (m._c || 1) - dt;
  if (d > s.range && d < 100 && m._c <= 0) { m._c = 2.8; shoot(m, hooks, 'shard', t, 0.6); m.state = 'idle'; return true; }
  return false;
}
// روح: از دیوار رد می‌شود، دور که باشد محو است، گاهی کنارِ قهرمان ظاهر می‌شود
function ghost(m, dt, t, hooks, s, spd) {
  if (!t) return false; const [ux, uy, d] = vec(m, t); m.alpha = d > 60 ? 0.45 : 1; m._c = (m._c || 2) - dt; if (m._hx === undefined) { m._hx = m.x; m._hy = m.y; } // ن۱۵۰: باسِ روح در میدانش می‌ماند
  if (busy(m)) return false;
  if (m._c <= 0 && d > 50 && d < 140) { m._c = 4.5; const a = Math.random() * 6.283; const nx = t.x + Math.cos(a) * 26, ny = t.y + Math.sin(a) * 18; if (!(hooks.solid || (() => false))(nx, ny) && (!m.lord || Math.hypot(nx - m._hx, ny - m._hy) < 110)) { m.x = nx; m.y = ny; m.flash = 0.2; } return true; }
  if (d <= s.range) return false;
  walk(m, step(m, ux, uy, spd, dt, hooks, !m.lord), s); return true;
}
// گرگ: دورِ قهرمان می‌چرخد (گله‌ای) و ناگهان می‌پرد
function wolf(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [ux, uy, d] = vec(m, t); m._c = (m._c || Math.random() * 2) + dt;
  if (m._lunge > 0) { m._lunge -= dt; walk(m, step(m, ux, uy, spd * 2.8, dt, hooks), s); if (d <= s.range + 4) { m._lunge = 0; return false; } return true; }
  if (d < 60 && m._c > 2.2) { m._c = 0; m._lunge = 0.45; return true; }
  const dir = (m._dir || (m._dir = Math.random() < 0.5 ? 1 : -1)), want = d > 46 ? 0.8 : -0.3;
  walk(m, step(m, ux * want - uy * dir, uy * want + ux * dir, spd * 1.05, dt, hooks), s); return true;
}
// مومیایی: کند ولی بُردِ چنگِ بلند؛ ضربه کند می‌کند (run.onHit)
function mummy(m, dt, t, hooks, s, spd) { if (!t || busy(m)) return false; const [, , d] = vec(m, t); if (d <= s.range + 8) { m._set('attack'); return true; } return false; }
// غول: کوبشِ زمین با هشدار (دایره‌ی کوچک) به‌جای ضربه‌ی معمولی، گاه‌به‌گاه
function golem(m, dt, t, hooks, s, spd) {
  if (m._slam) { const S = m._slam; S.t += dt; m.state = 'idle'; m.tele = { kind: 'quake', x: S.x, y: S.y, r: 24, k: S.t / 0.9 };
    if (S.t >= 0.9) { m.tele = null; m._slam = null; if (t && Math.hypot(t.x - S.x, t.y - S.y) < 24) hooks.onHit && hooks.onHit(m, m.dmg * 1.2); hooks.onQuake && hooks.onQuake(S.x, S.y, 24); m.coolT = 1.2; m._set('cool'); }
    return true; }
  if (!t || busy(m)) return false; const [, , d] = vec(m, t); m._c = (m._c || 1.5) - dt;
  if (d < 46 && m._c <= 0) { m._c = 4; m._slam = { x: t.x, y: t.y, t: 0 }; return true; } return false;
}
// زامبی: لنگان؛ نزدیکِ قهرمان ناگهان تند می‌شود
function zombie(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [ux, uy, d] = vec(m, t); if (d <= s.range) return false;
  const lurch = 0.55 + 0.45 * Math.max(0, Math.sin(m.time * 3)), rush = d < 48 ? 2 : 1;
  walk(m, step(m, ux, uy, spd * lurch * rush, dt, hooks), s); return true;
}
// عقرب: زیگزاگِ سریع؛ نیش سم دارد (run.onHit)
function scorpion(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [ux, uy, d] = vec(m, t); if (d <= s.range) return false;
  const z = Math.sign(Math.sin(m.time * 4)) * 0.8; walk(m, step(m, ux - uy * z, uy + ux * z, spd, dt, hooks), s); return true;
}
// قارچ: آرام؛ وقتی قهرمان نزدیک است ابرِ هاگ (۶ گوی) پخش می‌کند
function shroom(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [, , d] = vec(m, t); m._c = (m._c || 1) - dt;
  if (d < 64 && m._c <= 0) { m._c = 3.4; for (let i = 0; i < 6; i++) hooks.onProj && hooks.onProj(m, 'spore', i * 1.047 + m.time, m.dmg * 0.5); m.flash = 0.15; return true; }
  return false;
}
// مارمولک: بزن و دررو — بعد از هر ضربه عقب می‌پرد
function lizard(m, dt, t, hooks, s, spd) {
  if (!t) return false; const [ux, uy, d] = vec(m, t);
  if (m.state === 'cool' && !m._hop) m._hop = 0.35;
  if (m._hop > 0) { m._hop -= dt; walk(m, step(m, -ux, -uy, spd * 2.4, dt, hooks), s); if (m._hop <= 0) m._hop = 0; return true; }
  if (busy(m)) return false; if (m.state !== 'cool') m._hop = 0; return false;
}
// شوالیه: سپر — از روبه‌رو آسیبِ کمتر (Monster.hurt) + ضربه‌ی سپر (هل‌دادن کوتاه)
function knight(m, dt, t, hooks, s, spd) {
  m.guard = !busy(m); if (!t || busy(m)) return false; const [ux, uy, d] = vec(m, t); m._c = (m._c || 2) - dt;
  if (m._bash > 0) { m._bash -= dt; walk(m, step(m, ux, uy, spd * 3, dt, hooks), s); if (d <= s.range) { m._bash = 0; return false; } return true; }
  if (d < 70 && d > s.range && m._c <= 0) { m._c = 3.5; m._bash = 0.35; return true; } return false;
}
// اهریمن: پرش (چشمک) به کنارِ قهرمان + گوی آتش از دور
function demon(m, dt, t, hooks, s, spd) {
  if (!t || busy(m)) return false; const [, , d] = vec(m, t); m._c = (m._c || 1.5) - dt; m._f = (m._f || 2) - dt;
  if (m._c <= 0 && d > 40 && d < 120) { m._c = 3.8; const a = Math.random() * 6.283, nx = t.x + Math.cos(a) * 20, ny = t.y + Math.sin(a) * 14;
    if (!(hooks.solid || (() => false))(nx, ny)) { hooks.onQuake && hooks.onQuake(m.x, m.y, 10); m.x = nx; m.y = ny; m.flash = 0.25; } return true; }
  if (m._f <= 0 && d > s.range && d < 110) { m._f = 2.6; shoot(m, hooks, 'fire', t, 0.7); return true; }
  return false;
}
export const AI2 = { slime, bat, spider, skeleton, ghost, wolf, mummy, golem, zombie, scorpion, shroom, lizard, knight, demon };
