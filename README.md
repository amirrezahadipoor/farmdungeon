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
```
وضعیت: `ROADMAP.md` · حافظه‌ی ایجنت: `MEMORY.md`.
