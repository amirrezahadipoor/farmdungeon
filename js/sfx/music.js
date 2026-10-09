// sfx/music.js — ن۱۵۰ (N5): موسیقیِ پیکسلیِ رویه‌ای (چیپ‌تیون) — سه قطعه: مزرعه / دانجن / باس.
// زمان‌بندِ پیش‌نگر (lookahead): هر ۲۵ms نت‌های ۰٫۱۵ثِ آینده را با WebAudio می‌چیند؛ بدون فایلِ خارجی.
// صداها: لیدِ مربعیِ نرم (فیلترشده)، بیسِ مثلثی، هایهتِ نویز (کوتاه). از خروجیِ استاد (sfxOut) ⇒ بی‌صدا/حجم رعایت می‌شود.
import { ac, sfxOut, armed } from './engine.js';

// نت‌ها به‌صورتِ نیم‌پرده از A4 (۰ = 440Hz)؛ null = سکوت. هر خانه = یک هشتم.
const _ = null;
const SONGS = {
  farm: { bpm: 100, vol: 0.05, // ماژورِ شاد (C)، ۴ میزان × ۸
    lead: [3, _, 7, 10, 12, _, 10, 7, 5, _, 8, 12, 15, _, 12, _, 3, 5, 7, _, 10, 7, 5, 3, 2, _, 3, 5, 3, _, _, _],
    bass: [-21, _, -14, _, -21, _, -14, _, -16, _, -9, _, -16, _, -9, _, -19, _, -12, _, -19, _, -12, _, -14, _, -7, _, -21, _, -14, _],
    hat: '..x...x...x...x...x...x...x.x.x.' },
  dungeon: { bpm: 84, vol: 0.045, // لا مینورِ تاریک و آهسته
    lead: [0, _, _, 3, 7, _, 5, _, 3, _, 2, _, 0, _, _, _, -2, _, 0, 3, 2, _, -2, _, -5, _, _, _, -4, _, _, _],
    bass: [-24, _, _, _, -24, _, -17, _, -26, _, _, _, -26, _, -19, _, -28, _, _, _, -28, _, -21, _, -29, _, -24, _, -25, _, _, _],
    hat: '....x.......x.......x.......x...' },
  boss: { bpm: 150, vol: 0.055, // ضربِ تند، کروماتیک
    lead: [12, 12, 11, 12, 15, _, 12, _, 10, 10, 9, 10, 14, _, 10, _, 8, 8, 7, 8, 12, _, 15, 14, 12, _, 11, _, 12, _, 16, 15],
    bass: [-24, -12, -24, -12, -24, -12, -24, -12, -26, -14, -26, -14, -26, -14, -26, -14, -28, -16, -28, -16, -28, -16, -28, -16, -25, -13, -25, -13, -23, -11, -23, -11],
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.x.xxxxxx' },
};
const hz = (n) => 440 * Math.pow(2, n / 12);
let _kind = null, _bus = null, _step = 0, _next = 0, _timer = null, _nbuf = null;

function voice(c, type, f, t0, dur, peak, cut) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
  let tail = g;
  if (cut) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; o.connect(lp); lp.connect(g); } else o.connect(g);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + 0.008); g.gain.setValueAtTime(peak * 0.7, t0 + dur * 0.5); g.gain.linearRampToValueAtTime(0, t0 + dur);
  tail.connect(_bus); o.start(t0); o.stop(t0 + dur + 0.02);
}
function hat(c, t0, peak) {
  if (!_nbuf) { _nbuf = c.createBuffer(1, c.sampleRate * 0.05 | 0, c.sampleRate); const d = _nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); s.buffer = _nbuf; hp.type = 'highpass'; hp.frequency.value = 5000;
  g.gain.setValueAtTime(peak, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.04); s.connect(hp); hp.connect(g); g.connect(_bus); s.start(t0); s.stop(t0 + 0.05);
}
function tick() {
  const c = ac(); if (!c || !_kind || !_bus) return;
  const S = SONGS[_kind], e = 60 / S.bpm / 2; // هشتم
  if (_next < c.currentTime) _next = c.currentTime + 0.05;
  while (_next < c.currentTime + 0.15) {
    const i = _step % 32, L = S.lead[i], B = S.bass[i];
    if (L !== null) voice(c, 'square', hz(L), _next, e * 0.9, S.vol, 1800);
    if (B !== null) voice(c, 'triangle', hz(B), _next, e * 0.95, S.vol * 1.6, 0);
    if (S.hat[i] === 'x') hat(c, _next, S.vol * 0.5);
    _next += e; _step++;
  }
}
// setMusic('farm' | 'dungeon' | 'boss' | null) — تغییرِ قطعه با محو‌شدنِ نرم
export function setMusic(kind) {
  if (kind === _kind) return; const c = ac(); _kind = kind || null;
  if (!c || !sfxOut() || !armed()) { _kind = null; return; } // پیش از لمسِ کاربر صدا نداریم ⇒ دفعه‌ی بعد دوباره امتحان می‌شود
  if (_bus) { const old = _bus; old.gain.setValueAtTime(old.gain.value, c.currentTime); old.gain.linearRampToValueAtTime(0, c.currentTime + 0.6); setTimeout(() => { try { old.disconnect(); } catch (e) { /* */ } }, 800); _bus = null; }
  if (!_kind) { if (_timer) { clearInterval(_timer); _timer = null; } return; }
  _bus = c.createGain(); _bus.gain.setValueAtTime(0, c.currentTime); _bus.gain.linearRampToValueAtTime(1, c.currentTime + 1.2); _bus.connect(sfxOut());
  _step = 0; _next = c.currentTime + 0.1;
  if (!_timer) _timer = setInterval(tick, 25);
}
export function musicKind() { return _kind; }
export const _songs = SONGS; // برای تست
