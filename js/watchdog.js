// watchdog.js — S10.1: تله‌ی قفل/خطا (کم‌هزینه، بدون اثر روی فریم)
// · ضربانِ rAF: حلقه‌ی اصلی هر فریم wdBeat() را صدا می‌زند (فقط یک انتساب) — پایشِ ۱ث‌ای با setInterval
// · اگر فاصله‌ی فریم > ۲ث (و تب پنهان نبود) یا window.onerror / unhandledrejection ⇒
//   رینگِ ۴۰تاییِ آخرین رویدادها در localStorage با کلیدِ جدا (fd_watchdog) + نوارِ قرمزِ «ریست پیشنهادی» با «ادامه از مزرعه»
// رینگ از پیش تخصیص‌یافته است (۴۰ شیء ثابت) ⇒ ثبت در حلقه صفر تخصیص.
export const WD_KEY = 'fd_watchdog';
const N = 40, GAP_MS = 2000;
const RING = Array.from({ length: N }, () => ({ t: 0, k: '', scene: '', floor: 0, input: '', dt: 0, ents: 0, shrine: 0, fade: 0, msg: '' }));
let head = 0, count = 0, lastBeat = 0, lastSample = 0, tripped = false, getState = null, onRecover = null, lastInput = '';
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function push(k, msg = '') {
  const e = RING[head]; head = (head + 1) % N; if (count < N) count++;
  const s = getState ? getState() : null;
  e.t = Math.round(now()); e.k = k; e.msg = String(msg).slice(0, 300); e.input = lastInput;
  e.scene = s ? s.scene : ''; e.floor = s ? s.floor : 0; e.dt = s ? Math.round(s.dt * 1000) : 0;
  e.ents = s ? s.ents : 0; e.shrine = s && s.shrine ? 1 : 0; e.fade = s ? s.fade : 0;
}
export function wdEvent(k, msg) { push(k, msg); }
export function wdInput(kind) { lastInput = kind; }
// هر فریم: فقط زمان؛ هر ~۰٫۵ث یک نمونه در رینگ
export function wdBeat() {
  lastBeat = now();
  if (lastBeat - lastSample > 500) { lastSample = lastBeat; push('frame'); }
}
export function wdDump() { const out = []; for (let i = 0; i < count; i++) out.push({ ...RING[(head - count + i + N) % N] }); return out; }

function persist(reason) {
  try { localStorage.setItem(WD_KEY, JSON.stringify({ reason, at: new Date().toISOString(), ua: navigator.userAgent, events: wdDump() })); } catch (e) { /* سهمیه/حالتِ خصوصی */ }
}
function bar(reason) {
  if (typeof document === 'undefined' || document.getElementById('wdBar')) return;
  const fa = (document.documentElement.lang || 'fa') === 'fa';
  const el = document.createElement('div');
  el.id = 'wdBar';
  el.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:999;background:#8a2f2f;color:#fff;border:2px solid #c94f4f;border-radius:8px;padding:8px 10px;display:flex;gap:8px;align-items:center;font:13px sans-serif;direction:' + (fa ? 'rtl' : 'ltr');
  const tx = document.createElement('span'); tx.style.flex = '1';
  tx.textContent = (fa ? 'بازی گیر کرد — ریست پیشنهادی' : 'Game stalled — reset suggested') + ' (' + reason + ')';
  const go = document.createElement('button');
  go.textContent = fa ? 'ادامه از مزرعه' : 'Continue from farm';
  go.style.cssText = 'min-height:48px;min-width:48px;padding:0 12px;background:#f2efe4;color:#2f353f;border:0;border-radius:6px;font-weight:700';
  go.addEventListener('click', () => { if (onRecover) onRecover(); });
  const x = document.createElement('button');
  x.textContent = '×'; x.style.cssText = 'min-height:48px;min-width:48px;background:transparent;color:#fff;border:0;font-size:20px';
  x.addEventListener('click', () => { el.remove(); tripped = false; });
  el.append(tx, go, x);
  document.body.appendChild(el);
}
function trip(reason, msg) {
  push(reason, msg);
  if (tripped) return;
  tripped = true;
  persist(reason + (msg ? ': ' + String(msg).slice(0, 120) : ''));
  bar(reason);
}
export function wdError(err) { trip('error', err && (err.stack || err.message) || err); }

// opts: { getState: () => ({scene, floor, dt, ents, shrine, fade}), onRecover: () => void }
export function initWatchdog(opts) {
  getState = opts.getState; onRecover = opts.onRecover;
  lastBeat = now();
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => trip('error', e.message + ' @' + (e.filename || '') + ':' + (e.lineno || 0)));
  window.addEventListener('unhandledrejection', (e) => trip('reject', e.reason && (e.reason.stack || e.reason.message) || e.reason));
  document.addEventListener('visibilitychange', () => { lastBeat = now(); push(document.hidden ? 'hidden' : 'visible'); });
  addEventListener('resize', () => push('resize'));
  setInterval(() => {
    if (document.hidden) { lastBeat = now(); return; } // تبِ پنهان: rAF عمداً می‌ایستد — قفل نیست
    const gap = now() - lastBeat;
    if (gap > GAP_MS) trip('stall', Math.round(gap) + 'ms');
  }, 1000);
}
