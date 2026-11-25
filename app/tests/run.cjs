// Run corpus checks in isolated processes before Node's focused regression suite.
'use strict';
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) { console.error(result.error); process.exit(1); }
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const file of fs.readdirSync(path.join(__dirname, 'integration')).filter(f => f.endsWith('.cjs')).sort()) {
  run([path.join(__dirname, 'integration', file)]);
}
run(['--test', ...fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(__dirname, f))]);
