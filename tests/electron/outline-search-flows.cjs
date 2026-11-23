'use strict';

const assert = require('node:assert/strict');

module.exports = async function outlineSearchFlows({ js, waitFor, book }) {
  await book('Genesis');
  await js(`document.querySelector('nav [data-tab=search]').click();
    document.querySelector('#sOutlineTab').click();
    document.querySelector('#soQuery').value = 'Sabbat';
    document.querySelector('#soKind').value = 'mitzvot';
    document.querySelector('#soGo').click();`);
  await waitFor("document.querySelector('#soOut .soResult') && document.querySelector('#soGo').textContent==='Suchen'", 'Buchübergreifende Mizwot');
  assert(await js("document.querySelector('#soOut').textContent.includes('Exodus · 16:29') && document.querySelector('#soOut').textContent.includes('Leviticus')"));
  await js("document.querySelector('#soQuery').value='#24';document.querySelector('#soGo').click()");
  await waitFor("document.querySelectorAll('#soOut .soResult').length === 1 && document.querySelector('#soOut [data-outline-hit]')", 'Mizwa nach Nummer');
  await js("document.querySelector('#soOut [data-outline-hit]').click()");
  await waitFor("document.querySelector('#rTitle').textContent.includes('Exodus') && document.querySelector('#rOut .row.hit[data-l=\"29\"]')", 'Sprung zur Mizwa Exodus 16,29');
  await js(`document.querySelector('nav [data-tab=search]').click();
    document.querySelector('#sOutlineTab').click();
    document.querySelector('#soKind').value='outlines';
    document.querySelector('#soQuery').value='weltschöpfung';
    document.querySelector('#soGo').click();`);
  await waitFor("document.querySelector('#soOut').textContent.includes('Weltschöpfung')", 'Gliederung unabhängig vom aktuellen Buch');
  assert(await js("document.querySelector('#soOut').textContent.includes('Genesis')"));
  console.log('Electron: Buchübergreifende Gliederung und Mizwot, Nummernsuche und Sprung zum Vers bestanden.');
};
