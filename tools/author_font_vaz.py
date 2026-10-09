#!/usr/bin/env python3
# author_font_vaz.py — S9.1: رسترِ تک‌رنگِ Vazirmatn (OFL) → js/art/font_fa.js (بیت‌مپِ داخلی؛ بازی فایلِ فونت ندارد)
# استفاده: python3 tools/author_font_vaz.py /tmp/vaz.ttf [px=11] --write   (بخشِ کدِ font_fa.js پس از نشانه‌ی «رمزگشایی» حفظ می‌شود)
import sys, unicodedata, base64
from PIL import Image, ImageFont, ImageDraw
TTF = sys.argv[1]; PX = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 12
WRITE = '--write' in sys.argv
font = ImageFont.truetype(TTF, PX, layout_engine=ImageFont.Layout.RAQM)
ZWJ = '\u200d'
FA_BASE = set(map(ord, 'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقلمنهوىيپچژکگی'))
codes = set(range(0x20, 0x7F)) | set(range(0x6F0, 0x6FA)) | set(map(ord, '،؛؟٪×·—«»→✦…')) | FA_BASE
forms = {}  # base(or 'LA'+alef) → {iso,ini,med,fin: code}
TAG = {'<isolated>': 'i', '<initial>': 'b', '<medial>': 'm', '<final>': 'f'}
for cp in list(range(0xFB50, 0xFE00)) + list(range(0xFE70, 0xFEFD)):
    dec = unicodedata.decomposition(chr(cp)).split()
    if not dec or dec[0] not in TAG: continue
    bases = [int(x, 16) for x in dec[1:]]
    if len(bases) == 1 and bases[0] in FA_BASE: key = bases[0]
    elif len(bases) == 2 and bases[0] == 0x644 and bases[1] in (0x627, 0x622, 0x623, 0x625): key = 0x10000 + bases[1]
    else: continue
    forms.setdefault(key, {})
    if TAG[dec[0]] not in forms[key]: forms[key][TAG[dec[0]]] = cp; codes.add(cp)
cmap = set()
from fontTools.ttLib import TTFont
cmap = set(TTFont(TTF).getBestCmap().keys())
codes = sorted(c for c in codes if c in cmap or c == 0x20)
asc, desc = font.getmetrics()
M = PX
G = []
# فرمِ بافتی با HarfBuzz (raqm) از راهِ ZWJ: همان گلیف‌های GSUBِ فارسیِ فونت، نه گلیف‌های قدیمیِ «presentation form»
CTX = {}
for k, v in forms.items():
    base = chr(k) if k < 0x10000 else '\u0644' + chr(k - 0x10000)
    for tag, cp in v.items(): CTX[cp] = {'i': ('', base, ''), 'b': ('', base, ZWJ), 'm': (ZWJ, base, ZWJ), 'f': (ZWJ, base, '')}[tag]
for c in codes:
    pre, ch, post = CTX.get(c, ('', chr(c), ''))
    s = pre + ch + post
    rtl = any(0x600 <= ord(x) <= 0x6FF for x in ch)
    kw = dict(direction='rtl', language='fa') if rtl else {}
    adv = round(font.getlength(s, **kw) - (font.getlength(pre + post, **kw) if (pre or post) else 0))
    im = Image.new('L', (adv + 2 * M, asc + desc + 4), 0); d = ImageDraw.Draw(im); d.fontmode = '1'
    d.text((M, 2), s, font=font, fill=255, **kw)
    G.append((c, adv, im))
# جعبه‌ی عمودیِ مشترک
ys = [y for _, _, im in G for y in range(im.height) if any(im.getpixel((x, y)) for x in range(im.width))]
y0, y1 = min(ys), max(ys)
H = y1 - y0 + 1
bits = bytearray(); idx = []
for c, adv, im in G:
    xs = [x for x in range(im.width) if any(im.getpixel((x, y)) for y in range(y0, y1 + 1))]
    if not xs: idx.append([c, adv, 0, 0, 0]); continue
    xa, xb = min(xs), max(xs); bw = xb - xa + 1
    off = len(bits) * 8 if False else None
    rowbits = []
    for y in range(y0, y1 + 1):
        for x in range(xa, xb + 1): rowbits.append(1 if im.getpixel((x, y)) else 0)
    idx.append([c, adv, xa - M, bw, len(rowbits)])
    G_bits = rowbits
    bits.extend(bytes([0]))  # placeholder removed below
    bits = bits[:-1]
    idx[-1].append(G_bits)
stream = []
for e in idx:
    if len(e) == 6: e[4] = len(stream); stream.extend(e[5]); e.pop()
    else: e[4] = len(stream)
pad = (-len(stream)) % 8; stream += [0] * pad
blob = bytes(int(''.join(map(str, stream[i:i + 8])), 2) for i in range(0, len(stream), 8))
b64 = base64.b64encode(blob).decode()
# baseline نسبت به بالای جعبه
base = asc + 2 - y0
FORMS = {k: [v.get('i', 0), v.get('b', 0), v.get('m', 0), v.get('f', 0)] for k, v in forms.items()}
print(f'px={PX} H={H} base={base} glyphs={len(idx)} forms={len(FORMS)} blob={len(blob)}B b64={len(b64)}')
if WRITE:
    tbl = ','.join(f'{c},{a},{o},{w},{s}' for c, a, o, w, s in idx)
    fm = ','.join(f'{k},' + ','.join(map(str, v)) for k, v in sorted(FORMS.items()))
    src = open('js/art/font_fa.js').read() if False else None
    out = f"""// art/font_fa.js — S9.1: فونتِ فارسیِ متصل (بیت‌مپِ رسترشده از Vazirmatn {PX}px، OFL) + شکل‌دهیِ عربی
// تولیدی: python3 tools/author_font_vaz.py <ttf> {PX} --write — دستی ویرایش نکن (جز بخشِ کد پایین)
export const FA_H = {H}, FA_BASE = {base};
const B64 = '{b64}';
const TBL = [{tbl}];
const FRM = [{fm}];
"""
    import os
    MARK = '// ---------- رمزگشایی'
    dst = 'js/art/font_fa.js'
    seed = sys.argv[sys.argv.index('--code') + 1] if '--code' in sys.argv else dst
    code = open(seed).read(); code = code[code.index(MARK):]  # بخشِ کد حفظ می‌شود
    open(dst, 'w').write(out + code)
    print('wrote js/art/font_fa.js')
