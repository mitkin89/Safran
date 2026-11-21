'use strict';
// Preserve source-order extraction in legacy regression tests while the actual
// functions live in separate renderer modules. Electron runs the real modules.
const fs = require('node:fs'), path = require('node:path');
module.exports = function readerSource() {
  const root = path.resolve(__dirname, '..');
  return fs.readFileSync(path.join(root, 'library.js'), 'utf8').replace(
    /  \/\/ reader-module:([\w-]+)\n[\s\S]*?  \/\/ end-reader-module:\1\n/g,
    (_match, name) => {
      const code = fs.readFileSync(path.join(root, 'library-' + name + '.js'), 'utf8');
      const marker = '  function create(host) {\n';
      const begin = code.indexOf(marker), start = begin + marker.length;
      const end = code.lastIndexOf('\n    return {\n');
      if (begin < 0 || end < start) throw Error('Missing renderer module body: ' + name);
      return code.slice(start, end) + '\n';
    });
};
