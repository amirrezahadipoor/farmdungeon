# MEMORY — Farm Dungeon (حافظه‌ی فشرده‌ی ایجنت)

> بازی پیکسلیِ مزرعه + دانجن، تک‌فایل (`game.html`)، Canvas 2D، بدون فایل/وابستگیِ بیرونی.
> آخرین نوبت: ن۱۳۵ (سیستم RPG). رودمپ: `ROADMAP.md` (خالی — کاربر رودمپِ گیم‌پلیِ جدید می‌گذارد).

## روال هر نشست
1. `ROADMAP.md` ← اولین `- [ ]` = کار جاری. اگر خالی بود، فقط دستورِ کاربر.
2. کد → `node tools/build_single.mjs` → `bash tools/run_all.sh` (باید `ALL GREEN`؛ ~۳٫۵ دقیقه) → push → یک خط در «تاریخچه» همین فایل + تیکِ رودمپ → گزارش کوتاه فارسی.
3. Push فقط: `GITHUB_TOKEN=… GH_REPO=amirrezahadipoor/farmdungeon bash tools/push.sh "msg"` (توکن را هرگز چاپ/ذخیره نکن؛ رد شد ⇒ `git pull --rebase`، هرگز `--force`).
4. سرور محلی: `node serve.mjs` (:8080، no-store) · تست‌های موقت فقط در `/tmp`.

## قواعد ثابت
- بدون فایل خارجی (عکس/فونت/صدا)، بدون ایموجی در UI، بدون داستان/NPC. همه چیز رویه‌ای/داده‌ی JS.
- ماژول ≤۲۸۰ خط. ماژول جدید ⇒ **حتماً در `BASE` داخلِ `tools/build_single.mjs`** (ترتیب مهم؛ وگرنه بوت سیاه/hang).
- بیلدر importها را حذف و همه را در یک اسکوپ می‌ریزد ⇒ نامِ exportها در کل پروژه یکتا؛ فقط `export const/let/function/class` (نه `export {x}`).
- اعداد UI فارسی با `faNum`؛ جداکننده‌ی متنِ فارسی «،» (نه «·» که شبیه «۰» است).
- سیو `farmDungeon.save` اسکیمای v6؛ فیلدِ تازه = اختیاری + پرکننده (مثل `ensureRpg`)، بدون شکستنِ سیوِ قدیمی.
- hitbox / HOX / HOY قهرمان را تغییر نده. انیمیشن‌ها از قطعه در کد ساخته می‌شوند (نه فریمِ AI).
- قلم داخل بوم = بیت‌مپ Vazirmatn (`font_fa`)؛ DOM = Vazirmatn ExtraBold زیرمجموعه (base64 در CSS).
- باگ‌های پنهان: watchdog خطای فریم را می‌بلعد ⇒ `localStorage.fd_watchdog` را بخوان.

## نقشه‌ی فایل‌ها (⟨خط⟩ — ۱۴۷ ماژول JS)
```
farmdungeon/
├── game.html      خروجیِ بیلد (کامیت می‌شود؛ دستی ویرایش نکن)
├── index.html⟨106⟩ شل DOM: تاپ‌بار (سکه/گوهر/Lv)، داک مزرعه/دانجن، مودال‌ها
├── css/style.css⟨308⟩ تنها CSS: فونت base64 + پوسته‌ی پیکسلیِ بازی‌گونه (R6) + RPG
├── serve.mjs⟨14⟩ · README.md · ROADMAP.md · MEMORY.md · .github/workflows/ci.yml (run_all + art_audit)
├── tools/  build_single.mjs⟨64⟩ باندلر (BASE) · run_all.sh⟨17⟩ · setup_tests.sh⟨15⟩ · push.sh⟨22⟩ · secret_guard.sh⟨8⟩
│           boot_check.mjs⟨282⟩ بوت jsdom · render5⟨158⟩/render6⟨234⟩ رگرسیون رندر · art_audit⟨433⟩ ۱۱ سنجه‌ی آرت → shots/ (gitignored)
│           sheet⟨181⟩ · hero_sheet⟨38⟩ · elite47⟨149⟩ · bench⟨71⟩ + baseline.json · soak⟨144⟩ · png⟨18⟩
│           author_font41.py⟨568⟩ / author_font_vaz.py⟨90⟩ مولدِ فونت · build_bp42.py⟨398⟩ مولد/ولیداتور نقشه‌های دانجن
└── js/
    ├── هسته: main_app⟨229⟩ entry: بوت/حلقه/ورودی/سیو/XP-برداشت · main_scene⟨102⟩ fade، ورود/خروج دانجن، bankRun(+XP، applyRunStats)
    │   raster⟨214⟩ بوم پیکسل · skeleton⟨120⟩ Locomotion/GAITS · tiles⟨7⟩ فاساد · astar⟨44⟩ · input⟨86⟩ · fx⟨141⟩ ذرات/لرزش/hit-stop
    │   night⟨159⟩ شب/روز LUT · save⟨73⟩ v6+migrate · watchdog⟨72⟩ · i18n⟨133⟩ fa/en، t()، faNum
    ├── اقتصاد/UI: app⟨205⟩ UPG(+pen/chicken/sheep/cow با req)/MEALS/آفلاین/bankLoot · quests⟨51⟩ ۳ مأموریتِ چرخان · items⟨79⟩ ۱۲ پوشیدنی
    │   **rpg⟨124⟩ سطح/XP/امتیاز، ۸ استات (str/vit/agi/crit + bounty/seeker/green/trade)، rpgSection، refreshLvChip**
    │   ui⟨164⟩ توست/بنر/منو (rpgSection بالای منو) · app_ui⟨133⟩ چسب DOM + menuHooks(onBuy/onRpg) · ui_hud⟨71⟩ · ui_shrine⟨54⟩ محراب
    ├── مزرعه: game⟨217⟩ صحنه/صف/sellAll(×trade، +محصول دامی) + feetFree (برخوردِ جای‌پا با مانع؛ حرکت مستقیم) + livestock · game_apply⟨73⟩ نتیجه‌ی ابزار، برداشت(×bounty) · farm⟨137⟩ گرید+CROPS
    │   - `js/merchant.js` — تاجرِ گاری‌دار (تنها خریدار؛ CART_CAP=50/روز، پر ⇒ می‌رود، روزِ بعد برمی‌گردد؛ save.cart={sold,away}؛ sell(game,keep)).
    │   farm_command⟨90⟩ تپ→مسیر · farm_worker⟨184⟩ کارگر · farm_layout⟨76⟩ · farm_terrain⟨280⟩ کش زمین · farm_render⟨197⟩ (دام‌ها در y-sort)
    │   **livestock⟨124⟩ آغل PEN(x1..10,y15..18، در (10,17))، stampPen، ANIMALS/GOODS، Livestock(sync/update/collect با نزدیک‌شدن)، syncGoodsChips**
    ├── دانجن: run⟨259⟩ حرکت(feetFree)/طبقه/مهارت/دوج/برکت/restart(از run._base) · run_combat⟨90⟩ حمله/کریت · run_loot⟨85⟩ دراپ(+seedP، _bossKills)
    │   run_render⟨~300⟩ fog(مه)+مینی‌مپِ کشف‌شده · dungeon⟨~120⟩ طبقه (seen/vis/reveal/roomAt، باسِ خانواده lord) · dungeon_bake⟨~270⟩ (big ⇒ paintStep)
    │   **dungeon_gen⟨165⟩ سازنده‌ی طبقه‌ی بزرگ: layout scatter/hub/chain/ring/grid/twin، نقش‌ها start/stairs/boss/treasure/shrine، groups**
    │   **floors/tiers⟨~30⟩ ۲۰ فصل×۵ (خانواده+تم+باس) · floors/index⟨~20⟩ specFor(f) (طراحی‌شده یا موقتِ auto) · floors/f001_010⟨~35⟩ طراحیِ دستیِ ۱..۱۰**
    │   **loot_table⟨~45⟩ دراپ بر اساسِ قدرت p=طبقه+نخبه۸+باس۲۰ (SEED_LVL/ITEM_LVL، افتِ نمایی؛ بیشترِ هیولاها فقط EXP)** · art/dungeon_paint⟨~95⟩ پختِ سبکِ سه‌رخ (۶ پالتِ تم)
    │   monster⟨136⟩ STATS+نخبه · mobs_new⟨174⟩ AI ویژه · projectiles⟨45⟩
    ├── art/ (۵۹):
    │   پالت: ramps⟨69⟩ منبعِ رنگ (تغییرش outline کل بازی را عوض می‌کند!) · palette_master⟨77⟩ · palette_env⟨63⟩ · palette_hero⟨37⟩ · palette_snap⟨27⟩ · pm_snap⟨109⟩ · recolor⟨38⟩ · outline⟨75⟩ · rim⟨23⟩ · bake⟨121⟩ · quality⟨3⟩
    │   نویز/کاشی: noise⟨44⟩ · dither⟨36⟩ · autotile⟨95⟩ · ground⟨257⟩ · brick⟨127⟩ · flagstone⟨110⟩ · decal⟨71⟩ · dungeon_decal⟨119⟩ · dungeon_depth⟨65⟩ AO · water⟨146⟩ · fence⟨68⟩
    │   محیط: farm_decor⟨143⟩ · farm_buildings⟨83⟩ · farm_px⟨149⟩ خانه · tree⟨178⟩ · crops⟨218⟩ · critters⟨121⟩ · weather⟨148⟩ · weather_px⟨72⟩ · light⟨257⟩ نور دانجن · glow⟨81⟩ · shadow⟨150⟩ · motes⟨54⟩ · gate⟨49⟩ · dungeon_props⟨149⟩
    │   قهرمان: hero⟨142⟩ فریم+ابزار+halfSprite · hero_map⟨165⟩ ریگِ قطعه‌ای + SIDE_POSE پا · hero_art⟨107⟩ بالاتنه از تصویرِ AI · hero_pose⟨134⟩ پوز/HOX/HOY · hero_px⟨210⟩ · equipment⟨100⟩
    │   هیولا: monster_parts⟨104⟩ · monster_bodies⟨236⟩/2⟨204⟩/3⟨155⟩/4⟨156⟩ · mob_px⟨279⟩ · mob_px2⟨194⟩ · mob_motion⟨74⟩ · monster_registry⟨8⟩ · monsters⟨28⟩ · boss⟨107⟩ · boss_px⟨160⟩ · battle_fx⟨106⟩
    │   دام: **animals⟨156⟩ اسپرایت مرغ/گوسفند/گاو (۲ فریم راه + چریدن، آینه) + آیکون تخم/پشم/شیر**
    │   UI/فونت: font_fa⟨69⟩ بیت‌مپ Vazirmatn · font2⟨105⟩ رابط متنِ بوم · icon_lib⟨248⟩ · icons⟨101⟩ paintIcon/iconEl · ui_skin⟨73⟩ (9-slice؛ CSS فعلی از آن استفاده نمی‌کند)
    └── sfx/ (۲۶): engine⟨91⟩ · sounds⟨67⟩ ثبت/ambient · ambience_farm/dungeon⟨13⟩ · ۲۲ صدای ۳–۷ خطی (till, water, plant, harvest, coin, …)
```

## اعداد کلیدی
- اقتصاد: هزینه‌ی ارتقا = base×1.15^lvl · شروع ۶۰ سکه + ۶ بذر هویج · بذر فقط از هیولا (معمولی ۲۲٪ / نخبه ۵۵٪ / باس ×۲).
- محصول (ثانیه/فروش): هویج ۳۰/۲۰ · گندم ۵۵/۴۶ · کدو ۱۰۰/۱۱۵ · توت ۸۰/۹۰ · بادمجان ۱۵۰/۲۱۰ · ذرت ۲۲۰/۳۴۰ (سه تای آخر فقط باغ).
- دانجن: hp×(1+0.13(f−1)) · dmg×(1+0.075(f−1)) · باس هر ۱۰ طبقه · کریت پایه ۱۲٪ ×۱٫۸ · دوربین y تا −52 (پشت HUD).
- RPG: xpNeed=20·lvl^1.5 · XP: برداشت ۲، شکار ۴، نخبه ۱۰، طبقه ۸، باس ۶۰ · امتیاز/سطح ۱ · خرید 250·1.4^n سکه · سقف استات ۲۵
  اثر/امتیاز: str +۶٪ آسیب · vit +۸ جان · agi +۳٪ سرعت · crit +۲٪ · bounty +۴٪ برداشت×۲ · seeker +۳٪ بذر اضافه · green +۴٪ رشد · trade +۳٪ فروش.
- دام: آغل ۴۰۰ · مرغ ۱۵۰→۴۶۰ (×۴، تخم ۴۰ث/۱۴) · گوسفند ۶۰۰→۱۲۵۰ (×۳، پشم ۹۰ث/۴۸) · گاو ۱۵۰۰/۲۳۰۰ (×۲، شیر ۱۴۰ث/۹۵) · ۳ XP هر محصول.
- قهرمان: ۴۴px، اسپرایت ۶۴×۸۰ → halfSprite.

## درس‌های مهم
1. ماژول جدید بدون BASE ⇒ بازی سیاه. بعد از هر بیلد، بوت jsdom (`run_all`).
2. `ramps.js` / پالت مستر سراسری‌اند؛ تم یا مادّه‌ی تازه = نگاشت به خانواده‌ی رمپ موجود.
3. پاچ اسکریپتی روی خطوطِ دارای کامنت فارسی شکننده است ⇒ بعدش grep/assert و syntax-check.
4. پای ۴۴px با IK کج دیده می‌شود ⇒ گام‌های مستقیم؛ پای دور فقط یک تُن تیره‌تر.
5. `run_all.sh` ممکن است سرور 8080 را ببندد ⇒ بعدش دوباره بالا بیاور. `pkill -f node` شلِ ابزار را می‌کشد.
6. `push.sh` همه چیز را `git add -A` می‌کند ⇒ فایل موقت در ریپو نگذار.
7. `tools/bench.mjs` فایل `tools/baseline.json` را بازنویسی می‌کند.

## تاریخچه (یک خط در نوبت)
- ن۱–ن۱۳۳: فازهای P0–P10 کامل (موتور، اقتصاد، دانجن ۶ تم، آرت v2/v3، فونت فارسی، قهرمانِ AI با ریگِ قطعه‌ای). جزئیات در تاریخچه‌ی git.
- ن۱۳۴: R6 پوسته‌ی UI بازی‌گونه + باگ‌فیکس (ارقام فارسی، «·»→«،»، favicon 404، FPS مخفی، نوار جان کوچک).
- ن۱۳۵: سیستم RPG (`js/rpg.js`) + فیکسِ restart (کریتِ تجهیز/برکتِ آسیب).
- ن۱۳۶: پاکسازی ریپو — MEMORY فشرده، رودمپ و `roadmap/` و `shots/` حذف، `hero_ref.js` و `hero_ref_shot.mjs` مرده حذف.
- ن۱۳۷: فیکس برخورد (حرکت مستقیم در مزرعه از حصار/درخت/خانه/آب رد می‌شد؛ دانجن نصف بدن در دیوار) با feetFree + دامداری (آغل/مرغ/گوسفند/گاو، خریدنی).

- ن۱۳۸: سه آغلِ جدا coop/fold/barn (req worker، هرکدام ۵ حیوان، ساختمان روی نقشه پس از خرید، cell.block)؛ فروشِ مستقیم حذف ⇒ فقط تاجر (merchant.js)؛ کارگر محصولِ دام را جمع و به تاجر می‌فروشد (۵ تا از هر محصول نگه می‌دارد)؛ سبد ⇒ انبار؛ migrate pen/chicken/sheep/cow؛ گاریِ پارک‌شده تایل‌های (21..22,17) را block می‌کند؛ تاجر = FarmWorker variant 2 (آبی→قرمز).
- ن۱۳۹: دانجنِ ۱۰۰ طبقه — طبقه‌های بزرگِ تو‌در‌تو (۹۶×۷۲ تا ۱۲۸×۹۶)، مهِ جنگ (اتاق تا ورود سیاه، هیولاهایش خواب/نامرئی، بیدار در بُرد ۱۲۵px یا پس از زخم)، فصل‌های ۵طبقه‌ای (خانواده‌ی هیولا + باسِ غول‌پیکرِ همان خانواده ×۱٫۶)، دراپِ قدرت‌محور. بلوپرینت‌های ۳۰×۲۰ و js/dungeon/ حذف. **طراحی‌شده: ۱..۱۰؛ بعدی: f011_020.js (فصل ۳ خرگوش، ۴ عنکبوت) و به همین ترتیب تا ۱۰۰** — بقیه فعلاً spec موقت (auto) دارند.

- ن۱۴۰: tiers 15–20 تک‌خانواده (zombie/scorpion/shroom/lizard/knight/demon از `js/art/mob_px3.js`، MSTATS در monster.js)؛ طبقه‌ی ۱۰۰ = لردِ demon (hp×16). لردها: تیره + هاله‌ی آتشین + تاجِ طلایی (scaleUp). dropها کم و همه پوچ‌پذیر (باس: بذر ۷۰٪، آیتم ۴۰٪، سکه ۸۵٪). dungeon_gen: shapes (oval/L/ring)، dress (فرش/موزاییک/طلا/آوار/خزه/استخوان/تار/پرچم) نقاشی در dungeon_paint، تالارِ باس بزرگ‌تر، پاک‌سازیِ جیب‌های جدا. طبقه‌های ۱–۲۰ دستی؛ ۲۱–۱۰۰ auto.
- ن۱۴۱: طبقه‌های ۲۱–۴۰ دستی (`f021_040.js`: معدن/گورستان/یخ/کوره)؛ dress جدید در dungeon_paint: rails/grave/candle/crystal/crack. ۴۱–۱۰۰ هنوز auto.
- ن۱۴۲: طبقه‌های ۴۱–۸۰ دستی (`f041_060.js` کماندار/گرگ/قوچ/یتی، `f061_080.js` مومیایی/غول/زامبی/عقرب)؛ dress جدید: arrows/claw/snow/sand/vine. ۸۱–۱۰۰ هنوز auto.
- ن۱۴۳: طبقه‌های ۸۱–۱۰۰ دستی (`f081_100.js` قارچ/مارمولک/شوالیه/اهریمن؛ ۱۰۰ = نقشه‌ی ۱۶۸×۱۱۲). dress جدید: spore/rune/armor/scale. **هر ۱۰۰ طبقه طراحی‌شده؛ specFor auto دیگر استفاده نمی‌شود (fallback).** ۴۱–۸۰ با اسکریپت جدول‌محور ساخته شده‌اند.
- ن۱۴۴: ۴۱–۸۰ بازطراحیِ کاملاً دستی (جایگزینِ جدول‌محور). centre (قطعه‌ی مرکزیِ ۲×۲ مسدود: well/fire/statue/altar/cage/tree/crystal/anvil/coffin/fountain/bones) در dungeon_gen + paintCentre در dungeon_paint، برای هر ۱۰۰ طبقه. حیاطِ ring = ردیفِ ستونِ توخالی؛ محراب ستون نمی‌گیرد (رفعِ تداخلِ موزاییک).
- ن۱۴۵ (باگ‌ها، با `/tmp/dg/audit.mjs` روی ۱۰۰ طبقه): هیولا روی ستون/آب (پاک‌سازیِ جیب‌ها حالا قبل از جاگذاری؛ floorAt fallback امن؛ نگهبانانِ باس روی کفِ اتاق)، آرایشِ تکراری/زیرِ اشیا (Set used)، پرچم روی مشعل، دکورِ ریز روی آرایش. آب در اوورویوی آفلاین کشیده نمی‌شود (run_render زنده می‌کشد) — باگ نیست.
- ن۱۴۶: ادامه‌ی طبقه — Run opts.startFloor = stats.bestFloor (main_scene)؛ restart در همان طبقه؛ XPِ طبقه = floor − startFloor (rpg.runXp). قطعه‌ی مرکزی در اتاقِ ≥۱۶×۱۲ ⇒ ۳×۳ (paintCentreBig، ۱٫۵×).
- ن۱۴۷: صفحه‌ی بارگذاری در index.html (div#boot + canvas پیکسلیِ زنده: آسمانِ غروب، ماه، مزرعه، دروازه‌ی دانجن، قهرمانِ رونده، کرم‌شب‌تاب؛ نوارِ پیشرفت + نکته‌ها). main_app.loop اولین فریم window.__bootReady() را صدا می‌زند؛ حداقل ۲٫۶ث، کلیک = رد.
- **برنامه‌ی ۵ نشست (درخواستِ کاربر):** N1 ✅ لودر بدون صفحه‌ی سیاه + باس دو فاز/حمله‌ی ویژه · N2 رفتارِ متفاوتِ هر ۲۰ خانواده · N3 تله‌ها · N4 اتاقِ مخفی + رویدادهای تصادفی · N5 موسیقیِ پیکسلی (مزرعه/دانجن/باس).
- ن۱۴۸ (N1): build_single باندل را `<script type=text/plain id=__main>` می‌گذارد و بعد از یک rAF اجرا می‌کند (jsdom همگام). `js/boss_ai.js`: BOSS_MOVES (nova/volley/charge/quake per family)، فاز ۲ در ≤۵۰٪ (onPhase: لرزش، احضارِ ۲ هم‌خانواده)، tele در run_render.drawTele. پرتابه‌های جدید spore/shard/web (web = کندی).
