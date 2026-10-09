// build_single.mjs — باندل تک‌فایلی مقاوم: هر ماژول در IIFE خودش، صادرات به global تزریق می‌شوند
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = ['raster', 'art/ramps', 'art/palette_hero', 'art/palette_master', 'art/palette_snap', 'art/outline', 'art/equipment', 'art/palette_env', 'art/noise', 'art/dither', 'art/ground', 'art/fence', 'art/decal', 'art/autotile', 'art/brick', 'art/flagstone', 'art/dungeon_decal', 'art/water', 'art/crops', 'art/font_fa', 'art/font2', 'art/farm_decor', 'art/dungeon_depth', 'art/critters', 'art/dungeon_props', 'art/recolor', 'art/weather', 'art/weather_px', 'art/motes', 'art/light', 'art/pm_snap', 'art/quality', 'art/tree', 'art/shadow', 'art/glow', 'art/farm_px', 'art/farm_buildings', 'farm_terrain', 'farm_layout', 'quests', 'art/icon_lib', 'art/ui_skin', 'art/icons', 'rpg', 'art/gate', 'farm_render', 'skeleton', 'art/rim', 'art/bake', 'art/hero_pose', 'art/hero_px', 'art/hero_art', 'art/hero_map', 'art/hero', 'tiles', 'art/monster_parts', 'art/mob_motion', 'art/monster_bodies4', 'art/monster_bodies2', 'art/monster_bodies3', 'art/monster_bodies', 'art/mob_px', 'art/mob_px2', 'art/mob_px3', 'art/monster_registry', 'art/monsters', 'art/boss_px', 'art/boss', 'art/battle_fx', 'mobs_new', 'projectiles', 'monster', 'floors/tiers', 'floors/f001_010', 'floors/f011_020', 'floors/f021_040', 'floors/f041_060', 'floors/f061_080', 'floors/index', 'dungeon_gen', 'art/dungeon_paint', 'loot_table', 'astar', 'farm', 'items', 'farm_worker', 'fx', 'night', 'art/animals', 'livestock', 'merchant', 'farm_command', 'game_apply', 'game', 'dungeon', 'run_loot', 'run_combat', 'run', 'dungeon_bake', 'run_render', 'app', 'save', 'i18n', 'ui', 'input', 'sfx/engine', 'sfx/ambience_farm', 'sfx/ambience_dungeon', 'sfx/rain_layer', 'sfx/till', 'sfx/water', 'sfx/plant', 'sfx/harvest', 'sfx/coin', 'sfx/apple', 'sfx/golden', 'sfx/upgrade', 'sfx/gate', 'sfx/floor', 'sfx/hit', 'sfx/kill', 'sfx/hurt', 'sfx/boss', 'sfx/shrine', 'sfx/chest', 'sfx/quest', 'sfx/ui', 'sfx/skill', 'sfx/shoot', 'sfx/fire', 'sfx/sounds', 'ui_shrine', 'ui_hud', 'app_ui', 'watchdog', 'main_scene'];

function stripModule(src, names) {
  // حذف ایمپورت‌های تک‌خطی
  src = src.replace(/^import[^\n]*$/gm, '');
  // export const/let/var (شامل اعلان چندتایی) — بدون گرفتارشدن در پرانتزها
  src = src.replace(/^export[ \t]+(const|let|var)[ \t]+(.*)$/gm, (_, kw, rest) => {
    let clean = rest;
    while (/\([^()]*\)/.test(clean)) clean = clean.replace(/\([^()]*\)/g, '0'); // حذف پرانتزها (پارامترها/فراخوانی‌ها)
    const re = /(^|,)\s*([A-Za-z_$][\w$]*)\s*=/g;
    let mm;
    while ((mm = re.exec(clean))) names.push(mm[2]);
    return kw + ' ' + rest;
  });
  // export function/class
  src = src.replace(/^export[ \t]+(function|class)[ \t]+([A-Za-z_$][\w$]*)/gm, (_, kw, name) => { names.push(name); return kw + ' ' + name; });
  // export { a, b }; و export { a, b } from '...'; (صادرکردن مجدد — فقط حذف)
  src = src.replace(/^export[ \t]*\{[^}]*\};?[ \t]*$/gm, '');
  src = src.replace(/^export[ \t]*\{[^}]*\}[ \t]*from[ \t]*['"][^'"]*['"];?[ \t]*$/gm, '');
  return slim(src);
}

// S8.4: سبک‌سازیِ امن — حذفِ کامنتِ تمام‌خط و تورفتگی؛ داخلِ template literalِ چندخطی دست نمی‌خورد
function slim(src) {
  const out = []; let inTpl = false;
  for (const line of src.split('\n')) {
    if (!inTpl) {
      const t = line.trim();
      if (t === '' || t.startsWith('//')) continue;
      out.push(t);
    } else out.push(line);
    const bt = (line.replace(/\\./g, '').replace(/'[^']*'|"[^"]*"/g, '').match(/`/g) || []).length;
    if (bt & 1) inTpl = !inTpl;
  }
  return out.join('\n');
}

function bundle(entryHtml, out, mainName) {
  let js = '';
  for (const m of [...BASE, mainName]) {
    const names = [];
    const id = m.replace(/[^\w$]/g, '_'); // art/palette_env → art_palette_env (شناسه‌ی معتبر JS)
    const src = stripModule(fs.readFileSync(path.join(ROOT, 'js', m + '.js'), 'utf8'), names);
    js += 'const __m_' + id + ' = (() => {\n' + src + '\nreturn {' + names.join(', ') + '};\n})();\n';
    if (names.length) js += 'const {' + names.join(', ') + '} = __m_' + id + ';\n';
  }
  js += '\n(function(){ var d = document.getElementById("__diag"); if (d) d.remove(); })();\n';
  const diag = '<div id="__diag" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#2b5a2b;color:#fff;padding:14px 20px;border-radius:12px;font:14px system-ui,sans-serif;max-width:85%;text-align:center;box-shadow:0 4px 24px #000a">در حال اجرای اسکریپت بازی…<br>loading game script…</div>\n' +
    '<script>window.addEventListener("error",function(e){var d=document.getElementById("__diag");if(!d)return;d.style.background="#7a1f1f";d.textContent="JS ERROR: "+(e.message||e.error)+" @ line "+(e.lineno||"?");});</script>\n';
  let html = fs.readFileSync(path.join(ROOT, entryHtml), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  html = html.replace(/<link rel="stylesheet"[^>]*>/, () => '<style>\n' + css + '\n</style>');
  html = html.replace(/<script type="module" src="js\/[^"]*"><\/script>/, () => diag + '<script>\n' + js + '\n</script>');
  fs.writeFileSync(path.join(ROOT, out), html);
  console.log(out, (Buffer.byteLength(html) / 1024).toFixed(1) + ' KiB (bytes)');
}

const [entry, out, main] = process.argv.slice(2);
if (entry) bundle(entry, out, main || 'main');
else { bundle('index.html', 'game.html', 'main_app'); }
