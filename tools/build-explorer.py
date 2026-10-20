"""Copy the Chart Explorer (v2) into explorer/ so it can sit beside version 1 on the live site.

Run on the v2 branch:  python3 tools/build-explorer.py <output-folder>
It writes the v2 page and its own modules into the folder, pointing shared, unchanged files
(the engine, ephemeris, places, fonts, sigils, logotype) at the folder above. Version 1's files
are left as they are, so /a4a-chart/ stays version 1 and /a4a-chart/explorer/ is version 2.
"""
import pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
up = lambda s, pairs: [s := s.replace(a, b) for a, b in pairs][-1] if pairs else s
page = up((root / 'index.html').read_text(), [
    ("url(fonts/RoyalPrinting.ttf)", "url(../fonts/RoyalPrinting.ttf)"),
    ("from './lib/src/swisseph.js'", "from '../lib/src/swisseph.js'"),
    ("from './chart-core.js'", "from '../chart-core.js'"),
    ("fetch('./cities.json')", "fetch('../cities.json')"),
    ('<img src="sigil.png"', '<img src="../sigil.png"'),
    ("dataURL('sigil.png'), dataURL('sigil-black.png'), fetch('src/logotype-paths.json')", "dataURL('../sigil.png'), dataURL('../sigil-black.png'), fetch('../src/logotype-paths.json')"),
])
assert "'./chart-core.js'" not in page and "'./lib/" not in page
(out / 'index.html').write_text(page)
for name, pairs in {
    'wheel-v2.js': [("from './chart-core.js'", "from '../chart-core.js'")],
    'themes.js': [("from './chart-core.js'", "from '../chart-core.js'")],
    'readings.js': [],
    'studio-export.js': [("from './chart-core.js'", "from '../chart-core.js'"), ("'fonts/", "'../fonts/")],
}.items():
    (out / name).write_text(up((root / name).read_text(), pairs))
(out / 'becoming-cosmic-chalk.svg').write_bytes((root / 'becoming-cosmic-chalk.svg').read_bytes())
print('explorer written to', out)
