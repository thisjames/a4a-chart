"""Build v1.html (the version 1 Chart Studio page) from src/page.src.html.
On the v2 branch, index.html is the Chart Explorer and is edited directly.

Fills the placeholders: {{FONT}} (1790 Royal Printing as base64, from fonts/),
{{LOGO}} and {{LOGO_JSON}} (the AfA logotype, from src/logotype-paths.json) and
{{ACC}} (accuracy results, from test/results.json).
Run from the repository root:  python3 tools/build.py
"""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'src/page.src.html').read_text()
font = base64.b64encode((root / 'fonts/RoyalPrinting.ttf').read_bytes()).decode()
lp = json.loads((root / 'src/logotype-paths.json').read_text())
logo = f'<svg class="logotype" viewBox="0 0 2454.16 54.56" role="img" aria-label="Astrology for Artists">{lp["paths"]}</svg>'
acc = [{'name': c['name'], 'place': c['place'], 'offset': c['offset'], 'src': c['offsetSource'],
        'max': round(c['maxDiff'], 2), 'source': c['source']} for c in json.loads((root / 'test/results.json').read_text())]
out = (src.replace('{{FONT}}', font).replace('{{LOGO}}', logo)
          .replace('{{LOGO_JSON}}', json.dumps({'viewBox': lp['viewBox'], 'paths': lp['paths']}))
          .replace('{{ACC}}', json.dumps(acc, ensure_ascii=False)))
assert '{{' not in out, 'unfilled placeholder'
(root / 'v1.html').write_text(out)
print('v1.html written,', len(out), 'characters')
