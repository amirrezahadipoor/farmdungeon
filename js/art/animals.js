// art/animals.js — دام‌های مزرعه (مرغ/گوسفند/گاو) دست‌پیکسل با نقشه‌ی کاراکتری؛ نور از بالا-چپ،
// دورخطِ بنفشِ تیره (نه سیاه)، ۲ فریم راه‌رفتن + فریم «چریدن/نوک‌زدن» + آیکونِ محصول (تخم/پشم/شیر).
import { Raster } from '../raster.js';

const PAL = {
  o: [52, 30, 48, 255],    // دورخط
  w: [246, 240, 226, 255], // سفید/کرم
  s: [200, 190, 182, 255], // سایه‌ی سفید (بنفش‌مایل)
  S: [160, 146, 150, 255], // سایه‌ی عمیق
  r: [214, 58, 52, 255],   // تاج
  y: [240, 170, 50, 255],  // نوک/پا
  Y: [190, 110, 40, 255],  // سایه‌ی پا
  e: [40, 24, 40, 255],    // چشم
  f: [92, 78, 84, 255],    // صورت گوسفند
  F: [66, 52, 62, 255],    // سایه‌ی صورت
  k: [74, 48, 46, 255],    // لکه‌ی گاو
  K: [54, 34, 38, 255],    // سایه‌ی لکه
  p: [236, 156, 160, 255], // پوزه‌ی صورتی
  P: [196, 112, 124, 255],
  h: [232, 216, 170, 255], // شاخ
  b: [120, 88, 70, 255],   // سُم
  m: [250, 250, 255, 255], // شیر
  c: [130, 170, 210, 255], // بطری
  g: [255, 255, 255, 255], // برق
};

// همه رو به راست؛ چپ = آینه. ردیف‌های پا جدا تا فریم‌ها فقط پا را عوض کنند.
const CHICK_BODY = [
  '......rr...',
  '.....orro..',
  '.....owwoyy',
  '.....oewwy.',
  '.o...owwo..',
  'owo..owwo..',
  'owwoowwwwo.',
  'owswwwwwwo.',
  '.osswwwwso.',
  '..ossssso..',
  '...ooooo...',
];
const CHICK_LEGS = [['....y.y....', '...yy.yy...'], ['...y...y...', '..yy...yy..']];
const CHICK_PECK = [
  '...........',
  '...........',
  '.o.........',
  'owo........',
  'owwoooooo..',
  'owswwwwwwor',
  '.osswwwwwwo',
  '..osssswewy',
  '...ooooooyy',
  '...........',
  '...........',
];

const SHEEP_BODY = [
  '...oo.oo.oo......',
  '..owwowwowwo..oo.',
  '.owwwwwwwwwwoofFo',
  'owwwwwwwwwwwwofefo',
  'owwwwwwwwwwwwoffffo',
  'owswwwwwwwwwsoFfFo.',
  '.osswwwwwwwssoooo..',
  '.ossssssssssso.....',
  '..oooooooooooo.....',
];
const SHEEP_LEGS = [['...ff....ff......', '...bb....bb......'], ['..ff......ff.....', '..bb......bb.....']];
const SHEEP_GRAZE = [
  '...oo.oo.oo......',
  '..owwowwowwo.....',
  '.owwwwwwwwwwo....',
  'owwwwwwwwwwwwo...',
  'owwwwwwwwwwwwoo..',
  'owswwwwwwwwwsofFo',
  '.osswwwwwwwssofefo',
  '.ossssssssssoFfffo',
  '..oooooooooooFFoo.',
];

const COW_BODY = [
  '..................hh.',
  '.................ohho',
  '..oooooooooooooookkko',
  '.owwwkkwwwwwwwwwokekwo',
  'owwwkKkwwwwkkwwwwkkkwo',
  'owwwwkwwwwkKkwwwwopppo',
  'owwwwwwwwwwkwwwwwoPpPo',
  'owswwwwwwwwwwwwwso.oo.',
  '.ossswwwwwwwwwsso.....',
  '.osssssssppsssso......',
  '..oooooooooooooo......',
];
const COW_LEGS = [['..wk.......wk.........', '..bb.......bb.........'], ['.wk.........wk........', '.bb.........bb........']];
const COW_GRAZE = [
  '.....................',
  '.....................',
  '..oooooooooooooo.....',
  '.owwwkkwwwwwwwwwo....',
  'owwwkKkwwwwkkwwwwo...',
  'owwwwkwwwwkKkwwwwohh.',
  'owwwwwwwwwwkwwwwwkkko',
  'owswwwwwwwwwwwwwskekwo',
  '.ossswwwwwwwwwssokkkwo',
  '.osssssssppsssssopppo.',
  '..ooooooooooooooPpPo..',
];

const ICONS = {
  egg: ['..ooo...', '.owwgo..', 'owwwwwo.', 'owwwwso.', 'owwwsso.', '.osssso.', '..oooo..'],
  wool: ['.oo.oo..', 'owwowwo.', 'owwwwwwo', 'owswwswo', 'osswssso', '.oooooo.'],
  milk: ['..oo....', '..oco...', '.ommmo..', 'omgmmmo.', 'ommmmmo.', 'occcccо.', 'ommmmmo.', '.ooooo..'],
};

function paint(rows, legs) {
  const all = legs ? rows.concat(legs) : rows;
  const w = Math.max(...all.map((s) => s.length)), h = all.length;
  const r = new Raster(w, h);
  all.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = PAL[row[x]]; if (c) r.px(x, y, c); } });
  return r;
}
function mirror(src) {
  const r = new Raster(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const i = (y * src.w + x) * 4, j = (y * src.w + (src.w - 1 - x)) * 4;
    r.d[j] = src.d[i]; r.d[j + 1] = src.d[i + 1]; r.d[j + 2] = src.d[i + 2]; r.d[j + 3] = src.d[i + 3];
  }
  return r;
}

const DEF = {
  chicken: { body: CHICK_BODY, legs: CHICK_LEGS, alt: CHICK_PECK },
  sheep: { body: SHEEP_BODY, legs: SHEEP_LEGS, alt: SHEEP_GRAZE },
  cow: { body: COW_BODY, legs: COW_LEGS, alt: COW_GRAZE },
};
const _cache = new Map();
// frame: 0/1 راه‌رفتن · 2 چریدن/نوک‌زدن ؛ face: 1 راست، −1 چپ
export function animalSprite(kind, frame, face) {
  const key = kind + frame + face;
  let s = _cache.get(key);
  if (!s) {
    const d = DEF[kind];
    s = frame === 2 ? paint(d.alt, d.legs[0]) : paint(d.body, d.legs[frame]);
    if (face < 0) s = mirror(s);
    _cache.set(key, s);
  }
  return s;
}
export function goodIcon(kind) {
  const key = 'i' + kind;
  let s = _cache.get(key);
  if (!s) { s = paint(ICONS[kind].map((r) => r.replace(/[^a-zA-Z.]/g, 'o'))); _cache.set(key, s); }
  return s;
}
// سایه‌ی بیضیِ زیرِ پا (نیم‌شفاف)
const _sh = [20, 30, 16, 90];
export function drawAnimalShadow(r, cx, by, w) { r.ellipse(cx, by, Math.max(3, w >> 1), 2, _sh); }
