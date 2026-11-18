'use strict';
// All launch methods share one owner of the user profile, including npm/script starts.
function claimSingleInstance(app, activate) {
  if (!app.requestSingleInstanceLock()) { app.quit(); return false; }
  app.on('second-instance', activate);
  return true;
}
function focusWindow(win) {
  if (!win || win.isDestroyed()) return false;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
  return true;
}
module.exports = { claimSingleInstance, focusWindow };
