// floors/tiers.js — ۲۰ «فصل» × ۵ طبقه = ۱۰۰ طبقه (ن۱۳۹). هر فصل یک خانواده‌ی هیولا + تم + باسِ مخصوصِ همان خانواده (طبقه‌ی ۵ام).
// قدرت درونِ فصل طبقه‌به‌طبقه بالا می‌رود (hpMul/dmgMul در dungeon.js). فصل‌های ۱۵+ = لشکرهای ترکیبی؛ طبقه‌ی ۱۰۰ = اهریمنِ نهایی.
// theme: ۰ سنگ · ۱ خزه · ۲ گدازه · ۳ یخ · ۴ باتلاق · ۵ معدن
export const TIERS = [
  { mobs: ['slime'],             theme: 0, name: { fa: 'سیاه‌چالِ لزج',    en: 'Slime Cellars' },     lord: { fa: 'شاه‌لجن',          en: 'Slime King' } },
  { mobs: ['bat'],               theme: 1, name: { fa: 'غارِ بال‌ها',       en: 'Wing Caves' },        lord: { fa: 'مادرِ خفاش‌ها',     en: 'Bat Matriarch' } },
  { mobs: ['hare'],              theme: 1, name: { fa: 'لانه‌ی جهنده‌ها',   en: 'Warren Deep' },       lord: { fa: 'خرگوشِ غول',       en: 'Giant Hare' } },
  { mobs: ['spider'],            theme: 4, name: { fa: 'تارستانِ مرطوب',   en: 'Webbed Marsh' },      lord: { fa: 'ملکه‌ی تار',        en: 'Web Queen' } },
  { mobs: ['bandit'],            theme: 5, name: { fa: 'معدنِ راهزنان',    en: 'Bandit Mine' },       lord: { fa: 'سرکرده‌ی راهزنان',  en: 'Bandit Chief' } },
  { mobs: ['skeleton'],          theme: 0, name: { fa: 'گورستانِ زیرین',   en: 'Under Crypt' },       lord: { fa: 'سردارِ استخوان',    en: 'Bone General' } },
  { mobs: ['ghost'],             theme: 3, name: { fa: 'تالارهای یخ‌زده',  en: 'Frozen Halls' },      lord: { fa: 'شبحِ سپید',         en: 'Pale Wraith' } },
  { mobs: ['imp'],               theme: 2, name: { fa: 'کوره‌های آتش',     en: 'Fire Forges' },       lord: { fa: 'شیطانکِ اعظم',      en: 'Arch Imp' } },
  { mobs: ['archer'],            theme: 0, name: { fa: 'دژِ کمانداران',    en: 'Archer Keep' },       lord: { fa: 'تیرانداز‌ِ سایه',    en: 'Shadow Marksman' } },
  { mobs: ['wolf'],              theme: 1, name: { fa: 'کنامِ گرگ‌ها',      en: 'Wolf Den' },          lord: { fa: 'گرگِ پیر',          en: 'Elder Wolf' } },
  { mobs: ['ram'],               theme: 5, name: { fa: 'تونل‌های شاخ',     en: 'Horn Tunnels' },      lord: { fa: 'قوچِ آهنین',        en: 'Iron Ram' } },
  { mobs: ['yeti'],              theme: 3, name: { fa: 'یخچالِ ژرف',       en: 'Deep Glacier' },      lord: { fa: 'یتیِ کهن',          en: 'Ancient Yeti' } },
  { mobs: ['mummy'],             theme: 4, name: { fa: 'مقبره‌های غرق',    en: 'Sunken Tombs' },      lord: { fa: 'فرعونِ باتلاق',     en: 'Bog Pharaoh' } },
  { mobs: ['golem'],             theme: 2, name: { fa: 'قلبِ مذاب',        en: 'Molten Core' },       lord: { fa: 'غولِ گدازه',        en: 'Magma Colossus' } },
  { mobs: ['skeleton', 'archer'], theme: 0, name: { fa: 'لشکرِ مردگان',    en: 'Legion of the Dead' }, lord: { fa: 'سردارِ استخوان',    en: 'Bone General' } },
  { mobs: ['ghost', 'bat'],      theme: 3, name: { fa: 'شبِ بی‌پایان',     en: 'Endless Night' },     lord: { fa: 'شبحِ سپید',         en: 'Pale Wraith' } },
  { mobs: ['imp', 'golem'],      theme: 2, name: { fa: 'آتشفشانِ خفته',    en: 'Sleeping Volcano' },  lord: { fa: 'غولِ گدازه',        en: 'Magma Colossus' } },
  { mobs: ['wolf', 'yeti'],      theme: 3, name: { fa: 'کولاکِ وحشی',      en: 'Wild Blizzard' },     lord: { fa: 'یتیِ کهن',          en: 'Ancient Yeti' } },
  { mobs: ['mummy', 'spider'],   theme: 4, name: { fa: 'باتلاقِ نفرین',    en: 'Cursed Bog' },        lord: { fa: 'ملکه‌ی تار',        en: 'Web Queen' } },
  { mobs: ['golem', 'ghost', 'imp', 'mummy'], theme: 2, name: { fa: 'دروازه‌ی اهریمن', en: 'Demon Gate' }, lord: { fa: 'اهریمن', en: 'The Demon' }, final: true },
];
export const tierOf = (f) => TIERS[Math.min(TIERS.length - 1, Math.floor((f - 1) / 5))];
export const isBossFloor = (f) => f % 5 === 0;
export const floorInTier = (f) => ((f - 1) % 5) + 1; // ۱..۵
