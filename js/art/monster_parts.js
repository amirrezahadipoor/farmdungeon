// monster_parts.js — اجزای مشترک هیولاها: پالت، آینه‌ی جهت، فاز wind-up،
// انواع و رنگ‌های مرگ + نشان نخبه — جداسازی از monsters.js (ن۳۰)
import { ease } from '../skeleton.js';
import { rp } from './ramps.js'; // S1.5a: رنگ هیولاها از رمپ (منبع واحد)

export const MSPR = 128;
export const MOX = 64, MOY = 100; // مبدأ: کف، وسط (نام یکتا در باندل — قهرمان OX/OY خودش را دارد)

// پالت ثابت هیولاها
const P = {
  slime:'#7cc069', slimeHi:'#a5dd8f', slimeSh:'#4f8f45', slimeOut:'#2c5e28',
  bat:'#6b5b9e', batHi:'#8a7bc0', batSh:'#4a3f73', batOut:'#241d3d', eyeRed:'#e06c6c', fang:'#f2efe4',
  wolf:'#c98a4b', wolfHi:'#e2ab6d', wolfSh:'#8f5e2f', wolfOut:'#4e3218', wolfDark:'#6b4523',
  bone:'#e8e4d8', boneHi:'#f7f4ea', boneSh:'#b5b0a0', boneOut:'#5a5648', rust:'#8a6a4a',
  golem:'#8d8d99', golemHi:'#a9a9b6', golemSh:'#62626e', golemOut:'#33333c', moss:'#4f7a3f', ember:'#e08a4a',
  spider:'#443d5c', spiderHi:'#5c5478', spiderSh:'#2c2740', spiderOut:'#191528',
  ghost:'#bfe3ef', ghostHi:'#e6f6fc', ghostSh:'#7fb5c9', ghostOut:'#4a7488',
  boss:'#7a7466', bossHi:'#98917f', bossSh:'#565045', bossOut:'#2a2722', bossRed:'#c94f4f', bossGold:'#e6c74a',
  // ن۴۴ — هیولاهای جدید
  mummy:'#d8cba8', mummyHi:'#efe6cc', mummySh:'#a89a76', mummyOut:'#57503a',
  archerBow:'#8a6a3a', archerBowHi:'#b09058',
  ram:'#cfd2d8', ramHi:'#eef0f4', ramSh:'#9ba0ac', ramOut:'#4a4e5a', ramHorn:'#e8d8a8', ramHornSh:'#b09a6a',
  yeti:'#e8ecf2', yetiSh:'#b8c2d4', yetiOut:'#5a6478', yetiSkin:'#c8908a',
  imp:'#e08a4a', impHi:'#ffc36a', impSh:'#b05426', impOut:'#5e2c12',
  bandit:'#4e4662', banditHi:'#6a5f84', banditSh:'#37314a', banditOut:'#1d1a2a',
  hare:'#c9b8a0', hareHi:'#e4d7c2', hareSh:'#a08d74', hareOut:'#57493a', hareIn:'#e8a8b8',
  white:'#f4f6ff', dark:'#141021', dust:'#b9ac8c',
};
export const MC = {};
for (const k in P) MC[k] = [parseInt(P[k].slice(1, 3), 16), parseInt(P[k].slice(3, 5), 16), parseInt(P[k].slice(5, 7), 16), 255];
MC.archerHi = MC.boneHi; MC.archer = MC.bone; // کماندار: پالت اسکلت (rim/outline هم‌رنگ)

// ---------- S1.5a: ۷ موب کلاسیک ← رمپ (منبع واحد) ----------
// هدف خوانایی M1 (کفِ دانجن L≈۵۸): یا روشن (avg ≥ ۸۳) یا تیره (avg ≤ ۳۳) — نه خاکستریِ میانه.
// رنگ‌های «میانی» تازه (slimeMid/batMid/wolfMid/boneMid/golemMid/spiderMid/ghostMid) عمق بافت را می‌سازند.
const PM_W = [242, 239, 228, 255];  // سفید گرم (رنگ ویژه‌ی پالت)
const MC_RAMP = {
  slime: ['leaf', 6], slimeHi: ['__w', 0], slimeSh: ['leaf', 5], slimeMid: ['leaf', 4], slimeDeep: ['leaf', 2], slimeDark: ['leaf', 3], slimeEdge: ['leaf', 0], slimeOut: ['leaf', 1],
  bat: ['clothPurple', 1], batHi: ['clothPurple', 2], batMid: ['clothPurple', 3], batDeep: ['ink', 1], batEdge: ['ink', 3], batSh: ['ink', 2], batOut: ['ink', 0],
  wolf: ['__w', 0], wolfHi: ['__w', 0], wolfMid: ['bone', 5], wolfSh: ['bone', 6], wolfDeep: ['bone', 4], wolfDark: ['bone', 3], wolfOut: ['ink', 1], wolfCream: ['sand', 6],
  bone: ['__w', 0], boneHi: ['__w', 0], boneMid: ['sand', 6], boneSh: ['sand', 5], boneDeep: ['sand', 4], boneWorn: ['bone', 3], boneDark: ['bone', 2], boneEdge: ['bone', 1], boneOut: ['ink', 1], rust: ['soil', 4], rustHi: ['soil', 5],
  golem: ['stoneCool', 6], golemHi: ['__w', 0], golemMid: ['stoneCool', 5], golemSh: ['stoneCool', 4], golemDeep: ['stoneCool', 2], golemCrack: ['stoneCool', 3], golemOut: ['stoneCool', 1],
  moss: ['leaf', 4], mossD: ['leaf', 3], ember: ['fire', 6],
  spider: ['clothPurple', 1], spiderHi: ['clothPurple', 2], spiderMid: ['clothPurple', 3], spiderDeep: ['ink', 1], spiderEdge: ['ink', 3], spiderSh: ['ink', 2], spiderOut: ['ink', 0],
  ghost: ['__w', 0], ghostHi: ['__w', 0], ghostSh: ['magicCyan', 5], ghostMid: ['magicCyan', 6], ghostDe2: ['magicCyan', 4], ghostDeep: ['magicCyan', 3], ghostVeil: ['__w', 0],
  eyeRed: ['clothRed', 6], fang: ['__w', 0], white: ['__w', 0], gold: ['gold', 6],
};
for (const k in MC_RAMP) { const m = MC_RAMP[k]; MC[k] = m[0] === '__w' ? PM_W.slice() : rp(m[0], m[1]).slice(); }
// نیمه‌شفافیت عمدی روح (شفاف‌بودنش بخشی از هویت است — n48)
// آلفاهای متمایز (هرکدام پس از دو blend یک تُن ۴بیتی جدا می‌سازند)
MC.ghost = [...MC.ghost.slice(0, 3), 200]; MC.ghostHi = [...MC.ghostHi.slice(0, 3), 225]; MC.ghostVeil = [...MC.ghostVeil.slice(0, 3), 168];
MC.ghostSh = [...MC.ghostSh.slice(0, 3), 150]; MC.ghostMid = [...MC.ghostMid.slice(0, 3), 138]; MC.ghostDe2 = [...MC.ghostDe2.slice(0, 3), 126]; MC.ghostDeep = [...MC.ghostDeep.slice(0, 3), 114];

export const MONSTER_KINDS = ['slime', 'bat', 'wolf', 'skeleton', 'golem', 'spider', 'ghost',
  'mummy', 'archer', 'ram', 'yeti', 'imp', 'bandit', 'hare']; // ن۴۴: +۷ هیولا
// رنگ‌های بدنه برای ذرات مرگ/ضربه
export const DEATH_COLORS = {
  slime: [MC.slimeHi, MC.slime, MC.slimeSh], bat: [MC.batHi, MC.bat, MC.batSh],
  wolf: [MC.wolfHi, MC.wolf, MC.wolfSh], skeleton: [MC.boneHi, MC.bone, MC.boneSh],
  golem: [MC.golemHi, MC.golem, MC.golemSh], spider: [MC.spiderHi, MC.spider, MC.spiderSh],
  ghost: [MC.ghostHi, MC.ghost, MC.ghostSh], boss: [MC.bossHi, MC.boss, MC.bossRed],
  mummy: [MC.mummyHi, MC.mummy, MC.mummySh], archer: [MC.boneHi, MC.bone, MC.boneSh],
  ram: [MC.ramHi, MC.ram, MC.ramSh], yeti: [MC.white, MC.yeti, MC.yetiSh],
  imp: [MC.impHi, MC.imp, MC.impSh], bandit: [MC.banditHi, MC.bandit, MC.banditSh],
  hare: [MC.hareHi, MC.hare, MC.hareSh],
};

// آینه‌ی x بر اساس جهت نگاه (همه به راست رسم می‌شوند)
export function lm(r, face) {
  const m = (v) => MOX + v * face;
  return {
    px: (x, y, c) => r.px(m(x), y, c),
    line: (x1, y1, x2, y2, c) => r.line(m(x1), y1, m(x2), y2, c),
    lineW: (x1, y1, x2, y2, w, c) => r.lineW(m(x1), y1, m(x2), y2, w, c),
    rect: (x, y, w, h, c) => r.rect(face > 0 ? m(x) : m(x) - w, y, w, h, c),
    ellipse: (x, y, rx, ry, c) => r.ellipse(m(x), y, rx, ry, c),
    m,
  };
}
const sin = Math.sin, cos = Math.cos, PI = Math.PI;
export function wind(t, w) { return t < w ? ease.outCubic(t / w) : 0; } // فاز wind-up نرمال‌شده

// ارتفاع سر هر هیولا (پیکسل بالای پا) — تاج نخبه باید روی سر بنشیند نه شناور (ن۴۷)
export const MHEAD = { slime: 23, bat: 58, wolf: 33, skeleton: 37, golem: 57, spider: 23, ghost: 50,
  mummy: 38, archer: 33, ram: 26, yeti: 39, imp: 40, bandit: 34, hare: 36 }; // کالیبره‌شده از اسپرایت (۱۰۰−بالاترین+۲)

// نشان نخبه: هاله‌ی بنفش تپنده زیر پا + تاج طلایی سه‌پیکسل روی سر
const _crownG = [230, 199, 74, 255], _crownR = [220, 80, 80, 255];
export function drawEliteMark(r, x, y, time, headY) {
  r.ellipse(x, y + 2, 15 + Math.round(Math.sin(time * 4) * 2), 5, [150, 90, 220, 40]); // هاله
  r.px(x - 2, headY, _crownG); r.px(x, headY - 1, _crownG); r.px(x + 2, headY, _crownG); // تاج
  r.px(x - 2, headY - 1, _crownG); r.px(x + 2, headY - 1, _crownG);
  r.px(x, headY, _crownR); // جواهر تاج
}
