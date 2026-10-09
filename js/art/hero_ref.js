// art/hero_ref.js — S10.6 «قهرمانِ مرجع‌محور» مرحله‌ی ۱: یک فریمِ ثابتِ روبه‌رو (ایستاده)، بومِ ۳۶×۵۲، قد ۴۸px.
// تناسب: کلاه ۲–۶ · سر ۴–۱۳ (۱۰px) · تنه ۱۴–۲۹ (۱۶px) · پا ۳۰–۴۹ (۲۰px) · شانه ۱۴px (ستون‌های ۱۱–۲۴).
// نور فقط از بالا-چپ؛ هر ماده ۴ تُن (سایه/پایه/روشن/هایلایت) با hue-shift (سایه بنفش‌تر، هایلایت گرم‌تر).
// sel-out: لبه‌های داخلیِ هر ناحیه با تیره‌ترین تُنِ خودِ آن ماده؛ دورِ بیرونی ۱px بنفشِ تیره (outlineRef).
// لایه‌های جدا: sword (پشت)، body، scarf، hat ⇒ مرحله‌ی ۲/۳ هر کدام را مستقل جابه‌جا می‌کند.
// هیچ وابستگی به رندرِ بازی ندارد (هنوز در بازی استفاده نمی‌شود)؛ خروجی: شبکه‌ی نویسه‌ای هر لایه.

export const REF_W = 36, REF_H = 52, REF_TOP = 2, REF_GROUND = 49;
export const REF_PAL = {
  o: '#2e2040',                                                   // دورِ بیرونی (تیره‌ترین)
  K: '#ffe4bc', S: '#f7b98c', s: '#d98a6c', x: '#a35a66',         // پوست
  H: '#c98a52', G: '#94573a', g: '#6b3a30', h: '#452640',         // مو (و چرم/چکمه/کمربند)
  Y: '#fff0a0', y: '#f0c45a', t: '#c48a3c', T: '#8a5638',         // حصیر (و طلا)
  R: '#ff8f70', r: '#dc4450', q: '#a02c50', Q: '#6a1f4a',         // قرمز (شال/نوار/گونه/دهان)
  W: '#f8f2e0', w: '#c4b4b4',                                     // پیراهن
  V: '#8fd0ea', v: '#5a9cd4', b: '#3b66ab', B: '#2d3779',         // جلیقه/آستین
  P: '#c2b878', p: '#8f8a52', n: '#6a6844', N: '#4a4458',         // شلوار
};
// ویژگی‌های عمداً ۱px (طبقِ مشخصات): درخششِ چشم ×۲، بینی، سایه‌ی انگشت ×۲
export const REF_FEATURES = [[15, 8], [19, 8], [18, 11], [9, 29], [26, 29]];

const grid = () => Array.from({ length: REF_H }, () => new Array(REF_W).fill(null));
const mk = (L) => ({
  px(x, y, k) { if (x >= 0 && y >= 0 && x < REF_W && y < REF_H && k) L[y][x] = k; },
  rect(x, y, w, h, k) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, k); },
  row(x, y, s) { for (let i = 0; i < s.length; i++) if (s[i] !== '.') this.px(x + i, y, s[i]); },
});

function body(L) {
  const d = mk(L);
  // ---- سر (۴–۱۳): مو زیرِ کلاه، صورتِ ۸px (۱۴–۲۱) ----
  d.rect(12, 4, 12, 3, 'g');                                      // تاجِ مو (زیرِ کلاه)
  // دو توده‌ی مو (۳ تُن + رگه‌ی ۱px روشن) کنارِ صورت، زیرِ لبه‌ی کلاه — پیش از صورت
  const hairL = ['GG', 'GH', 'GH', 'gH', 'gh', 'hh'], hairR = ['Gg', 'gh', 'gh', 'gh', 'hh', '.h'];
  hairL.forEach((r, j) => d.row(12, 6 + j, r)); hairR.forEach((r, j) => d.row(22, 6 + j, r));
  d.rect(14, 6, 8, 1, 'G'); d.rect(16, 6, 2, 1, 'H');             // چتریِ زیرِ لبه
  const face = ['KggKKggs', 'KhhKShhs', 'KhhSShhs', 'KhhSshhs', 'RRSSxsRR', 'sSSqqsss', '.ssssss.']; // ابرو ۷ · چشم ۸–۱۰ · گونه/بینی ۱۱ · دهان ۱۲ · چانه ۱۳
  face.forEach((r, j) => d.row(14, 7 + j, r));
  d.px(15, 8, 'W'); d.px(19, 8, 'W');                             // درخششِ ۱px (چشمِ ۲×۳: ردیف‌های ۸–۱۰)
  d.rect(11, 9, 1, 2, 'S'); d.rect(24, 9, 1, 2, 's');             // گوش‌ها ۲px
  // ---- تنه (۱۴–۲۹)، شانه ۱۴px ----
  d.rect(11, 14, 14, 14, 'b');
  d.rect(11, 14, 2, 14, 'v'); d.rect(11, 14, 1, 10, 'V'); d.rect(12, 14, 6, 1, 'V');
  d.rect(23, 14, 2, 14, 'B');
  // پیراهن: یقه‌ی V (۶→۴→۲) + یقه‌ی جلیقه (لبه‌ی روشن چپ / تیره راست)
  [[15, 6], [15, 6], [16, 4], [16, 4], [17, 2], [17, 2]].forEach(([x, w], j) => {
    d.rect(x, 15 + j, w, 1, 'W'); d.rect(x + (w >> 1), 15 + j, w >> 1, 1, 'w');
    d.px(x - 1, 15 + j, 'V'); d.px(x + w, 15 + j, 'B');
  });
  d.rect(17, 21, 2, 4, 'B');                                      // درزِ دکمه‌ی جلیقه
  // کمربند ۲ ردیف + سگکِ ۲px طلایی
  d.rect(11, 26, 14, 1, 'g'); d.rect(11, 27, 14, 1, 'h'); d.rect(17, 26, 2, 1, 'Y');
  d.rect(11, 28, 14, 2, 'b'); d.rect(11, 28, 2, 2, 'v'); d.rect(23, 28, 2, 2, 'B'); d.rect(11, 29, 14, 1, 'B');
  // آستین‌ها (۱۵–۲۵) با فاصله‌ی سایه از تنه + سردست (۲۶) + دستِ ۳×۳ (۲۷–۲۹) با ۱px سایه‌ی انگشت
  d.rect(8, 15, 3, 11, 'b'); d.rect(8, 15, 1, 11, 'v'); d.rect(10, 15, 1, 11, 'B'); d.rect(8, 15, 2, 1, 'V');
  d.rect(25, 15, 3, 11, 'b'); d.rect(27, 15, 1, 11, 'B'); d.rect(25, 15, 2, 1, 'v');
  d.row(8, 26, 'WWW'); d.row(25, 26, 'WWW');
  d.row(8, 27, 'SSs'); d.row(8, 28, 'Sss'); d.row(8, 29, 'sxs');
  d.row(25, 27, 'SSs'); d.row(25, 28, 'Sss'); d.row(25, 29, 'sxs');
  // ---- پاها (۳۰–۴۹): شلوار ۳۰–۴۲ با چینِ زانو، چکمه ۴۳–۴۹ ----
  d.rect(12, 30, 12, 2, 'p'); d.rect(12, 30, 2, 2, 'P'); d.rect(22, 30, 2, 2, 'N'); d.rect(17, 31, 2, 1, 'N');
  for (let y = 32; y <= 42; y++) { d.row(12, y, 'pPpnN'); d.row(19, y, 'pnnnN'); }
  d.rect(13, 37, 3, 1, 'N'); d.rect(20, 37, 3, 1, 'N');           // چینِ زانو (۱ خطِ سایه)
  for (const [x, lit] of [[11, true], [19, false]]) {
    d.rect(x, 43, 6, 1, 'g');                                     // لبه‌ی ساق
    for (let y = 44; y <= 47; y++) d.row(x, y, lit ? 'GHGGGg' : 'GGGGgg');
    d.row(x, 47, lit ? 'HHHHGg' : 'GHHHGg');                       // سرِ چکمه (قهوه‌ایِ روشن‌تر)
    d.row(x, 48, lit ? 'HHHGGg' : 'GHHGgg');
    d.row(x, 49, 'hhhhhh');                                       // پاشنه/کفِ تیره
  }
}
function scarf(L) {
  const d = mk(L);
  d.row(13, 14, 'RRrrrrrrqq'); d.row(13, 15, 'rrrrrrqqQQ'); d.row(14, 16, 'qqrrrqqQ');
  d.row(19, 16, 'rrq'); d.rect(19, 17, 3, 2, 'r'); d.rect(21, 17, 1, 2, 'q');   // گره
  for (let y = 19; y <= 24; y++) d.row(19, y, 'rq');               // دنباله‌ی ۱ (بلند)
  for (let y = 19; y <= 22; y++) d.row(21, y, 'qQ');               // دنباله‌ی ۲ (کوتاه)
  d.row(19, 25, 'qq');
}
function hat(L) {
  const d = mk(L);
  d.row(14, 2, 'YYyyyyyt'); d.row(13, 3, 'YYyyyyyytt');           // تاج
  d.row(13, 4, 'rrrrrrrqqq');                                     // نوارِ قرمز
  d.row(9, 4, 'yyyy'); d.row(23, 4, 'ytTT');                      // لبه‌ی بیضی — ردیف ۱
  d.row(7, 5, 'YYYYYYyyyyyyyyyyyttttT');                          // ردیف ۲ (پهن‌ترین، ۲۲px)
  d.row(8, 6, 'TTttttttttttttttttTT');                            // ردیف ۳: زیرِ لبه (سایه)
}
function sword(L) {
  const d = mk(L);
  d.rect(28, 21, 2, 1, 'Y'); d.rect(28, 22, 2, 2, 'g'); d.rect(27, 24, 4, 1, 'y');   // قپه/قبضه/گارد
  for (let y = 25; y <= 39; y++) d.row(28, y, 'Gh');               // غلاف
  d.rect(28, 40, 2, 1, 'y');                                       // نوکِ برنجی
}
// لایه‌ها به ترتیبِ رسم (پشت → جلو)
export function heroRefLayers() {
  const out = { sword: grid(), body: grid(), scarf: grid(), hat: grid() };
  sword(out.sword); body(out.body); scarf(out.scarf); hat(out.hat);
  return out;
}
export function composeRef(layers, order = ['sword', 'body', 'scarf', 'hat']) {
  const c = grid();
  for (const n of order) { const L = layers[n]; for (let y = 0; y < REF_H; y++) for (let x = 0; x < REF_W; x++) if (L[y][x]) c[y][x] = L[y][x]; }
  return c;
}
// دورِ بیرونیِ ۱px (۴-همسایه) با تیره‌ترین رنگ
export function outlineRef(c) {
  const o = c.map((r) => r.slice());
  for (let y = 0; y < REF_H; y++) for (let x = 0; x < REF_W; x++) {
    if (c[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => c[y + b] && c[y + b][x + a])) o[y][x] = 'o';
  }
  return o;
}
