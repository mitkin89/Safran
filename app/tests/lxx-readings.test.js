'use strict';
// Classified LXX readings (lxx-readings/, tools/lxx/readings/build.py) as apparatus entries and reading-line data.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),box={window:{}};box.window.TextCrit=require('../textcrit-core.js');
vm.runInNewContext(fs.readFileSync(path.join(root,'library-tov.js'),'utf8'),box);
const host={esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),box);return get();}};
const tov=box.window.LibraryTov.create(host);
const mt=ref=>box.window.TextCrit.words(({'Genesis 2:2':'וַיְכַל אֱלֹהִים בַּיּוֹם הַשְּׁבִיעִי מְלַאכְתּוֹ אֲשֶׁר עָשָׂה וַיִּשְׁבֹּת בַּיּוֹם הַשְּׁבִיעִי מִכָּל מְלַאכְתּוֹ אֲשֶׁר עָשָׂה','Genesis 4:8':'וַיֹּאמֶר קַיִן אֶל הֶבֶל אָחִיו וַיְהִי בִּהְיוֹתָם בַּשָּׂדֶה וַיָּקָם קַיִן אֶל הֶבֶל אָחִיו וַיַּהַרְגֵהוּ'})[ref]||'');
test('index covers the Tanakh editions except Esther',async()=>{
  await tov.loadReadings('Genesis');const ix=box.window.LXX_READINGS_INDEX;
  assert(Object.keys(ix).length>=39);assert(!Object.values(ix).some(e=>e.book==='Esther'));
  assert.deepEqual(Object.keys(ix).filter(c=>ix[c].book==='Judges').sort(),['Jdga','Jdgb']);
});
test('typed entry with Greek, reconstructed Vorlage and reading-line data',async()=>{
  await tov.loadReadings('Genesis');
  const e=tov.readingEntries([{ref:'Genesis 2:2',row:'2'}],mt),r=e.find(x=>/data-lxx-type="zahl"/.test(x.html));
  assert(r);assert.deepEqual([r.anchor.kind,r.anchor.start,r.anchor.end],['word',3,3]);
  assert.match(r.html,/ἕκτῃ/);assert.match(r.html,/הששי/);
  assert.equal(r.lz.op,'var');assert.equal(r.lz.rd,'הששי');assert(r.lz.ret);assert.equal(r.lz.f,'LXX');
  const p=tov.readingEntries([{ref:'Genesis 4:8',row:'8'}],mt).find(x=>x.anchor?.kind==='gap');
  assert(p);assert.equal(p.anchor.start,4);assert.equal(p.lz.op,'add');assert.match(p.lz.rd,/נלכה/);
});

test('Genesis 3:15 displays the etymological Hebrew reading separately from unknown CATSS controls',async()=>{
 await tov.load();const entries=tov.entries([{ref:'Genesis 3:15',row:'15'}]);assert.equal(entries.length,2);
 for(const r of entries){assert.match(r.html,/<bdi dir="rtl" lang="he">צפה<\/bdi>/);assert(!r.html.includes('שc'));assert.match(r.html,/<abbr[^>]*>\.\$c<\/abbr>/);assert.match(r.html,/Quellcode; keine gesicherte Auflösung/);}
});
