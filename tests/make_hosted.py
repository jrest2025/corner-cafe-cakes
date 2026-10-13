"""Build the hosted test page: the real head and embed, the mock database, then the single app file (loaded locally)."""
import json, pathlib
R = pathlib.Path(__file__).parent.parent
m = json.load(open(R / 'dist/app/manifest.json'))
head = open(R / 'dist/staff.head.html').read(); emb = open(R / 'dist/staff.embed.html').read()
page = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + head +
        '</head><body style="margin:0">' + emb + '\n<script src="mock.js"></script>\n<script src="../' + m['file'] + '"></script>\n</body></html>')
open(R / 'test/hosted-staff.html', 'w').write(page); print('hosted-staff.html', m['file'])
