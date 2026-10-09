// monster.js — کلاس Monster: ماشین حالت (idle/move/attack/die) + آمار هر هیولا + کش اسپرایت
import { drawMonsterFrame } from './art/monsters.js';
import { AI_EXT } from './mobs_new.js'; // ن۴۴: رفتارهای ویژه (تیرانداز/یورش/دزدی/جهش)
import { MONSTER_KINDS } from './art/monster_parts.js';
import { drawBossFrame } from './art/boss.js';
import { makeSpriteCache } from './art/bake.js'; // S6.1: کشِ سقف‌دارِ خط لوله (snap حالا داخل bake)

const STATS = {
  slime:    { hp: 20,  speed: 24, range: 18, windup: 0.35, dmg: 4,  stride: 10, cool: 1.1 },
  bat:      { hp: 12,  speed: 42, range: 16, windup: 0.32, dmg: 3,  stride: 12, cool: 0.9 },
  wolf:     { hp: 28,  speed: 58, range: 18, windup: 0.38, dmg: 7,  stride: 18, cool: 1.0 },
  skeleton: { hp: 24,  speed: 32, range: 18, windup: 0.42, dmg: 6,  stride: 16, cool: 1.1 }, // S6.3: stride فقط فازِ گام (۱۲→۱۶ = L قهرمان؛ cadence 2.3→~1.8) — سرعت حرکت دست‌نخورده
  golem:    { hp: 60,  speed: 13, range: 20, windup: 0.50, dmg: 12, stride: 16, cool: 1.6 },
  spider:   { hp: 16,  speed: 38, range: 16, windup: 0.34, dmg: 4,  stride: 14, cool: 0.9 },
  ghost:    { hp: 18,  speed: 28, range: 18, windup: 0.40, dmg: 5,  stride: 12, cool: 1.2 },
  // ن۴۴ — هیولاهای معماری‌های جدید
  mummy:    { hp: 46,  speed: 15, range: 18, windup: 0.50, dmg: 9,  stride: 12, cool: 1.35 }, // تانکِ کند، سکه‌دار
  archer:   { hp: 18,  speed: 30, range: 15, windup: 0.45, dmg: 5,  stride: 12, cool: 1.7 },  // تیرانداز
  ram:      { hp: 34,  speed: 22, range: 16, windup: 0.55, dmg: 8,  stride: 16, cool: 1.5 },  // یورش
  yeti:     { hp: 40,  speed: 21, range: 19, windup: 0.48, dmg: 7,  stride: 14, cool: 1.3 },  // کندکننده
  imp:      { hp: 16,  speed: 36, range: 15, windup: 0.42, dmg: 4,  stride: 12, cool: 1.6 },  // گلوله‌ی آتش
  bandit:   { hp: 22,  speed: 46, range: 15, windup: 0.35, dmg: 3,  stride: 16, cool: 1.0 },  // دزد سکه
  hare:     { hp: 14,  speed: 60, range: 15, windup: 0.30, dmg: 4,  stride: 18, cool: 0.9 },  // جهش‌گر
  zombie:   { hp: 40,  speed: 16, range: 17, windup: 0.50, dmg: 8,  stride: 12, cool: 1.3 },  // ن۱۴۰: کند و پرجان
  scorpion: { hp: 22,  speed: 40, range: 17, windup: 0.36, dmg: 6,  stride: 14, cool: 1.0 },  // سریع، نیش
  shroom:   { hp: 26,  speed: 20, range: 18, windup: 0.45, dmg: 5,  stride: 10, cool: 1.2 },  // هاگ
  lizard:   { hp: 30,  speed: 34, range: 22, windup: 0.40, dmg: 7,  stride: 14, cool: 1.1 },  // نیزه‌ی بلند
  knight:   { hp: 52,  speed: 22, range: 20, windup: 0.52, dmg: 11, stride: 14, cool: 1.4 },  // زره‌پوش
  demon:    { hp: 44,  speed: 30, range: 19, windup: 0.42, dmg: 10, stride: 14, cool: 1.1 },  // اهریمن
  boss:     { hp: 250, speed: 16, range: 26, windup: 0.48, dmg: 16, stride: 22, cool: 1.8 },
};
export const MSTATS = STATS; // ن۱۳۹: برای هم‌ترازیِ خانواده‌ها در dungeon.js
const _lordS = {}; // آمارِ «باسِ خانواده»: بُردِ بیشتر، کمی کندتر
const lordStats = (k) => _lordS[k] || (_lordS[k] = { ...STATS[k], range: STATS[k].range * 1.7, speed: STATS[k].speed * 0.85, cool: STATS[k].cool * 1.1 });
export const LORD_SCALE = 1.6;
function scaleUp(s, k) { // نزدیک‌ترین همسایه — پیکسل‌آرتِ درشت‌تر برای باسِ خانواده
  const W = Math.round(s.w * k), H = Math.round(s.h * k), t = new s.constructor(W, H);
  for (let y = 0; y < H; y++) { const sy = Math.min(s.h - 1, (y / k) | 0); for (let x = 0; x < W; x++) { const si = (sy * s.w + Math.min(s.w - 1, (x / k) | 0)) * 4, di = (y * W + x) * 4; t.d[di] = s.d[si]; t.d[di + 1] = s.d[si + 1]; t.d[di + 2] = s.d[si + 2]; t.d[di + 3] = s.d[si + 3]; } }
  // ظاهرِ «باس»: بدنِ تیره‌تر و گرم‌تر + هاله‌ی دوپیکسلیِ آتشین دورِ سیلوئت + تاجِ طلاییِ خاردار روی سر
  const d = t.d, A = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 220) { A[i] = 1; const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; d[i * 4] = Math.min(255, r * 0.9 + 18); d[i * 4 + 1] = g * 0.78; d[i * 4 + 2] = b * 0.8; }
  const near = (x, y, rr) => { for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < W && Y < H && A[Y * W + X]) return true; } return false; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (A[i] || d[i * 4 + 3] > 220) continue;
    if (near(x, y, 1)) { d[i * 4] = 255; d[i * 4 + 1] = 120; d[i * 4 + 2] = 60; d[i * 4 + 3] = 230; } else if (near(x, y, 2)) { d[i * 4] = 200; d[i * 4 + 1] = 60; d[i * 4 + 2] = 50; d[i * 4 + 3] = 110; } }
  let top = -1, sx = 0, n = 0; for (let y = 0; y < H && top < 0; y++) for (let x = 0; x < W; x++) if (A[y * W + x]) { if (top < 0) top = y; if (y === top) { sx += x; n++; } }
  if (top > 8) { const cx = Math.round(sx / n), G = [236, 200, 72, 255], GD = [176, 128, 40, 255], R = [220, 60, 60, 255];
    const px = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } };
    for (let x = -6; x <= 6; x++) { px(cx + x, top - 1, GD); px(cx + x, top - 2, G); }
    for (const [ox, h] of [[-6, 3], [-3, 4], [0, 6], [3, 4], [6, 3]]) for (let k = 0; k < h; k++) px(cx + ox, top - 3 - k, k === h - 1 ? [255, 236, 150, 255] : G);
    px(cx, top - 2, R); px(cx - 3, top - 2, R); px(cx + 3, top - 2, R); }
  return t;
}
export const ALL_KINDS = [...MONSTER_KINDS, 'boss'];


export class Monster {
  constructor(kind, x, y, phase = 1, muls = {}) {
    this.kind = kind; this.x = x; this.y = y; this.phase = phase;
    this._phaseShown = phase; this._phaseFlash = 0; // S6.6: وضعیتِ نمایشیِ گذارِ فاز (فقط ظاهر)
    this.lord = !!muls.lord; // ن۱۳۹: باسِ مخصوصِ خانواده (نسخه‌ی غول‌پیکرِ همان هیولا)
    const s = this.lord ? lordStats(kind) : STATS[kind];
    this.isElite = !!muls.elite; // تاج‌دار: قوی‌تر، غنیمت بیشتر (منبع واحد ضریب)
    this.dmg = s.dmg * (muls.dmgMul ?? 1) * (this.isElite ? 1.35 : 1);
    this.hp = s.hp * (muls.hpMul ?? 1) * (this.isElite ? 2.1 : 1); this.maxHp = this.hp;
    this.state = 'idle'; this.t = 0; this.ph = 0; this.time = Math.random() * 10;
    this.face = 1; this.flash = 0; this.didHit = false; this.dead = false;
    this.idleT = 0.4 + Math.random() * 0.8; this.coolT = 0;
    this.atk = 'slam';
    this.kbx = 0; this.kby = 0; // ضربه‌ی عقب
  }
  get isBoss() { return this.kind === 'boss' || this.lord; }

  update(dt, target, hooks = {}) {
    this.time += dt;
    if (this.flash > 0) this.flash -= dt;
    const s = this.lord ? lordStats(this.kind) : STATS[this.kind];
    const spd = s.speed * (this.phase === 3 ? 1.4 : this.phase === 2 ? 1.2 : 1) * (this.isElite ? 1.1 : 1);

    // knockback با اصطکاک (و احترام به دیوارها)
    if (this.kbx || this.kby) {
      const nx = this.x + this.kbx * dt, ny = this.y + this.kby * dt;
      const solid = hooks.solid || (() => false);
      if (!solid(nx, this.y)) this.x = nx; else this.kbx = 0;
      if (!solid(this.x, ny)) this.y = ny; else this.kby = 0;
      const dec = Math.max(0, 1 - 9 * dt);
      this.kbx *= dec; this.kby *= dec;
      if (Math.abs(this.kbx) < 2) this.kbx = 0;
      if (Math.abs(this.kby) < 2) this.kby = 0;
    }
    if (this.state === 'die') {
      this.t += dt / 0.7;
      if (this.t >= 1) { this.t = 1; this.dead = true; }
      return;
    }
    // ن۴۴: رفتار ویژه‌ی هیولاهای جدید — اگر مدیریت کرد، ماشین پایه رد می‌شود
    const ext = AI_EXT[this.kind];
    if (ext && ext(this, dt, target, hooks, s, spd)) return;
    if (this.state === 'idle') {
      this.t += dt;
      if (target) {
        const d = Math.hypot(target.x - this.x, target.y - this.y);
        if (d > s.range) this._set('move');
        else this._set('attack');
      } else if (this.t > this.idleT + 1.2) this._set('move');
    } else if (this.state === 'move') {
      this.t += dt;
      if (target) {
        const dx = target.x - this.x, dy = target.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d <= s.range) { this._set('attack'); return; }
        this.face = dx >= 0 ? 1 : -1;
        const mv = Math.min(d, spd * dt);
        const nx = this.x + (dx / d) * mv, ny = this.y + (dy / d) * mv;
        const solid = hooks.solid || (() => false);
        if (!solid(nx, this.y)) this.x = nx;               // جداشدن محورها برای سر خوردن روی دیوار
        else if (!solid(this.x, ny)) this.y = ny * 0 + this.y; // (قفل محور x)
        if (!solid(this.x, ny)) this.y = ny;
        this.ph = (this.ph + mv / s.stride) % 1;
      } else { this.ph = (this.ph + spd * dt / s.stride) % 1; this.x += this.face * spd * dt * 0.3; if (this.t > 2.5) this._set('idle'); }
    } else if (this.state === 'attack') {
      // ۳۰٪ اول wind-up است (خوانا)، ضربه در t=0.5 اعمال می‌شود
      this.t += dt / (this.isBoss ? 1.4 : 0.7);
      if (target) this.face = target.x >= this.x ? 1 : -1;
      if (this.t >= 0.5 && !this.didHit) {
        this.didHit = true;
        hooks.onHit && hooks.onHit(this, this.dmg);
      }
      if (this.t >= 1) { this.coolT = s.cool; this._set('cool'); }
    } else if (this.state === 'cool') {
      this.t += dt;
      if (this.t > this.coolT) this._set(target ? 'move' : 'idle');
    }
  }
  _set(st) { this.state = st; this.t = 0; this.didHit = false; if (st === 'attack' && this.isBoss) this.atk = ['slam', 'sweep', 'roar'][Math.floor(Math.random() * 3)]; }

  hurt(n, kbx = 0, kby = 0) {
    if (this.state === 'die' || this.dead) return;
    this.hp -= n; this.flash = 0.14;
    const kbR = this.isBoss ? 0.18 : 1;
    this.kbx += kbx * kbR; this.kby += kby * kbR;
    if (this.hp <= 0) { this.hp = 0; this._set('die'); }
    else if (this.isBoss) this.phase = this.hp > this.maxHp * 0.66 ? 1 : this.hp > this.maxHp * 0.33 ? 2 : 3;
  }

  // اسپرایت کش‌شده (۸ فریم فاز/زمان)
  sprite() {
    const q = (v) => Math.floor(v * 8) / 8;
    // S6.6: گذارِ فاز — فقط ظاهر (مدل/گیم‌پلی دست‌نخورده): دو فریمِ نخستِ فازِ تازه = لرزش + جرقه + فلشِ سفید
    let phaseFlash = 0;
    if (this.isBoss) {
      if (this._phaseShown !== this.phase) { this._phaseShown = this.phase; this._phaseFlash = 2; }
      if (this._phaseFlash > 0) { phaseFlash = 1; this._phaseFlash--; }
    }
    const key = `${this.lord ? 'L' : ''}${this.kind}|${this.state}|${q(this.t)}|${q(this.ph)}|${this.face}|${this.flash > 0 ? 1 : 0}|${this.atk}|${this.phase}|${phaseFlash}`;
    let s = Monster._cache.get(key);
    if (!s) {
      const o = { state: this.state, t: q(this.t), ph: q(this.ph), face: this.face, time: this.time, hit: this.flash > 0 };
      s = this.kind === 'boss' ? drawBossFrame({ ...o, atk: this.atk, phase: this.phase, phaseFlash }) : drawMonsterFrame(this.kind, o);
      if (this.lord) s = scaleUp(s, LORD_SCALE);
      Monster._cache.set(key, s); // snap پالت داخلِ draw*Frame (خط لولهٔ S6.1) — سقف حافظه در makeSpriteCache
    }
    return s;
  }
}
Monster._cache = makeSpriteCache(300, 90); // سقف ۳۰۰×۶۴KB≈۱۹MB — حذفِ ۹۰ قدیمی‌ترین در ترتیبِ درج
