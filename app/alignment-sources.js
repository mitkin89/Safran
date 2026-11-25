// Öffentliche Wortzuordnungen gelten ausschließlich für ihren gebauten Textstand.
(function (global) {
  'use strict';
  function check(expected, hebrew, translations = []) {
    if (!expected) return { ok: false, reason: 'Quellstand der Wortzuordnung fehlt' };
    if (!hebrew || hebrew.textHash !== expected.he.textHash) return { ok: false, reason: 'Hebräische Fassung weicht vom Quellstand der Wortzuordnung ab' };
    if (translations.some(doc => !doc || doc.textHash !== expected.translation.textHash)) return { ok: false, reason: 'Übersetzung weicht vom Quellstand der Wortzuordnung ab' };
    return { ok: true };
  }
  const api = { check };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else global.AlignmentSources = api;
})(typeof window !== 'undefined' ? window : globalThis);
