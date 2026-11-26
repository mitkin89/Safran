'use strict';
const assert=require('node:assert/strict');
module.exports=async({js,waitFor,win})=>{
 await js("[...document.querySelectorAll('#rOut .w')].find(w=>w.dataset.l?.split('/').includes('4325')).click()");
 await waitFor("document.querySelector('#wpop .wcard')",'Wasser-Wortkarte');
 await js("document.querySelector('#wpop .wcard').click()");
 await waitFor("document.querySelector('#wcTr [data-src=Samaritan]')",'Wiedergaben geladen');
 await waitFor("document.querySelector('#wcPsR')&&!document.querySelector('#wcPsR').hidden",'Eigener Abschnitt für Peschitta-Wiedergaben');
 assert.equal(await js("[...document.querySelectorAll('#wcPsR .wcLxR')].reduce((n,r)=>n+Number(r.lastElementChild.textContent.replace(/[^0-9]/g,'')),0)"),535,'Peschitta-Abschnitt erhält alle Belege');
 assert(await js("document.querySelector('#wcPsR .wcPsW small')"),'Unbestätigte Lemma-Zuordnungen sind gekennzeichnet');
 await js("document.querySelector('#wcPsR [data-ps-group]').click()");
 await waitFor("document.querySelector('#wcTr [data-src=Peshitta].on')&&document.querySelector('#wcTr .wcTrR.open')",'Peschitta-Balken öffnet Originalformen und Stellen');
 await js("document.querySelector('#wcTr [data-src=Samaritan]').click()");
 await waitFor("document.querySelector('#wcTr .wcTrSum').textContent.includes('1 Lemma')",'Samaritanische Grundform');
 assert.equal(await js("document.querySelectorAll('#wcTr .wcTrR').length"),1);
 await js("document.querySelector('#wcTr .wcTrR.can').click()");
 await waitFor("document.querySelectorAll('#wcTr .wcTrFm .fm').length===19",'Alle 19 Originalformen');
 assert(await js("document.querySelector('#wcTr .wcTrForms')?.open===false"),'Originalformen zunächst eingeklappt');
 await js("document.querySelector('#wcTr [data-src=O]').click();document.querySelector('#wcTr .wcTrR.can').click()");
 await waitFor("document.querySelector('#wcTr .wcTrCx .ln .de')",'Onkelos-Belege');
 assert(await js("(()=>{const row=document.querySelector('#wcTr .wcTrCx .ln'),he=row.querySelector('.he').getBoundingClientRect(),ar=row.querySelector('.de').getBoundingClientRect();return ar.width<150&&Math.abs(ar.left-he.right)<30})()"),'Onkelos steht direkt neben dem Hebräischen');
 const sizes=await js("(()=>{const row=document.querySelector('#wcTr .wcTrCx .ln');return [getComputedStyle(row.querySelector('.he')).fontSize,getComputedStyle(row.querySelector('.de')).fontSize,getComputedStyle(row.querySelector('.he')).fontFamily,getComputedStyle(row.querySelector('.de')).fontFamily]})()");
 assert.equal(sizes[0],sizes[1],'Onkelos und MT haben dieselbe Schriftgröße');assert.equal(sizes[2],sizes[3],'Onkelos und MT haben dieselbe Schrift');
 await js("document.querySelector('#wcTr [data-src=Peshitta]').click()");
 await waitFor("document.querySelector('#wcTr .wcTrUnresolved')",'Offene Formen getrennt');
 assert(await js("[...document.querySelectorAll('#wcTr .wcTrUnresolved')].every(d=>!d.open)"));
 await js("document.querySelector('#wcTr .wcTrR.can').click()");
 await waitFor("document.querySelector('#wcTr .wcTrCx .de[lang=syr]')",'Syrische Originalformen');
 assert(await js("document.querySelector('#wcTr .wcTrCx .de[lang=syr]').textContent.trim()!=='ܡܝ'"),'Fundstelle zeigt die Originalform statt des Gruppenlemmas');
 assert(await js("parseFloat(getComputedStyle(document.querySelector('#wcTr .wcTrR .f [lang=syr]')).fontSize)>=30"));
 await js("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Genesis 1:2\"]').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))");
 await waitFor("!document.querySelector('#lkHover')?.hidden&&document.querySelector('#lkHover .pvp[data-vt^=\"ETCBC Peshitta\"]')",'Gewählte Peschitta in der Vorschau');
 assert(await js("document.querySelector('#lkHover .pvp[lang=syr] .pvhl')?.textContent.includes('ܡ')"),'Syrische Originalform markiert');

 await js("document.querySelector('#wcTr .wcTrR.open').click();document.querySelector('#wcTr .wcTrSum').scrollIntoView({block:'start'})");
 await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 await win.webContents.capturePage().then(image=>require('fs').writeFileSync('/tmp/safran-witness-renderings.png',image.toPNG()));
 await js("document.querySelector('#wcTr .wcTrCmpB').click();document.querySelector('#wcTr [data-src=Samaritan]').click()");
 await waitFor("document.querySelector('#wcTr .wcTrBody.cmp .wcTrP')",'Vergleich gruppierter Fassungen');
 await js("document.querySelector('#wcTr .wcTrP').click()");
 await waitFor("document.querySelector('#wcTr .ln2 .de[lang=syr]')",'Vergleich mit Originalformen');
 assert(await js("document.querySelector('#wcTr .ln2:not(.hd) .de[lang=syr]').textContent.trim()!=='ܡܝ'"));
 assert(await js("document.querySelector('#wcTr .ln2:not(.hd) .de[lang=he]').textContent.trim()!=='מימ'"));
 win.setSize(900,900);
 await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 assert(await js("[...document.querySelectorAll('#wcTr .ln2:not(.hd) .de')].every(e=>e.getBoundingClientRect().width>0)"));

 await js("document.querySelector('#fmClose').click();[...document.querySelectorAll('#rOut .w')].find(w=>w.dataset.l?.split('/').includes('2233')).click()");
 await waitFor("document.querySelector('#wpop .wcard')",'Samen-Wortkarte');
 await js("document.querySelector('#wpop .wcard').click()");
 await waitFor("document.querySelector('#wcTr [data-src=O]')",'Onkelos-Statistik für Samen');
 await js("document.querySelector('#wcTr [data-src=O]').click();document.querySelector('#wcTr .wcTrR[data-tg-lexeme=\"1c9\"]').click()");
 await waitFor("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Exodus 16:31\"]')",'Exodus 16:31 im belegten Lexem');
 assert(await js("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Exodus 16:31\"]').nextElementSibling.nextElementSibling.textContent.includes('כבַר')"),'Tabellenzeile enthält Originalform');
 await waitFor("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Exodus 16:31\"]').nextElementSibling.textContent.includes('ז')",'Hebräischer Kontext vollständig geladen');
 await js("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Exodus 16:31\"]').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))");
 await waitFor("!document.querySelector('#lkHover')?.hidden&&document.querySelector('#lkHover .pvp[data-vt^=\"Targum Onkelos\"] .pvhl')",'Markierung der gewählten Onkelos-Originalform');
 assert(await js("document.querySelector('#lkHover .pvp[data-vt^=\"Targum Onkelos\"] .pvhl').textContent.replace(/[\\u0591-\\u05bd\\u05bf-\\u05c7]/g,'')==='כבר'"));

 await js("document.querySelector('#fmClose').click();[...document.querySelectorAll('#rOut .w')].find(w=>w.dataset.l?.split('/').includes('6754')).click()");
 await waitFor("document.querySelector('#wpop .wcard')",'Bild-Wortkarte');
 await js("document.querySelector('#wpop .wcard').click()");
 await waitFor("document.querySelector('#wcTr [data-src=LXX]')",'LXX-Wiedergaben von Bild');
 await js("document.querySelector('#wcTr [data-src=LXX]').click();[...document.querySelectorAll('#wcTr .wcTrR .f [lang=grc]')].find(e=>e.textContent==='εἰκών').closest('.wcTrR').click()");
 await waitFor("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Genesis 1:27\"]')",'LXX-Beleg Genesis 1:27');
 assert.equal(await js("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Genesis 1:27\"]').nextElementSibling.nextElementSibling.textContent.trim().normalize('NFC')"),'εἰκόνα');
 assert.equal(await js("document.querySelector('#wcTr .wcTrCx a[data-ref=\"Genesis 9:6\"]').nextElementSibling.nextElementSibling.textContent.trim().normalize('NFC')"),'εἰκόνι');

 await js("document.querySelector('#fmTabs [data-t=forms]').click()");
 await waitFor("document.querySelector('#fmBody [data-fsrc=LXX]')",'Formtabelle geladen');
 for (const source of ['Samaritan','Peshitta']) {
  assert(await js(`(()=>{const img=document.querySelector('#fmBody [data-fsrc=${source}] img');return img&&img.complete&&img.naturalWidth>0})()`),source+' hat sein vorhandenes Bild');
 }
 await js("document.querySelector('#fmBody [data-fsrc=LXX]').click()");
 await waitFor("document.querySelector('#fmBody .fmTrL[lang=grc]')",'Griechische Belegformen in der Formtabelle');
 assert(await js("[...document.querySelectorAll('#fmBody .fmTrL[lang=grc] .l1')].some(e=>/εἰκόν[αι]/u.test(e.textContent.normalize('NFC')))"),'Paradigma zeigt flektierte griechische Formen');
 for (const source of ['O','Samaritan','Peshitta']) {
  await js(`document.querySelector('#fmBody [data-fsrc=${source}]').click()`);
  await waitFor("document.querySelector('#fmBody .fmTrL .l1')",source+' Originalformen in der Formtabelle');
  assert(await js("[...document.querySelectorAll('#fmBody .fmTrL .l1')].some(e=>e.textContent.trim().length>3)"),source+' zeigt belegte Formen');
 }

 await js("document.querySelector('#fmClose').click();[...document.querySelectorAll('#rOut .w')].find(w=>w.dataset.l?.split('/').includes('559')).click()");
 await waitFor("document.querySelector('#wpop .wcard')",'Sagen-Wortkarte');
 await js("document.querySelector('#wpop .wcard').click();document.querySelector('#fmTabs [data-t=forms]').click()");
 await waitFor("document.querySelector('#fmBody [data-fsrc=O]')",'Sagen-Paradigma');
 for (const [source,pattern] of [['LXX','εἶπ'],['O','אמרית'],['Samaritan','אמרתי'],['Peshitta','ܐܡܪ']]) {
  await js(`document.querySelector('#fmBody [data-fsrc=${source}]').click()`);
  assert(await js(`[...document.querySelectorAll('#fmBody .fmTrL .l1')].some(e=>e.textContent.normalize('NFC').replace(/[\\u0591-\\u05bd\\u05bf-\\u05c7]/g,'').includes(${JSON.stringify(pattern)}))`),source+' hat die belegte flektierte Form');
 }
 await win.webContents.capturePage().then(image=>require('fs').writeFileSync('/tmp/safran-paradigm-forms.png',image.toPNG()));
 console.log('Electron: witness lemma groups, original forms, Syriac size and adjacent Onkelos columns passed.');
};
