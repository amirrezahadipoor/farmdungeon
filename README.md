# Farm Dungeon

بازیِ پیکسلیِ مزرعه + دانجن، تک‌فایلی و بدون وابستگیِ بیرونی.

## اجرا
```
node serve.mjs          # سپس http://localhost:8080
```
یا مستقیم `game.html` را در مرورگر باز کنید (باندلِ تک‌فایلی).

## ساخت و تست
```
node tools/build_single.mjs   # js/ → game.html
bash tools/run_all.sh         # بیلد + بوت jsdom + رگرسیونِ رندر
node tools/art_audit.mjs      # ۱۱ سنجه‌ی هنری → shots/audit.json
node tools/sheet.mjs all      # شیت‌ها و صحنه‌های مرجع → shots/
```
وضعیت و تاریخچه: `ROADMAP.md`، `MEMORY.md`، `roadmap/`.
