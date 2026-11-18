'use strict';
const assert=require('assert/strict');
// Startet mit Genesis, Westminster + Zunz, und eingeschalteter Zunz-Zeile.
module.exports=async function run({js,waitFor}){
  await waitFor("document.querySelector('#rOut .cell[data-k=de] .ilx[data-ix]')",'Anklickbare deutsche Wortgruppe');
  await js("document.querySelector('#rOut .cell[data-k=de] .ilx[data-ix]').click()");
  assert(await js("!!document.querySelector('#rOut .cell[data-k=he] .w.ilhl') && !!document.querySelector('#rOut .cell[data-k=de] .ilx.ilhl')"));
  await js("document.querySelector('#rOut .cell[data-k=de] .ilx.ilhl').click()");
  assert.equal(await js("document.querySelectorAll('#rOut .ilhl').length"),0);
  await js("document.querySelector('#ilBtn').click()");
  await waitFor("document.querySelector('#ilPop input[value=Goldschmidt]')",'Zweite Interlinear-Übersetzung');
  await js("{const c=document.querySelector('#ilPop input[value=Goldschmidt]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}");
  await waitFor("document.querySelector('#rOut .ilt[data-tr=Goldschmidt]') && document.querySelector('#rOut .illc[data-tr=Goldschmidt]') && document.querySelector('#rOut .ilt[data-tr=Zunz]')",'Zwei Übersetzungen mit Legende');
  await js("document.querySelector('#rOut .illc[data-tr=Goldschmidt]').dispatchEvent(new MouseEvent('mouseenter'))");
  assert(await js("!!document.querySelector('#rOut .ilt[data-tr=Zunz].ildim') && !document.querySelector('#rOut .ilt[data-tr=Goldschmidt].ildim')"));
  await js("document.querySelector('#rOut .illc[data-tr=Goldschmidt]').dispatchEvent(new MouseEvent('mouseleave'));document.querySelector('#rOut .illc[data-tr=Goldschmidt]').click()");
  await waitFor("!document.querySelector('#rOut .ilt[data-tr=Goldschmidt]') && document.querySelector('#rOut .ilt[data-tr=Zunz]')",'Werk über Legende ausblenden');
  await js("document.querySelector('#ilPop button[data-a=none]').click()");
  await waitFor("!document.querySelector('#rOut .ilt') && !document.querySelector('#ilBtn').classList.contains('on')",'Interlinear-Zeilen ausschalten');
  assert(await js("!!document.querySelector('#rOut .cell[data-k=de] .ilx')"),'Wortzuordnung bleibt auch ohne Interlinear-Zeile anklickbar');
  await js("{const c=document.querySelector('#ilPop input[value=Zunz]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#ilBtn').click();}");
  await waitFor("document.querySelector('#rOut .ilt[data-tr=Zunz]')",'Zunz wieder einschalten');
  console.log('Electron: Interlinear-Wortgruppen, Übersetzungswechsel, Legende und Aus-/Einschalten bestanden.');
};
