// battle_fx.js — S6.7: افکت‌های نبرد — فقط **رندر و ذره**؛ هیچ منطقِ گیم‌پلی این‌جا نیست
// (runHit دست‌نخورده ماند: جرقه‌ی برخورد از محلِ شناورِ خسارت زده می‌شود، نه از محاسبه‌ی آسیب)
import { MC, DEATH_COLORS } from './monster_parts.js';

export const MAX_PARTS = 40;    // پذیرشِ S6.7: سقفِ ذراتِ همزمان
export const HIT_SPARK_DY = 34; // شناورِ خسارت ۴۶px بالاتر از مرکز است ⇒ جرقه روی تنه می‌نشیند (y-12)
const FRAME = 1 / 60;
const SLASH_LIFE = 0.14;        // ۳ فریم (۰٫۰۴۷ × ۳)
const SPARK_LIFE = 0.045;       // ≈۳ فریم (burst آن را ۰٫۷–۱٫۳× می‌کند ⇒ ۱٫۹–۳٫۵ فریم)

// رمپِ فلزِ تیغه: هسته‌ی سفید → فولاد → لبه‌ی تیره (۳ لایه)
const STEEL = [[242, 239, 228, 255], [198, 206, 220, 225], [126, 140, 168, 170]];
// جرقه: سفیدِ داغ → کهربا → نارنجیِ رو به خاموشی
const SPARK = [[255, 255, 255, 255], [255, 232, 150, 255], [255, 196, 60, 255], [226, 140, 60, 210]];
const SCRATCH = [0, 0, 0, 0];   // بازنویسی‌شونده — بدون تخصیص در حلقه‌ی رندر

// دود/گرد: رنگ‌های ثابت (بیرون از قفلِ پالتِ اسپرایت — افکت‌ها پالتِ مستر را نمی‌شمارند)
const DUST = [150, 142, 126, 120], SMOKE = [124, 120, 138, 95];

// ================= برشِ شمشیر: کمانِ ۳ فریمی =================
// فریم ۰: لبه‌ی پیشرو (باریک، دورتر، درخشان) · فریم ۱: کمانِ کاملِ سه‌لایه + هایلایت · فریم ۲: ردِ محو
export function slashFrame(t) { return Math.max(0, Math.min(2, Math.floor(t / (SLASH_LIFE / 3)))); }

export function drawSlash(r, s, cx, cy) {
  const f = slashFrame(s.t), k = 1 - s.t / SLASH_LIFE;
  const rad = f === 0 ? s.r + 2 : f === 1 ? s.r : s.r - 3;
  const spread = f === 1 ? 3 : 2;
  const layers = f === 0 ? 2 : f === 1 ? 3 : 1;             // ۰ = پیشرو · ۱ = کامل · ۲ = رد
  for (let i = -spread; i <= spread; i++) {
    const ang = s.ang + i * 0.16, ux = Math.cos(ang), uy = Math.sin(ang) * 0.8;
    for (let L = 0; L < layers; L++) {
      const src = STEEL[L], a = Math.round(src[3] * k * (f === 1 ? 1 : 0.7));
      if (a <= 0) continue;
      SCRATCH[0] = src[0]; SCRATCH[1] = src[1]; SCRATCH[2] = src[2]; SCRATCH[3] = a;
      r.px(Math.round(s.x - cx + ux * (rad - L * 2)), Math.round(s.y - cy + uy * (rad - L * 2)), SCRATCH);
    }
    if (f === 1 && Math.abs(i) <= 1) { // هایلایت: دو پیکسلِ سفید روی میانه‌ی تیغه
      SCRATCH[0] = 255; SCRATCH[1] = 255; SCRATCH[2] = 255; SCRATCH[3] = Math.round(230 * k);
      r.px(Math.round(s.x - cx + ux * (rad + 1)), Math.round(s.y - cy + uy * (rad + 1)), SCRATCH);
    }
  }
}

// ================= جرقه‌ی برخورد (۳ فریم · ۴–۶ ذره · ۱–۲px) =================
// crit ⇒ بزرگ‌تر: ذراتِ بیشتر، همه ۲px، سرعت/عمرِ بیشتر
export function sparkBurst(fx, x, y, crit) {
  const n = crit ? 9 + (Math.random() * 3 | 0) : 4 + (Math.random() * 3 | 0);
  fx.burst(x, y, crit ? SPARK : SPARK.slice(1), n, {
    sp: crit ? 62 : 42, up: crit ? 12 : 8, g: 60,
    life: SPARK_LIFE * (crit ? 1.6 : 1), s: crit ? 2 : (Math.random() < 0.4 ? 2 : 1),
  });
}

// ================= مرگِ per نوع: خرده‌های رنگِ بدن + دود/تکه‌ی اضافه =================
// رنگ‌های «اضافه» عمداً **غیرِ** رنگ‌های DEATH_COLORS همان کیندند (وگرنه خرده با بدنه یکی دیده می‌شود)
const DEATH_EXTRA = {
  golem: (fx, x, y) => { chunks(fx, x, y, [MC.golemMid, MC.golemCrack, MC.moss], 5); fx.dust(x, y + 4, 3, DUST); },
  boss: (fx, x, y) => {
    chunks(fx, x, y, [MC.bossMid, MC.bossCrack, MC.bossGold], 5);
    fx.dust(x, y + 6, 3, DUST);
    fx.burst(x, y - 14, [MC.ember, MC.bossRed, MC.ember], 5, { sp: 26, up: 18, g: -30, life: 0.7, s: 1 }); // اخگرِ گدازه‌ای (۳ اخگر از ۵)
  },
  skeleton: (fx, x, y) => { chunks(fx, x, y, [MC.boneMid, MC.boneWorn], 4); fx.dust(x, y + 4, 3, DUST); },
  archer: (fx, x, y) => { chunks(fx, x, y, [MC.boneMid, MC.archerBow, MC.archerFeather], 4); fx.dust(x, y + 4, 2, DUST); },
  ghost: (fx, x, y) => { fx.burst(x, y - 8, [MC.ghostMid, MC.ghostDe2, SMOKE], 6, { sp: 12, up: 8, g: -20, life: 0.9, s: 2 }); },
  mummy: (fx, x, y) => { fx.burst(x, y - 6, [MC.mummyBand, MC.mummyStain], 4, { sp: 30, up: 16, g: 40, life: 0.6, s: 1 }); fx.dust(x, y + 4, 3, DUST); },
  imp: (fx, x, y) => { fx.burst(x, y - 8, [MC.impMid, MC.impHorn, MC.gold], 6, { sp: 26, up: 20, g: -32, life: 0.55, s: 1 }); },
  slime: (fx, x, y) => { fx.burst(x, y - 6, [MC.slimeDeep, MC.slimeEdge, MC.moss], 5, { sp: 38, up: 8, g: 160, life: 0.35, s: 1 }); fx.dust(x, y + 4, 2, DUST); },
  bat: (fx, x, y) => { fx.burst(x, y - 8, [MC.batEdge, MC.batDeep, SMOKE], 5, { sp: 18, up: 4, g: 22, life: 0.5, s: 1 }); },
  spider: (fx, x, y) => { fx.burst(x, y - 6, [MC.spiderMid, MC.spiderEdge, MC.spiderDeep], 5, { sp: 22, up: 10, g: 60, life: 0.45, s: 1 }); },
  wolf: (fx, x, y) => { fur(fx, x, y, [MC.wolfMid, MC.wolfCream, MC.wolfDeep]); },
  yeti: (fx, x, y) => { fur(fx, x, y, [MC.yetiMid, MC.yetiIce, MC.yetiSkin]); },
  ram: (fx, x, y) => { fur(fx, x, y, [MC.ramMid, MC.ramHorn]); fx.dust(x, y + 4, 2, DUST); },
  hare: (fx, x, y) => { fur(fx, x, y, [MC.hareMid, MC.hareFoot]); },
  bandit: (fx, x, y) => { fx.burst(x, y - 8, [MC.banditMid, MC.banditSash, MC.gold], 5, { sp: 30, up: 14, g: 70, life: 0.5, s: 1 }); },
};

function chunks(fx, x, y, cols, n) { // خرده‌ی سنگ/استخوان: می‌افتد (g مثبتِ زیاد)
  fx.burst(x, y - 8, cols, n, { sp: 40, up: 26, g: 130, life: 0.5, s: 2 });
}
function fur(fx, x, y, cols) { // توده‌ی خز/پشم: شناور می‌ماند و آرام می‌نشیند
  fx.burst(x, y - 8, cols, 5, { sp: 16, up: 10, g: -8, life: 0.75, s: 1 });
}

export function deathFx(fx, e) {
  const big = e.isBoss || e.kind === 'boss';            // باس همیشه بزرگ — حتی اگر پرچم جا مانده باشد
  const cols = DEATH_COLORS[e.kind] || DEATH_COLORS.golem;
  fx.burst(e.x, e.y - 10, cols, big ? 20 : 12, { sp: big ? 60 : 34, up: 30, life: 0.55 });
  (DEATH_EXTRA[e.kind] || DEATH_EXTRA.golem)(fx, e.x, e.y);
}

// ================= دنباله‌ی پرتابه (۲–۳ پیکسل پشتِ سر، α کاهشی) =================
const TRAIL = {
  arrow: [[232, 231, 220, 150], [232, 231, 220, 95], [206, 200, 184, 55]],
  fire: [[224, 138, 74, 145], [176, 84, 38, 95], [140, 66, 34, 55]],
};
export function projTrail(r, px, py, ux, uy, kind) {
  const T = TRAIL[kind] || TRAIL.fire;
  for (let i = 0; i < 3; i++) { // ۲–۳ پیکسلِ دنباله
    const d = 7 + i * 2;
    SCRATCH[0] = T[i][0]; SCRATCH[1] = T[i][1]; SCRATCH[2] = T[i][2]; SCRATCH[3] = T[i][3];
    r.px(Math.round(px - ux * d), Math.round(py - uy * d), SCRATCH);
  }
}

export const BATTLE_FX = { MAX_PARTS, SLASH_LIFE, SPARK_LIFE, FRAME, STEEL, SPARK, TRAIL, DUST, SMOKE, kinds: Object.keys(DEATH_EXTRA) };
