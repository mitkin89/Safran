'use strict';

const assert = require('node:assert/strict');

module.exports = async function outlineSearchFlows({ js, waitFor, book }) {
  await book('Genesis');
  await js(`document.querySelector('nav [data-tab=search]').click();
    document.querySelector('#sOutlineTab').click();
    document.querySelector('#sOutline [data-so=query]').value = 'Sabbat';
    document.querySelector('#sOutline [data-so=kind]').value = 'mitzvot';
    document.querySelector('#sOutline [data-so=go]').click();`);
  await waitFor("document.querySelector('#sOutline [data-so=out] .soResult') && document.querySelector('#sOutline [data-so=go]').textContent==='Suchen'", 'Buchübergreifende Mizwot');
  assert(await js("document.querySelector('#sOutline [data-so=out]').textContent.includes('Exodus · 16:29') && document.querySelector('#sOutline [data-so=out]').textContent.includes('Leviticus')"));
  await js("document.querySelector('#sOutline [data-so=query]').value='#24';document.querySelector('#sOutline [data-so=go]').click()");
  await waitFor("document.querySelectorAll('#sOutline [data-so=out] .soResult').length === 1 && document.querySelector('#sOutline [data-so=out] [data-outline-hit]')", 'Mizwa nach Nummer');
  await js("document.querySelector('#sOutline [data-so=out] [data-outline-hit]').click()");
  await waitFor("document.querySelector('#rTitle').textContent.includes('Exodus') && document.querySelector('#rOut .row.hit[data-l=\"29\"]')", 'Sprung zur Mizwa Exodus 16,29');
  await js(`document.querySelector('nav [data-tab=search]').click();
    document.querySelector('#sOutlineTab').click();
    document.querySelector('#sOutline [data-so=kind]').value='outlines';
    document.querySelector('#sOutline [data-so=query]').value='weltschöpfung';
    document.querySelector('#sOutline [data-so=go]').click();`);
  await waitFor("document.querySelector('#sOutline [data-so=out]').textContent.includes('Weltschöpfung')", 'Gliederung unabhängig vom aktuellen Buch');
  assert(await js("document.querySelector('#sOutline [data-so=out]').textContent.includes('Genesis')"));
  console.log('Electron: Buchübergreifende Gliederung und Mizwot, Nummernsuche und Sprung zum Vers bestanden.');
};
