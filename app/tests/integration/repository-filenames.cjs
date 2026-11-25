const repoRoot = require('node:path').resolve(__dirname, '../..');
// Dateinamen im Repo müssen auch unter Windows gültig sein (sonst bricht actions/checkout auf windows-latest ab):
// keine Zeichen < > : " | ? *, keine Steuerzeichen, kein Punkt/Leerzeichen am Ende eines Namensteils, keine reservierten Namen (CON, NUL …)
const assert = require('assert'), { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' }).split('\0').filter(Boolean);
const RES = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
const bad = files.filter(p => /[<>:"|?*\x00-\x1f]/.test(p) || p.split('/').some(s => /[. ]$/.test(s) || RES.test(s)));
assert.deepStrictEqual(bad, [], 'unter Windows ungültige Dateinamen:\n' + bad.join('\n'));
// Manifest: jede mitgelieferte Datei existiert unter genau diesem Pfad, und auch die Pfade im Manifest sind Windows-tauglich
const man = JSON.parse(fs.readFileSync(path.join(repoRoot, 'bundled', 'manifest.json'), 'utf8'));
for (const it of man.items) {
  assert(!/[<>:"|?*]/.test(it.rel), 'Manifest-Pfad ungültig unter Windows: ' + it.rel);
  assert(fs.existsSync(path.join(repoRoot, 'bundled', it.rel)), 'fehlt: ' + it.rel);
}
console.log(`Dateinamen ok (${files.length} Dateien, ${man.items.length} Manifest-Einträge)`);
