// Ohne Apple-Entwicklerzertifikat: Die App lokal („ad-hoc“) signieren.
// Nach dem Umpacken (asar, Info.plist) ist die mitgelieferte Electron-Signatur ungültig; auf Macs mit Apple-Chip meldet macOS dann
// „Safran ist beschädigt“. Mit gültiger Ad-hoc-Signatur erscheint stattdessen die normale Warnung mit „Dennoch öffnen“.
// Ist ein echtes Zertifikat eingerichtet (CSC_LINK / CSC_NAME), übernimmt electron-builder das Signieren selbst.
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign(ctx) {
  if (ctx.electronPlatformName !== 'darwin') return;
  if (process.env.CSC_LINK || process.env.CSC_NAME) return;
  const app = path.join(ctx.appOutDir, ctx.packager.appInfo.productFilename + '.app');
  console.log('  • ad-hoc signing', app);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
