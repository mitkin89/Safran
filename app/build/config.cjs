'use strict';
// npm workspaces hoist Electron; resolve its locked version through Node.
module.exports = {
  ...require('../package.json').build,
  electronVersion: require('electron/package.json').version,
  afterPack: require('./adhoc-sign').default,
};
