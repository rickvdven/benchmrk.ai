"""Rebuilds server/fonts/noto-sans-kr-700.ttf: Noto Sans KR Bold, only the Hangul used in src/locales/competition.ko.json.
Run after the Korean texts change:  npm i --no-save @fontsource/noto-sans-kr && pip install fonttools brotli
  python3 scripts/korean-card-font.py   (font: OFL, from @fontsource/noto-sans-kr)"""
import glob, json, os, tempfile
from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
texts = json.load(open(os.path.join(root, 'src/locales/competition.ko.json'), encoding='utf8'))
hangul = sorted({c for c in ''.join(texts.values()) if ord(c) > 0x2E80})
done, parts, tmp = set(), [], tempfile.mkdtemp()
for f in sorted(glob.glob(os.path.join(root, 'node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-*-700-normal.woff'))):
    cmap = TTFont(f).getBestCmap()
    got = [c for c in hangul if ord(c) in cmap and c not in done]
    if not got:
        continue
    done.update(got)
    o = subset.Options(); o.layout_features = []; o.notdef_outline = True; o.name_IDs = [1, 2]
    t = TTFont(f); s = subset.Subsetter(o); s.populate(text=''.join(got)); s.subset(t); t.flavor = None
    p = os.path.join(tmp, f'p{len(parts)}.ttf'); t.save(p); parts.append(p)
missing = [c for c in hangul if c not in done]
if missing:
    raise SystemExit(f'not in the font: {missing}')
Merger().merge(parts).save(os.path.join(root, 'server/fonts/noto-sans-kr-700.ttf'))
print(f'{len(hangul)} syllables')
