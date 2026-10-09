// boot_check.mjs — بوت واقعی بازی در jsdom + ۱۰ سناریو (نشست S0.2)
// استفاده: bash tools/setup_tests.sh && node tools/boot_check.mjs   →  خروجی: PASS n/10
// اصول: باندل واقعی game.html · Date.now ثابت (seed قطعی) · AudioContext استاب (درس ۸) ·
//        جمع خطای jsdom/window · بستن DOM هر سناریو (بدون نشتی تایمر)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'game.html'), 'utf8');
const FIXED_NOW = 1759000000000; // زمان ثابت → seed دانجن قطعی
const SAVE_KEY = 'farmDungeon.save';
let JSDOM, VirtualConsole;
try {
  const req = createRequire('/tmp/realtest/');
  ({ JSDOM, VirtualConsole } = req('jsdom'));
} catch (e) {
  console.log('FAIL  jsdom نصب نیست — اول: bash tools/setup_tests.sh');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok }); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : '')); }

// ---------- استاب AudioContext: همان سطح API که sfx/engine.js استفاده می‌کند ----------
function installAC(win) {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({
    gain: param(), frequency: param(), Q: param(), detune: param(), pan: param(), playbackRate: param(),
    threshold: param(), ratio: param(), attack: param(), release: param(), knee: param(),
    type: '', buffer: null, loop: false, onended: null,
    connect(n) { return n; }, disconnect() {}, start() {}, stop() {},
  });
  class AC {
    constructor() { this.state = 'running'; this.sampleRate = 44100; this.currentTime = 0; this.destination = node(); }
    createGain() { return node(); }
    createOscillator() { return node(); }
    createBiquadFilter() { return node(); }
    createDynamicsCompressor() { return node(); }
    createStereoPanner() { return node(); }
    createBufferSource() { return node(); }
    createBuffer(ch, len) { return { numberOfChannels: ch, length: len, sampleRate: this.sampleRate, getChannelData: () => new Float32Array(len) }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  win.AudioContext = AC; win.webkitAudioContext = AC;
}

// ---------- بوت ----------
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + ((e && e.message) || e)));
  const dom = new JSDOM(HTML, {
    url: 'http://localhost:8080/game.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.addEventListener('error', (e) => errors.push('error: ' + (e.message || e.error)));
      win.addEventListener('unhandledrejection', (e) => errors.push('reject: ' + e.reason));
      const def = (k, v) => Object.defineProperty(win, k, { value: v, configurable: true, writable: true });
      def('innerWidth', opts.w ?? 1024);
      def('innerHeight', opts.h ?? 768);
      def('devicePixelRatio', opts.dpr ?? 1);
      win.Date.now = () => FIXED_NOW;
      if (opts.noAudio) { def('AudioContext', undefined); def('webkitAudioContext', undefined); } else installAC(win);
      if (opts.save) { try { win.localStorage.setItem(SAVE_KEY, opts.save); } catch (e) { errors.push('save seed: ' + e.message); } }
    },
  });
  return { dom, win: dom.window, errors, close: () => { try { dom.window.close(); } catch (e) {} } };
}
const errText = (r) => r.errors.slice(0, 3).join(' | ');
// روشنایی میانگین فریم (نمونه‌برداری پرشی — سریع)
function grab(win) { const c = win.document.getElementById('game'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; }
function bright(win) { const d = grab(win); let s = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 37) { s += d[i] + d[i + 1] + d[i + 2]; n++; } return s / (n * 3); }
function diffRatio(a, b) { let c = 0, n = 0; for (let i = 0; i < a.length; i += 4 * 37) { n++; if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) c++; } return c / n; }

// ================= ۱۰ سناریو =================
async function s01_boot() {
  const a = boot({ w: 1024, h: 768 });
  await sleep(750);
  const w = a.win, c = w.document.getElementById('game');
  const br = bright(w);
  const ok = a.errors.length === 0 && !!w.__app && !!w.__farm && w.__getRun() === null
    && c.width === 1024 && c.height === 768 && w.__getFade() === 1
    && w.document.getElementById('coinN').textContent === '۶۰' && br > 10;
  const d1 = `canvas=${c.width}×${c.height} fade=${w.__getFade()} coins=${w.document.getElementById('coinN').textContent} bright=${br.toFixed(0)} errors=${a.errors.length}${a.errors.length ? ' [' + errText(a) + ']' : ''}`;
  const b = boot({ w: 800, h: 600, noAudio: true }); // بدون WebAudio (null-گارد موتور صدا — درس ۸)
  await sleep(500);
  const ok2 = b.errors.length === 0 && !!b.win.__app;
  a.close(); b.close();
  return [ok && ok2, d1 + ` · بدون WebAudio: errors=${b.errors.length}${b.errors.length ? ' [' + errText(b) + ']' : ''}`];
}

async function s02_gate() {
  const a = boot({});
  await sleep(700);
  const w = a.win;
  w.__farm.onGate();
  await sleep(1000);
  const r = w.__getRun();
  const inD = w.document.body.classList.contains('inDungeon');
  const walk = r ? r.dungeon.walkable(Math.floor(r.hero.x / 16), Math.floor(r.hero.y / 16)) : false;
  const ok = a.errors.length === 0 && !!r && inD && r.floor === 1 && r.hero.hp === r.maxHp && walk && bright(w) > 8;
  const detail = r ? `floor=${r.floor} hp=${r.hero.hp}/${r.maxHp} enemies=${r.dungeon.enemies.length} bright=${bright(w).toFixed(0)}` : 'run=null';
  a.close();
  return [ok, detail];
}

async function s03_floors() {
  const a = boot({});
  await sleep(700);
  const w = a.win;
  w.__farm.onGate();
  await sleep(1000);
  const res = w.eval(`(() => {
    const r = window.__getRun(); let bad = [], themes = {};
    for (let f = 1; f <= 16; f++) {
      r.loadFloor(f);
      const t = Math.floor((f - 1) / 5) % 4;
      themes[f] = r.dungeon.theme;
      if (r.dungeon.theme !== t) bad.push('theme f' + f + '=' + r.dungeon.theme + '≠' + t);
      const hx = Math.floor(r.hero.x / 16), hy = Math.floor(r.hero.y / 16);
      if (!r.dungeon.walkable(hx, hy)) bad.push('spawn-wall f' + f);
      if (!r.dungeon.enemies.length) bad.push('no-enemy f' + f);
      if (f % 10 === 0 && !r.dungeon.enemies.some(e => e.isBoss)) bad.push('no-boss f' + f);
    }
    r.loadFloor(6);
    return { bad, theme6: themes[6], theme11: themes[11], theme16: themes[16], theme1: themes[1], f: r.floor };
  })()`);
  const ok = a.errors.length === 0 && res.bad.length === 0 && res.f === 6;
  a.close();
  return [ok, res.bad.length ? res.bad.slice(0, 3).join(' | ') : '16 طبقه + تم‌های ' + [res.theme1, res.theme6, res.theme11, res.theme16].join('/') + ' + اسپاون/دشمن/باس سالم'];
}

async function s04_death() {
  const a = boot({});
  await sleep(700);
  const w = a.win, app = w.__app;
  w.__farm.onGate();
  await sleep(1000);
  const d0 = app.s.stats.deaths;
  w.eval(`(() => { const r = window.__getRun(); r.hero.iframe = 0; r._hooks.onHit({ kind: 'bat', x: r.hero.x, y: r.hero.y, dmg: 1e9 }, 1e9); return r.hero.dead; })()`);
  await sleep(500);
  const r = w.__getRun();
  const shown = w.document.getElementById('dead').classList.contains('show');
  const info = w.document.getElementById('deadInfo').textContent || '';
  const ok = a.errors.length === 0 && r && r.hero.dead === true && shown && app.s.stats.deaths === d0 + 1 && info.length > 4;
  a.close();
  return [ok, `dead=${r && r.hero.dead} overlay=${shown} deaths=${app.s.stats.deaths} info="${info.slice(0, 24)}"`];
}

async function s05_exit() {
  const a = boot({});
  await sleep(700);
  const w = a.win;
  w.__farm.onGate();
  await sleep(1000);
  w.document.getElementById('exitD').click(); // خروج از دانجن (گذار ~۰٫۴۴ث + حلقه)
  await sleep(1100);
  const run = w.__getRun();
  const inD = w.document.body.classList.contains('inDungeon');
  const deadShown = w.document.getElementById('dead').classList.contains('show');
  const fade = w.__getFade();
  const br = bright(w);
  const ok = a.errors.length === 0 && run === null && !inD && !deadShown && fade === 1 && br > 10;
  const dead2 = w.document.getElementById('dead').className;
  a.close();
  return [ok, `run=${run} inDungeon=${inD} overlay="${dead2}" fade=${fade} bright=${br.toFixed(0)} errors=${a.errors.length}`];
}

async function s06_save() {
  const a = boot({});
  await sleep(700);
  const w = a.win;
  w.__app.s.coins = 777;
  w.eval(`(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
  await sleep(200);
  const raw = w.localStorage.getItem(SAVE_KEY) || '';
  let obj = null; try { obj = JSON.parse(raw); } catch (e) {}
  const b = boot({ save: raw });
  await sleep(750);
  const coins2 = b.win.__app ? b.win.__app.s.coins : -1;
  const ok = a.errors.length === 0 && b.errors.length === 0 && !!obj && obj.v === 6 && obj.coins === 777 && coins2 === 777;
  a.close(); b.close();
  return [ok, `save.v=${obj && obj.v} coins=${obj && obj.coins} → boot2 coins=${coins2} (schema v6)`];
}

async function s07_lang() {
  const a = boot({});
  await sleep(700);
  const w = a.win;
  const before = w.document.querySelector('[data-i18n="sellAll"]').textContent;
  w.document.getElementById('lang').click();
  await sleep(200);
  const after = w.document.querySelector('[data-i18n="sellAll"]').textContent;
  w.eval(`(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
  await sleep(150);
  const saved = JSON.parse(w.localStorage.getItem(SAVE_KEY) || '{}');
  w.document.getElementById('lang').click();
  await sleep(200);
  const back = w.document.querySelector('[data-i18n="sellAll"]').textContent;
  const ok = a.errors.length === 0 && before === 'فروش به تاجر' && after === 'Sell to merchant' && back === 'فروش به تاجر' && saved.lang === 'en';
  a.close();
  return [ok, `fa→"${after}"→"${back}" · save.lang=${saved.lang}`];
}

async function s08_zero() {
  const a = boot({});
  await sleep(700);
  const w = a.win, c = w.document.getElementById('game');
  const sz0 = [c.width, c.height];
  w.innerWidth = 0; w.innerHeight = 0;
  w.dispatchEvent(new w.Event('resize'));
  await sleep(200);
  const e1 = a.errors.length;
  w.innerWidth = 800; w.innerHeight = 600;
  w.dispatchEvent(new w.Event('resize'));
  await sleep(400);
  const ok = e1 === 0 && a.errors.length === 0 && c.width === 800 && c.height === 600 && bright(w) > 10;
  a.close();
  return [ok, `0×0 بدون خطا → بازگشت به ${c.width}×${c.height} (بود ${sz0.join('×')})`];
}

async function s09_mobile() {
  const a = boot({ w: 390, h: 844, dpr: 2 });
  await sleep(800);
  const w = a.win, c = w.document.getElementById('game');
  const a2 = boot({ w: 320, h: 480, dpr: 3 });
  await sleep(500);
  const c2 = a2.win.document.getElementById('game');
  const ok = a.errors.length === 0 && a2.errors.length === 0 && c.width === 780 && c.height === 1688 && c2.width === 960 && c2.height === 1440 && bright(w) > 10;
  a.close(); a2.close();
  return [ok, `390×844@2 → ${c.width}×${c.height} · 320×480@3 → ${c2.width}×${c2.height}`];
}

async function s10_night_rain() {
  const a = boot({});
  await sleep(750);
  const w = a.win;
  w.__farm.dayT = 0; // ظهر کامل (n=0)
  await sleep(250);
  const day = bright(w);
  const f1 = grab(w);
  await sleep(70);
  const calmDay = diffRatio(f1, grab(w));
  w.__farm.dayT = 2220; // شب (n=0.87) + باران (2220%600=420 ∈ [400,475))
  await sleep(400);
  const night = bright(w);
  const r1 = grab(w);
  await sleep(70);
  const calmRain = diffRatio(r1, grab(w));
  const ok = a.errors.length === 0 && night < day * 0.8 && calmRain <= 0.03 && calmDay <= 0.03;
  a.close();
  return [ok, `روشنایی روز=${day.toFixed(0)} شب+باران=${night.toFixed(0)} (${Math.round(night / day * 100)}%) · تغییر پیکسل/فریم روز=${(calmDay * 100).toFixed(2)}% باران=${(calmRain * 100).toFixed(2)}% (بودجه ۳٪)`];
}

const SCENARIOS = [
  ['بوت مزرعه (باندل، fade-in، HUD، بدون AC)', s01_boot],
  ['ورود دانجن با onGate (گذار + اسپاون سالم)', s02_gate],
  ['۱۶ طبقه + ۴ تم + اسپاون/دشمن/باس (باس هر ۱۰)', s03_floors],
  ['مرگ تستی (_hooks.onHit + overlay)', s04_death],
  ['خروج #exitD → بازگشت مزرعه', s05_exit],
  ['سیو/لود (v6، visibilitychange، بوت دوم)', s06_save],
  ['تغییر زبان fa⇄en + سیو زبان', s07_lang],
  ['resize صفر (گارد innerWidth<2) → بازگشت', s08_zero],
  ['موبایل ۳۹۰×۸۴۴@2 و ۳۲۰×۴۸۰@3', s09_mobile],
  ['شب+باران (تینت + بودجه‌ی آرامش بصری)', s10_night_rain],
];

const t0 = Date.now();
for (const [name, fn] of SCENARIOS) {
  let ok = false, detail = '';
  try { const r = await fn(); ok = r[0]; detail = r[1] || ''; }
  catch (e) { ok = false; detail = 'EXCEPTION: ' + (e && e.message); }
  check(name, ok, detail);
}
const pass = results.filter((r) => r.ok).length;
console.log(`\nPASS ${pass}/${results.length}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exitCode = pass === results.length ? 0 : 1;
