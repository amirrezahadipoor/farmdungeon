// art/boss_px.js — S9.6: «شاهِ سنگی» دست‌پیکسل — نقشه‌ی نویسه‌ای ۱:۱ برای پا/تنه/سر/تاج/چکش + روکشِ سه فاز
// منطقِ حالت/زمان‌بندی در boss.js می‌ماند؛ این ماژول فقط بدن را با قطعه‌های دستی می‌کشد.
import { nearestPM } from './palette_master.js';

const hex = (h) => { const c = nearestPM(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)); return [c[0], c[1], c[2], 255]; };
const P = {};
for (const [k, v] of Object.entries({
  1: '#aeb9c8', 2: '#727e96', 3: '#516163', 4: '#3a444c', 5: '#2f353f',
  r: '#c94f4f', R: '#8a2f2f', d: '#741723', g: '#ffe082', G: '#e6b34d', o: '#a97b2c',
  e: '#ffe082', E: '#e6b34d', k: '#141021', w: '#f2efe4', b: '#7a5532', B: '#51401f',
})) P[k] = hex(v);
function blit(g, rows, x, y) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const c = P[rows[j][i]]; if (c) g.px(Math.round(x) + i, Math.round(y) + j, c);
  }
}
const cut = (rows, w) => rows.map((s) => s.slice(0, w));

const LEG = [
  '11111111222',
  '12222222334',
  '1222222233b',
  '12223222334',
  '12222222334',
  '22222222344',
  '22232222344',
  '22222223344',
  '1222222234b',
  '22222222344',
  '22223222344',
  '22222222344',
  '12222222334',
  '22222222344',
  '22322222344',
  '22222223344',
  '23222222344',
  '22222222344',
  'GGGGGGGGGoo',
  '22222222344',
  '22222222344',
  '33333333444',
  '1222222223445',
  '2222222233445',
  '3333333334455',
  '.44444444455.',
];
// تنه ۴۸×۴۰: شنلِ قرمز روی شانه‌ها، سینه‌بندِ سنگی با نشانِ طلا، کمربندِ طلایی، دامنِ صفحه‌ای
const TORSO = [
  '......rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr......',
  '...rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr...',
  '.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrRR.',
  'rrrrrrrRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRrrrrrrrrRR',
  'rrrRRRRGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRRRRRdd',
  'rRRR1111111111111222222222222222111111111RRRRddd',
  'RRR11222222222221gGGGGGGGGGGGGg122222222223RRddd',
  'RRd12222222222221G1111111111113G12222222223Rddd.',
  'Rdd12222232222221G1222222222233G12222322233dddd.',
  'dd.12222222222221G1222gGGg22233G1222222223344dd.',
  '...12223222222221G122GgggoG2233G1222222223344...',
  '...12222222222221G122GggGoo2233G1222232223344...',
  '...12222222322221G1222Gooo22233G1222222223344...',
  '...22222222222221G12222Go222233G1222222233444...',
  '...22232222222221G1222222222233G1222222233444...',
  '...22222222223221G1222222222233G1223222233444...',
  '...22222222222221G1333333333333G1222222233444...',
  '...22222322222221GooooooooooooooG222222233444...',
  '...22222222222222222222222222222222222223334445..',
  '...22222222222322222222222222222222232223334445..',
  '...222322222222222222223222222222222222233344455.',
  '...222222222222222222222222222222222222333444455.',
  '...GGGGGGGGGGGGGGGGGGGgggggGGGGGGGGGGGGGGGGooooo.',
  '...ooooooooooooooooooogGGGgoooooooooooooooooBBBBB',
  '...111111111112222221111111111111122222211111334.',
  '...122222222223333331222222222222233333312222344.',
  '...122222322223222231222232222222232222312223344.',
  '...122222222223222231222222222222232222312222344.',
  '...222222222223222232222222222222232222322223444.',
  '...222232222223222232222222322222232222322223444.',
  '...333333333334444443333333333333344444433333445.',
  '....44444444445555554444444444444455555544444455.',
];
const HEAD = [
  '..11111111111111..',
  '.1122222222222211.',
  '112222222222222234',
  '122222222222222234',
  '122444422224444234',
  '12kkkkk2222kkkkk34',
  '12keEkk2222kkeEk34',
  '122kkk222222kkk234',
  '122222223322222234',
  '122222233332222234',
  '222222222222222344',
  '223555555555555344',
  '22355kwkwkkwkw5344',
  '.2333333333333334.',
  '..44444444444444..',
];
const CROWN = [
  '.g.....g.....g....',
  'gGg...gGg...gGg...',
  'gGg.g.gGg.g.gGg.g.',
  'GGGGGGGrGGGGGGGGG.',
  'GoooooooRoooooooo.',
];
const CROWN_BROKEN = ['......g.....g', '.....gGg...gG', '.g.g.gGg.g.gG', 'GGGGGGrGGGGGG', 'oooooRooooooo'];
const HAMMER = [
  '.111111111111.',
  '11222222222234',
  '12222322222234',
  '12222222232234',
  '1GGGGGGGGGGGo4',
  '12222222222234',
  '12322222222234',
  '12222222322334',
  '22222222222344',
  '23333333333444',
  '.444444444444.',
];
const CRACK2 = ['r...', '.rE.', '..r.', '..rE', '...r'];
const CORE = ['.rEr.', 'rEeEr', 'EeweE', 'rEeEr', '.rEr.'];

// s: {sx, gy, ty, hy, phase, warn, jaw, hAng, time}
export function drawBossPx(g, s) {
  const { sx, gy, phase, warn, jaw, hAng } = s, ty = s.ty + 8, hy = s.hy + 8; // تنه ۳۲ ردیف ⇒ ۸px پایین‌تر تا روی پاها بنشیند
  const cos = Math.cos, sin = Math.sin;
  for (const dx of [-14, 5]) {
    blit(g, LEG, sx + dx, gy - 26);
    if (phase === 2) blit(g, CRACK2, sx + dx + 3, gy - 22);
    if (phase === 3) blit(g, ['rE', '.r'], sx + dx + 3, gy - 18);
  }
  // بازوی دور (سنگِ سایه‌دار)
  for (let k = 0; k < 20; k++) { const x = sx - 22 - k * 0.25, y = ty + 8 + k; g.px(x - 3, y, P[3]); g.px(x - 2, y, P[2]); g.px(x - 1, y, P[2]); g.px(x, y, P[3]); g.px(x + 1, y, P[4]); }
  blit(g, ['.1111.', '122223', '222334', '.3344.'], sx - 30, ty + 27);
  blit(g, phase === 3 ? cut(TORSO, 36) : TORSO, sx - 24, ty);
  if (phase === 2) { blit(g, CRACK2, sx - 14, ty + 10); blit(g, CRACK2, sx + 8, ty + 24); blit(g, ['rE', '.r', '.rE'], sx + 15, ty + 4); }
  if (phase === 3) {
    for (let j = 0; j < 32; j++) { const x = sx + 11 - (j * 7 % 3); g.px(x, ty + j, P[3]); g.px(x + 1, ty + j, j % 5 ? P[4] : P.E); }  // لبه‌ی شکسته
    blit(g, CORE, sx - 3, ty + 9);
  }
  const ht = phase === 3 ? 3 : 0;
  blit(g, HEAD, sx - 9 + ht, hy);
  if (warn > 0.2 || jaw > 0.2 || phase === 3) { for (const ex of [-6, 4]) { g.px(sx + ex + ht, hy + 6, P.r); g.px(sx + ex + 1 + ht, hy + 6, P.e); } }
  blit(g, phase === 3 ? CROWN_BROKEN : CROWN, sx - 8 + ht + (phase === 3 ? 3 : 0), hy - 5 + (phase === 3 ? 1 : 0));
  if (phase === 2) blit(g, ['r..', '.rE', '..r'], sx - 7, hy + 1);
  if (jaw > 0.3) { const h = 2 + Math.round(jaw * 3); for (let j = 0; j < h; j++) for (let i = 0; i < 9; i++) g.px(sx - 4 + i + ht, hy + 11 + j, j === 0 && i % 2 ? P.w : P.k); }
  if (phase >= 2) { blit(g, ['g', 'G', 'G', 'o'], sx + 22, gy - 5); if (phase === 3) blit(g, ['.g', 'gG', 'Go'], sx + 27, gy - 3); }
  // بازوی نزدیک + چکش: بازو نوارِ سایه‌دارِ ۷px، دسته‌ی چوبی، سرِ چکشِ دستی عمود بر دسته
  const shx = sx + 20, shy = ty + 8, hx = shx + cos(hAng) * 20, hy2 = shy + sin(hAng) * 20;
  const nx = -sin(hAng), ny = cos(hAng);
  for (let k = 0; k <= 20; k++) {
    const x = shx + (hx - shx) * k / 20, y = shy + (hy2 - shy) * k / 20;
    for (let w = -3; w <= 3; w++) g.px(x + nx * w, y + ny * w, w <= -2 ? P[1] : w >= 2 ? P[4] : P[2]);
  }
  const ex = hx + cos(hAng) * 14, ey = hy2 + sin(hAng) * 14;
  for (let k = 0; k <= 14; k++) { const x = hx + (ex - hx) * k / 14, y = hy2 + (ey - hy2) * k / 14; g.px(x, y, P.b); g.px(x + nx, y + ny, P.B); g.px(x - nx, y - ny, P.b); }
  const vert = Math.abs(cos(hAng)) > Math.abs(sin(hAng));
  const hm = vert ? HAMMER[0].split('').map((_, i) => HAMMER.map((r) => r[i] || '.').reverse().join('')) : HAMMER;
  blit(g, hm, ex - hm[0].length / 2, ey - hm.length / 2);
}
