'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async({docs,win,js,waitFor,book})=>{
  await book('Genesis');
  await waitFor("document.querySelector('#rSection option[value=\"0\"]')",'Genesis für CATSS');
  await js("document.querySelector('#rSection').value='0';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#tcTov').checked=true;document.querySelector('#tcTov').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#tcSmr').checked=false;document.querySelector('#tcSmr').dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#textcritPanel').hidden)document.querySelector('#tcBtn').click()");
  await waitFor("document.querySelector('#rOut .row[data-l=\"6\"]')",'Genesis 1:6 geladen');
  await js("document.querySelector('#rOut .row[data-l=\"6\"] .txt').click()");
  await waitFor("document.querySelector('#tcBody .tc-tov-entry')?.textContent.includes('καὶ ἐγένετο')",'Tovs Plus und Rückübersetzung ohne ausgewählte LXX-Lesespalte');
  assert(await js("[...document.querySelectorAll('#tcBody abbr')].some(n=>n.textContent==='erschlossen'&&n.title.includes('=;')&&n.title.includes('Rückübersetzung'))"));
  assert(await js("document.querySelector('#tcBody').textContent.includes('ויהי') && !document.querySelector('#tcBody details, #tcBody summary')"));
  assert(await js("[...document.querySelectorAll('#tcBody .tc-tov-tag')].some(n=>n.textContent==='LXX-Zusatz'&&n.title.startsWith('--+'))"));
  assert(await js("{const n=document.querySelector('#tcBody .tc-tov-reading');getComputedStyle(n).display==='inline'&&!n.querySelector('div')&&n.textContent.includes('ויהי')&&!n.textContent.includes('=;')&&n.getBoundingClientRect().height<getComputedStyle(n).fontSize.replace('px','')*2}"),'Compact inline reading with original code in the hover');
  const target="document.querySelector('#tcBody .tc-tov-lemma')";
  await js(`${target}.scrollIntoView({block:'center'})`);
  await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
  const point=await js(`{const r=${target}.getBoundingClientRect();({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}`);
  win.webContents.sendInputEvent({type:'mouseMove',...point});
  await waitFor("document.querySelector('#tcHover')?.textContent.includes('στερέωμα')",'Griechischer Verskontext über dem Lemma');
  assert(await js("document.querySelectorAll('#tcHover .tc-il-unit').length>5 && document.querySelector('#tcHover .tc-il-unit.active [lang=grc]')?.textContent==='καὶ ἐγένετο' && [...document.querySelectorAll('#tcHover .tc-il-he')].some(n=>n.textContent==='רקיע') && document.querySelector('#tcHover .tc-il-retro')?.textContent.includes('erschlossen')"),'Source-aligned Greek/Hebrew interlinear hover with highlighted group');
  assert(await js("document.querySelector('#tcHover').textContent.includes('Genesis 1:6') && !document.querySelector('#tcHover [lang=en]')"),'No NETS translation');
  if(process.env.SAFRAN_TOV_HOVER_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_TOV_HOVER_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  await js(`${target}.click()`);
  await waitFor("[...document.querySelectorAll('#wpop .wseg')].some(n=>n.textContent.includes('Verb'))",'Echte LXX-Morphologie aus dem Apparat');
  await js("document.querySelector('#wpop .wx').click()");
  // Multiple witnesses coexist and retain independent filters.
  await js("document.querySelector('#tcSmr').checked=true;document.querySelector('#tcSmr').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#tcWhole').click()");
  await waitFor("document.querySelectorAll('#tcBody .tc-tov-entry').length>8",'Tov im ganzen Kapitel');
  assert(await js("document.querySelector('#tcBody [data-witness=SMR]') && document.querySelector('#tcBody [data-witness=LXX]')"));
  await js("document.querySelector('#tcTov').checked=false;document.querySelector('#tcTov').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("!document.querySelector('#tcBody .tc-tov-entry') && document.querySelector('#tcBody .tc-witness')",'LXX separat ausblenden');
  await js("document.querySelector('#tcTov').checked=true;document.querySelector('#tcTov').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#rOut .row[data-l=\"6\"] .txt').click()");
  await waitFor("document.querySelector('#tcBody .tc-tov-entry')",'LXX wieder einblenden');
  if(process.env.SAFRAN_TOV_CAPTURE){
    await js("document.querySelector('#tcSmr').checked=false;document.querySelector('#tcSmr').dispatchEvent(new Event('change',{bubbles:true}))");
    await waitFor("document.querySelector('#tcBody .tc-tov-entry') && !document.querySelector('#tcBody .tc-entry[data-tc-group]')",'Kompakte LXX-Ansicht für Sichtkontrolle');
    await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
    fs.writeFileSync(process.env.SAFRAN_TOV_CAPTURE,(await win.webContents.capturePage()).toPNG());
  }
  await js("document.querySelector('#tcSmr').checked=true;document.querySelector('#tcSmr').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#rSection').value='1';document.querySelector('#rSection').dispatchEvent(new Event('change',{bubbles:true}))");
  await waitFor("document.querySelector('#rOut .row[data-l=\"2\"]') && document.querySelector('#rSection').value==='1'",'Genesis 2 geladen');
  await js("document.querySelector('#rOut .row[data-l=\"2\"] .txt').click()");
  await waitFor("document.querySelector('#tcPlace').textContent.includes('Genesis 2:2') && document.querySelector('#tcBody .tc-locus [data-witness=LXX]')",'Gemeinsamer Wortapparat Genesis 2:2');
  assert(await js("{const g=document.querySelector('#tcBody .tc-locus[data-start=\"3\"]');!!g?.querySelector('[data-witness=SMR]')&&!!g.querySelector('[data-witness=LXX]')&&g.dataset.end==='3'&&g.querySelector('.tc-locus-title').textContent.includes('שְּׁבִיעִ')&&document.querySelectorAll('#tcBody .tc-locus').length===1}"),'Both witnesses belong to the first occurrence of השביעי');
  assert(await js("!document.querySelector('#tcBody').textContent.includes('=ט') && [...document.querySelectorAll('#tcBody .tc-tov-tag')].some(n=>n.textContent==='Zahlenunterschied')"));
  if(process.env.SAFRAN_LOCI_CAPTURE){await js("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");fs.writeFileSync(process.env.SAFRAN_LOCI_CAPTURE,(await win.webContents.capturePage()).toPNG());}
  await js("document.querySelector('#tcClose').click()");
  const root=path.resolve(__dirname,'../..'),entry=require('../../bundled/manifest.json').items.find(i=>i.title==='Joshua'&&i.versionTitle.startsWith('Westminster'));
  const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel)));
  docs.set(entry.rel,{...doc,entry:{...entry,own:false,bytes:fs.statSync(path.join(root,'bundled',entry.rel)).size},textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex')});
  const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.reload();await loaded;
  await waitFor("[...document.querySelectorAll('#tree .lib-item')].some(n=>n.dataset.key.endsWith('¦Joshua'))",'Josua verfügbar');
  await book('Joshua');
  await waitFor("document.querySelector('#rOut .row[data-l=\"1\"]') && !document.querySelector('#tcBtn').hidden",'Textkritik außerhalb der Tora');
  await js("document.querySelector('#tcBtn').click();document.querySelector('#rOut .row[data-l=\"1\"] .txt').click()");
  await waitFor("document.querySelector('#tcBody .tc-tov-entry') && document.querySelector('#tcBody').textContent.includes('Joshua 1:1')",'Tov im Buch Josua ohne samaritanischen Apparat');
  assert(await js("!document.querySelector('#tcBody .tc-entry[data-tc-group]') && localStorage.getItem('tcTov')==='1'"));
  await js("document.querySelector('#tcClose').click()");
  console.log('Electron: Tov/CATSS, flache Hinweise, Quellcodes, Hover, echte LXX-Morphologie und unabhängige Zeugenfilter bestanden.');
};
