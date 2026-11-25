// Apply only the individually reviewed editorial metadata. No witness text is rewritten.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const file = path.join(root, 'textcrit-traditions-data.js');
const reviewed = JSON.parse(fs.readFileSync(path.join(__dirname, 'reviewed.json'), 'utf8'));
const window = {};
vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window });
const rows = window.TEXTCRIT_TRADITIONS.filter(([key, tag]) => !(reviewed.withdrawn || []).some(d => JSON.stringify(d.key) === JSON.stringify(key) && d.category === tag.category));
for (const { key, tag } of reviewed.decisions) {
  const at = rows.findIndex(([k, t]) => JSON.stringify(k) === JSON.stringify(key) && t.category === tag.category);
  if (at < 0) rows.push([key, tag]);
  else rows[at] = [key, tag];
}
const text = '// Editorial tags keyed by witness, edition/book, reference, reading type and source anchors.\n' +
  '// HexSource keys bind a Field footnote comparison to the exact source unit, not its LXX line.\n' +
  'window.TEXTCRIT_TRADITIONS = [\n' + rows.map(row => '  ' + JSON.stringify(row) + ',').join('\n') + '\n];\n';
if (process.argv.includes('--check')) {
  if (text !== fs.readFileSync(file, 'utf8')) throw new Error('Run node tools/textcrit/traditions/apply.cjs');
} else fs.writeFileSync(file, text);
