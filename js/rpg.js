// rpg.js — سیستمِ سطح‌بندیِ RPG: XP از شکار/برداشت/طبقه → سطح → ۱ امتیاز در هر سطح (یا خرید با سکه)
// ۴ استاتِ نبرد + ۴ استاتِ کشاورزی. داده در save.rpg (اختیاری — سیوهای قدیمی با ensureRpg پر می‌شوند).
import { getLang, faNum } from './i18n.js';
import { iconEl } from './art/icons.js';

export const STAT_MAX = 25;
// per: اثرِ هر امتیاز
export const STATS = {
  str:    { grp: 'cb', per: 0.06, fa: 'قدرت',       en: 'Strength',     dfa: '+۶٪ آسیب',                den: '+6% damage' },
  vit:    { grp: 'cb', per: 8,    fa: 'بنیه',        en: 'Vitality',     dfa: '+۸ جان حداکثر',            den: '+8 max HP' },
  agi:    { grp: 'cb', per: 0.03, fa: 'چابکی',       en: 'Agility',      dfa: '+۳٪ سرعت حرکت',           den: '+3% move speed' },
  crit:   { grp: 'cb', per: 0.02, fa: 'ضربه‌ی مهلک', en: 'Critical',     dfa: '+۲٪ شانس ضربه‌ی مهلک',   den: '+2% critical hit chance' },
  bounty: { grp: 'fm', per: 0.04, fa: 'برداشت پربار', en: 'Bounty',      dfa: '+۴٪ شانس محصولِ دوبرابر',  den: '+4% double-harvest chance' },
  seeker: { grp: 'fm', per: 0.03, fa: 'بذریابی',      en: 'Seed seeker', dfa: '+۳٪ شانس بذرِ اضافه از هیولا', den: '+3% extra seed drop chance' },
  green:  { grp: 'fm', per: 0.04, fa: 'دستِ سبز',     en: 'Green thumb', dfa: '+۴٪ سرعت رشد',             den: '+4% growth speed' },
  trade:  { grp: 'fm', per: 0.03, fa: 'بازاری',       en: 'Trader',      dfa: '+۳٪ قیمت فروش',            den: '+3% sell price' },
};
export const STAT_KEYS = Object.keys(STATS);

export const xpNeed = (lvl) => Math.round(20 * Math.pow(lvl, 1.5));       // سطح ۱→۲: ۲۰ · ۱۰→۱۱: ۶۳۲
export const pointCost = (bought) => Math.round(250 * Math.pow(1.4, bought)); // خرید امتیاز با سکه

export function ensureRpg(s) {
  if (!s.rpg || typeof s.rpg !== 'object') s.rpg = { lvl: 1, xp: 0, pts: 0, bought: 0, st: {} };
  const r = s.rpg;
  for (const k of ['lvl', 'xp', 'pts', 'bought']) if (!Number.isFinite(r[k]) || r[k] < 0) r[k] = k === 'lvl' ? 1 : 0;
  if (!r.st || typeof r.st !== 'object') r.st = {};
  for (const k of STAT_KEYS) r.st[k] = Math.max(0, Math.min(STAT_MAX, r.st[k] | 0));
  return r;
}
export const stat = (s, k) => (s.rpg && s.rpg.st ? s.rpg.st[k] | 0 : 0);
export const statVal = (s, k) => stat(s, k) * STATS[k].per;   // اثرِ کل

// افزودن XP — خروجی: تعداد سطح‌های گرفته‌شده
export function addXp(s, n) {
  const r = ensureRpg(s); let ups = 0;
  r.xp += Math.max(0, Math.round(n));
  while (r.xp >= xpNeed(r.lvl) && r.lvl < 99) { r.xp -= xpNeed(r.lvl); r.lvl++; r.pts++; ups++; }
  return ups;
}
export function spendPoint(s, k) {
  const r = ensureRpg(s);
  if (!STATS[k] || r.pts <= 0 || r.st[k] >= STAT_MAX) return false;
  r.pts--; r.st[k]++; return true;
}
export function buyPoint(s) {
  const r = ensureRpg(s), c = pointCost(r.bought);
  if (s.coins < c) return false;
  s.coins -= c; r.bought++; r.pts++; return true;
}

// XP‌های بازی (ثابت‌ها اینجا تا تنظیم یک‌جا باشد)
export const XP = { harvest: 2, kill: 4, elite: 10, floor: 8, boss: 60 };
export function runXp(run) {
  return run.kills * XP.kill + (run.eliteKills || 0) * XP.elite + Math.max(0, run.floor - (run.startFloor || 1)) * XP.floor + (run._bossKills || 0) * XP.boss;
}

// اعمال استات‌های نبرد روی یک Run تازه (بعد از new Run)
export function applyRunStats(run, s) {
  const k = 1 + statVal(s, 'str');
  run.baseDmg = Math.round(run.baseDmg * k); run.skillDmg = Math.round(run.skillDmg * k);
  run.maxHp += statVal(s, 'vit'); run.hero.hp = run.maxHp;
  run.speedMul *= 1 + statVal(s, 'agi');
  run.critBonus += statVal(s, 'crit');
  run.seedP = statVal(s, 'seeker');
  run._base = { baseDmg: run.baseDmg, skillDmg: run.skillDmg, speedMul: run.speedMul, critBonus: run.critBonus }; // تلاشِ دوباره: برکت‌ها پاک، استات‌ها می‌مانند
}

// ---------- UI: بخشِ «شخصیت» در منو ----------
const L = (fa, en) => (getLang() === 'fa' ? fa : en);
export function rpgSection(s, list, onChange) {
  const r = ensureRpg(s);
  const head = document.createElement('div');
  head.className = 'mealHead'; head.textContent = L('شخصیت', 'Character');
  list.appendChild(head);
  const card = document.createElement('div');
  card.className = 'rpgCard';
  const need = xpNeed(r.lvl), pct = Math.min(100, Math.round((r.xp / need) * 100));
  card.innerHTML =
    `<div class="rpgTop"><span class="rpgLv">${L('سطح', 'Lv')} ${faNum(r.lvl)}</span>` +
    `<span class="rpgPts${r.pts ? ' has' : ''}">${L('امتیاز آزاد', 'Points')}: ${faNum(r.pts)}</span></div>` +
    `<div class="xpBar"><i style="width:${pct}%"></i><span>${faNum(r.xp)} / ${faNum(need)} XP</span></div>`;
  const buy = document.createElement('button');
  const c = pointCost(r.bought);
  buy.className = 'btn upgBuy rpgBuy' + (s.coins >= c ? ' can' : '');
  buy.innerHTML = `<span>${L('خرید امتیاز', 'Buy point')}</span> <span class="cost">${faNum(c)}</span>`;
  buy.appendChild(iconEl('coin', 14));
  buy.addEventListener('click', () => onChange(buyPoint(s) ? 'buy' : 'nocoin'));
  card.appendChild(buy);
  list.appendChild(card);
  for (const grp of ['cb', 'fm']) {
    const gh = document.createElement('div');
    gh.className = 'rpgGrp'; gh.textContent = grp === 'cb' ? L('نبرد', 'Combat') : L('کشاورزی', 'Farming');
    list.appendChild(gh);
    for (const k of STAT_KEYS) {
      const d = STATS[k]; if (d.grp !== grp) continue;
      const v = r.st[k], full = v >= STAT_MAX;
      const row = document.createElement('div');
      row.className = 'upgRow rpgRow ' + grp;
      row.innerHTML = `<div class="upgInfo"><b>${L(d.fa, d.en)} <span class="rpgV">${faNum(v)}/${faNum(STAT_MAX)}</span></b>` +
        `<small>${L(d.dfa, d.den)} — ${L('فعلی', 'now')}: ${fmtVal(k, v)}</small></div>` +
        `<button class="btn rpgPlus${r.pts > 0 && !full ? ' can' : ''}" ${r.pts > 0 && !full ? '' : 'disabled'} aria-label="+">+</button>`;
      row.querySelector('button').addEventListener('click', () => onChange(spendPoint(s, k) ? 'spend' : 'none'));
      list.appendChild(row);
    }
  }
}
function fmtVal(k, v) {
  const x = v * STATS[k].per;
  return k === 'vit' ? '+' + faNum(x) : '+' + faNum(Math.round(x * 100)) + '٪';
}

// نشانِ سطح در تاپ‌بار (فقط وقتی تغییر کند DOM را لمس می‌کند)
let _last = '';
export function refreshLvChip(s) {
  const r = s.rpg; if (!r) return;
  const key = r.lvl + ':' + r.xp + ':' + r.pts + getLang();
  if (key === _last) return; _last = key;
  const n = document.getElementById('lvN'), f = document.getElementById('xpFill'), ch = document.getElementById('lvChip');
  if (!n || !f) return;
  n.textContent = faNum(r.lvl);
  f.style.width = Math.min(100, Math.round((r.xp / xpNeed(r.lvl)) * 100)) + '%';
  if (ch) ch.classList.toggle('pts', r.pts > 0);
}
