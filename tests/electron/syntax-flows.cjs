'use strict';

const assert = require('node:assert/strict');

module.exports = async function syntaxFlows({ js, waitFor }) {
  await js("document.querySelector('nav [data-tab=search]').click();document.querySelector('#sAdv').open=true;document.querySelector('#sSyntax').open=true");
  await waitFor("!document.querySelector('#sxBhsaInstall').hidden", 'Optionaler BHSA-Download');
  await js("document.querySelector('#sxBhsaLoad').click()");
  await waitFor("!document.querySelector('#sxBhsa').hidden", 'BHSA-Filter verfügbar');
  await js("for(const id of ['sxVerb','sxSubject','sxObject']) document.getElementById(id).value='';document.querySelector('#sxDomain').value='Q';document.querySelector('#sxGo').click()");
  await waitFor("document.querySelector('#sOut .sres')?.textContent.includes('Direkte Rede')", 'BHSA-Direktrede in der Trefferliste');
  await js("document.querySelector('#sOut .sres').click()");
  await waitFor("document.querySelector('#rOut .row[data-l=\"3\"] .cell[data-mt] .w')", 'Genesis 1,3 im Leser');
  await js(`document.querySelectorAll('#rOut .row[data-l="3"] .cell[data-mt] .w')[2].click()`);
  await waitFor("document.querySelector('#wpop .bhsa-context')?.textContent.includes('Direkte Rede')", 'BHSA im Wort-Popup');

  await js("document.querySelector('#jump').value='Isaiah 53:6';document.querySelector('#jump').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");
  await waitFor("document.querySelector('#rTitle').textContent.includes('Isaiah') && document.querySelector('#rOut .row.hit')?.dataset.l==='6'", 'Jesaja 53,6 im Leser');
  await js(`document.querySelectorAll('#rOut .row[data-l="6"] .cell[data-mt] .w')[2].click()`);
  await waitFor("Array.from(document.querySelectorAll('#wpop .macula-target')).some(el=>el.textContent.includes('39:8'))", 'Verweis auf Jesaja 39,8');
  await js("Array.from(document.querySelectorAll('#wpop .macula-target')).find(el=>el.textContent.includes('39:8')).dispatchEvent(new MouseEvent('mouseenter'))");
  await waitFor("document.querySelector('#lkHover:not([hidden]) .pvhl')", 'Versvorschau mit exakter Hervorhebung');
  assert.deepEqual(await js("Array.from(document.querySelectorAll('#lkHover .pvhl'), w=>w.textContent.replace(/[^א-ת]/g,''))"), ['ישעיהו']);
  assert.equal(await js("document.querySelector('#rOut .row.hit').dataset.l"), '6', 'Hover navigiert nicht');
  await js("Array.from(document.querySelectorAll('#wpop .macula-target')).find(el=>el.textContent.includes('39:8')).click()");
  await waitFor("document.querySelector('#rOut .row.hit[data-l=\"8\"] .macula-mark')", 'Zielvers Jesaja 39,8 mit markiertem Wort');
  assert.equal(await js("document.querySelector('#rOut .macula-mark').textContent.replace(/[^א-ת]/g,'')"), 'ישעיהו');
  assert(await js(`(() => {
    const r = document.querySelector('#rOut .row.hit').getBoundingClientRect();
    const top = document.querySelector('body > header').getBoundingClientRect().bottom;
    return Math.abs((r.top + r.bottom - top - innerHeight) / 2) < 36;
  })()`), 'Letzter Vers des Kapitels wird mittig angezeigt');
  assert.equal(await js("document.querySelector('#lkHover').hidden"), true, 'Vorschau schließt beim Sprung');
  console.log('Electron: BHSA-Filter, genaue MACULA-Vorschau und zentrierter Sprung nach Jesaja 39,8 bestanden.');
};
