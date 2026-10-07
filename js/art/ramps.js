// art/ramps.js — منبع واحد رمپ‌های مواد (نشست S1.1؛ فقط تعریف — هنوز در رندر استفاده نمی‌شود)
// هر رمپ = ۷ رنگ [r,g,b,255]؛ اندیس ۰ تیره‌ترین … ۶ روشن‌ترین · L خطی ۱۲→۹۲ (گام ΔL≈۱۳٫۳ ∈ [۷،۱۷])
// قواعد رنگ (اصول کیفیت آرت): سایه = چرخش هیو به سمت بنفش-آبی + افت اشباع · هایلایت = چرخش به سمت زرد گرم
// · اوج اشباع در میانه · هیچ رنگ محاسبه‌ای بیرون این رمپ‌ها مجاز نیست (S1.3+ مصرف می‌کنند).

export const RAMP_STEPS = 7;
const L0 = 12, L1 = 92;          // کرانِ L (روشنایی ادراکی 0..255)
const PURPLE = 268, WARM = 52;   // لنگرهای هیو: سایه → بنفش-آبی · نور → زرد

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function hsl2rgb(h, s, l) { // h آزاد (درجه)، s/l در 0..1 → [0..255]³
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; } else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; } else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const lerpHue = (a, b, t) => a + (((b - a + 540) % 360) - 180) * t; // کوتاه‌ترین قوس روی دایره‌ی هیو
// L هدف → lightness در HSL (جست‌وجوی دودویی: روشنایی نسبت به lightness یکنوا است)
function lightFor(h, s, target) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; (lum(...hsl2rgb(h, s, m)) < target) ? lo = m : hi = m; }
  return (lo + hi) / 2;
}

// ساخت یک رمپ ۷ پله‌ای از (هیو، اشباع)
export function makeRamp({ h, s, l0 = L0, l1 = L1, hShadow = -20, hLight = 15, sPeak = 0.35 }) {
  const out = [];
  const hF = Math.min(1, Math.abs(hShadow) / 45), lF = Math.min(1, hLight / 45); // شدت چرخش هیو
  for (let i = 0; i < RAMP_STEPS; i++) {
    const t = (i - 3) / 3;                    // −1 تیره‌ترین … +1 روشن‌ترین
    const darkK = t < 0 ? -t : 0, lightK = t > 0 ? t : 0;
    const hue = lerpHue(lerpHue(h, PURPLE, darkK * hF * 0.62), WARM, lightK * lF * 0.55);
    const sat = Math.min(0.98, s * (1 + sPeak * (1 - Math.abs(t))) * (1 - (darkK * 0.10 + lightK * 0.07)));
    const L = l0 + ((l1 - l0) * i) / (RAMP_STEPS - 1);
    out.push([...hsl2rgb(hue, sat, lightFor(hue, sat, L)), 255]);
  }
  return out;
}

// ---------- مواد پایه (هیو، اشباع) ----------
const BASE = {
  grass: [118, 0.45], grassDry: [60, 0.48], leaf: [104, 0.50], leafAutumn: [38, 0.55],
  soil: [26, 0.42], soilWet: [18, 0.50], dust: [34, 0.34], sand: [45, 0.40],
  stoneCool: [222, 0.10], stoneMoss: [138, 0.22], stoneForge: [16, 0.50], stoneIce: [198, 0.30],
  water: [205, 0.50], waterDeep: [218, 0.45],
  skin: [22, 0.48], clothRed: [352, 0.50], clothBlue: [220, 0.42], clothGreen: [128, 0.35],
  clothPurple: [282, 0.38], bone: [45, 0.16], metal: [212, 0.12],
  fire: [28, 0.80], magicCyan: [188, 0.55], gold: [45, 0.60], ink: [240, 0.30],
};
export const RAMP = {};
for (const k in BASE) RAMP[k] = makeRamp({ h: BASE[k][0], s: BASE[k][1] });

// هم‌نام‌های معنایی (همان آرایه — یک رنگ اضافه نمی‌کنند؛ تفکیک کامل در نشست‌های بعد اگر لزوم شد)
const ALIAS = {
  bark: 'soil', wood: 'soil', hair: 'soil', furBrown: 'soil', path: 'dust',
  clothCream: 'bone', furWhite: 'bone', furGrey: 'metal', magicPurple: 'clothPurple',
  brick0: 'stoneCool', brick1: 'stoneMoss', brick2: 'stoneForge', brick3: 'stoneIce', brick: 'stoneCool',
};
for (const k in ALIAS) RAMP[k] = RAMP[ALIAS[k]];

// ---------- API ----------
export const RAMP_NAMES = Object.keys(RAMP);                    // همه‌ی نام‌ها (شامل هم‌نام‌ها) — برای audit
export const RAMP_BASE_NAMES = Object.keys(BASE);               // فقط مواد پایه (رنگ یکتا تولید می‌کنند)
export const rp = (name, i) => RAMP[name][i];                   // رنگ پله‌ی i
export const rpHex = (name, i) => '#' + rp(name, i).slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
export const rampL = (name) => RAMP[name].map((c) => Math.round(lum(c[0], c[1], c[2]))); // پروفایل L — برای audit
