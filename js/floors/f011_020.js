// floors/f011_020.js — طراحیِ دستیِ طبقه‌های ۱۱..۲۰ (فصلِ ۳ خرگوش‌ها، فصلِ ۴ عنکبوت‌ها). ن۱۴۰.
// کلیدهای تازه: shapes (rect/oval/L/ring شکلِ اتاق)، dress (آرایش: rubble/moss/bones/puddle/web/ember/ice)، dressN (تراکم)، banners (احتمالِ پرچم).
export const F011_020 = {
  11: { name: { fa: 'لانه‌های علفی', en: 'Grassy Burrows' }, layout: 'scatter', cols: 112, rows: 84, rooms: 14, rw: [12, 18], rh: [10, 14],
    shapes: ['oval', 'oval', 'rect'], dress: ['moss', 'moss', 'rubble'], dressN: 0.14, round: 2, loops: 0.06, treasure: 2, empty: 0.3, dens: 0.9, startAt: 'left' },
  12: { name: { fa: 'تونل‌های جهش', en: 'Leaping Tunnels' }, layout: 'chain', cols: 120, rows: 84, rooms: 15, chainCols: 5, rw: [12, 16], rh: [9, 12],
    winding: true, shapes: ['oval', 'L'], dress: ['moss', 'bones'], treasure: 2, empty: 0.25, dens: 1, startAt: 'top' },
  13: { name: { fa: 'حیاطِ ریشه‌ها', en: 'Root Courtyards' }, layout: 'grid', cols: 120, rows: 90, gridCols: 5, gridRows: 4, holes: 0.2, rw: [13, 17], rh: [10, 13],
    shapes: ['ring', 'rect', 'oval'], dress: ['moss', 'puddle'], dressN: 0.12, treasure: 3, empty: 0.25, dens: 1 },
  14: { name: { fa: 'انبارِ هویج‌های گمشده', en: 'Lost Carrot Stores' }, layout: 'hub', cols: 120, rows: 90, rooms: 15, rw: [13, 19], rh: [10, 14],
    shapes: ['L', 'rect'], dress: ['rubble', 'bones', 'moss'], banners: 0.4, pillars: 0.4, treasure: 3, empty: 0.2, dens: 1.1 },
  15: { name: { fa: 'میدانِ خرگوشِ غول', en: 'Giant Hare Arena' }, layout: 'ring', cols: 128, rows: 96, rooms: 13, spokes: 3, rw: [12, 18], rh: [10, 13],
    shapes: ['oval'], dress: ['moss', 'bones'], banners: 0.5, round: 3, treasure: 2, empty: 0.15, dens: 1.1, boss: true },
  16: { name: { fa: 'مردابِ تار', en: 'Web Mire' }, layout: 'scatter', cols: 120, rows: 90, rooms: 15, rw: [13, 19], rh: [10, 14],
    shapes: ['oval', 'rect'], dress: ['web', 'puddle', 'web'], dressN: 0.12, pools: 0.6, loops: 0.08, treasure: 2, empty: 0.25, dens: 1, startAt: 'left' },
  17: { name: { fa: 'پیله‌خانه', en: 'Cocoon Halls' }, layout: 'twin', cols: 128, rows: 90, rooms: 16, rw: [12, 18], rh: [10, 13],
    shapes: ['ring', 'L'], dress: ['web', 'bones'], banners: 0.2, treasure: 2, empty: 0.2, dens: 1.1 },
  18: { name: { fa: 'گذرگاهِ نیش', en: 'Fang Passage' }, layout: 'chain', cols: 128, rows: 96, rooms: 16, chainCols: 4, rw: [12, 17], rh: [10, 13],
    winding: true, cross: 0.4, shapes: ['rect', 'oval'], dress: ['web', 'rubble'], treasure: 2, empty: 0.2, dens: 1.2, startAt: 'top' },
  19: { name: { fa: 'ستون‌های تنیده', en: 'Woven Pillars' }, layout: 'grid', cols: 128, rows: 96, gridCols: 5, gridRows: 4, holes: 0.1, rw: [13, 18], rh: [10, 13],
    pillars: 0.6, shapes: ['ring', 'rect'], dress: ['web', 'web', 'bones'], dressN: 0.13, treasure: 3, empty: 0.2, dens: 1.2 },
  20: { name: { fa: 'تختِ ملکه‌ی تار', en: 'Throne of the Web Queen' }, layout: 'ring', cols: 128, rows: 96, rooms: 14, spokes: 4, rw: [12, 18], rh: [10, 13],
    shapes: ['oval', 'ring'], dress: ['web', 'bones'], dressN: 0.14, banners: 0.5, round: 3, treasure: 2, empty: 0.1, dens: 1.3, boss: true },
};
