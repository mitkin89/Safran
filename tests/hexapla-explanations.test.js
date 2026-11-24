'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function fixture(lang='de'){
 const window={I18N:{lang}},box={window};
 vm.runInNewContext(fs.readFileSync(path.join(root,'library-textcrit-hexapla.js'),'utf8'),box);
 const hx=window.LibraryHexaplaTC.create({esc:escape,load:async(src,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),box);return get();}});
 return {window,hx};
}
const html=(hx,d,ref)=>hx.entries(d,[{ref:d.book+' '+ref,row:ref}]).map(r=>r.html).join('');
test('Both user examples explain the concrete difference and the disputed attribution',async()=>{
 const {hx}=fixture(),ex=await hx.load('Exodus'),job=await hx.load('Job');
 const e=html(hx,ex,'17:12');assert.match(e,/Nomen „Festigkeit“/);assert.match(e,/laut Field fraglich/);assert.match(e,/Zuschreibung an Aquila/);assert.match(e,/data-hx-explanation="editorial"/);
 const j=html(hx,job,'1:4');assert.match(j,/jeden Tag/);assert.match(j,/Jeder an seinem eigenen Tag/);
});
test('Every editorial record is source-bound, visible, translated and escaped',async()=>{
 const {hx,window}=fixture(),spec=JSON.parse(fs.readFileSync(path.join(root,'tools/hexapla/explanations.json')));
 for(const [key,n] of Object.entries(spec.records)){
  const [,book,ref,index]=/^(.*) (\d+:\d+)#(\d+) /.exec(key),d=await hx.load(book);
  assert.equal(d.verses[ref][+index].t,n.unitText,key);for(const note of n.variants||[n])assert(html(hx,d,ref).includes(escape(note.n)),key);
 }
 const d=await hx.load('Exodus'),key='Exodus 17:12#0 Ἀ.',record=window.HEXAPLA_EXPLANATIONS.records[key];
 const original=record.n;record.n='<img src=x onerror=alert(1)>';
 const safe=html(hx,d,'17:12');assert(safe.includes('&lt;img'));assert(!safe.includes('<img'));
 record.n=original;d.verses['17:12'][0].t+=' ';assert(!html(hx,d,'17:12').includes(escape(original)),'changed source cannot inherit an editorial explanation');
 const en=fixture('en'),job=await en.hx.load('Job');assert(html(en.hx,job,'1:4').toLowerCase().includes('each on his own day'));assert(!html(en.hx,job,'1:4').includes('Verteilung auf die einzelnen'));
});
test('Reviewed Vorlage notes are visible without redundant automatic word comparisons',async()=>{
 const {hx}=fixture(),h=await hx.load('Hosea');assert.match(html(hx,h,'11:7'),/data-hx-explanation="reviewed"[^>]*>.*Joch/);
 const g=await hx.load('Genesis'),auto=html(hx,g,'1:9');assert(!auto.includes('data-hx-explanation="comparison"'));assert(!auto.includes('Abweichende Wörter:'));assert(!auto.includes('Anderes griechisches Wort für denselben hebräischen Text'));
 assert(auto.includes('Ob Wortwahl, andere Deutung oder andere Vorlage vorliegt, ist damit nicht entschieden.'));
});
test('Further explanations distinguish wording, wordplay and unresolved causes across books',async()=>{
 const {hx}=fixture();
 for(const [book,ref,expected] of [
  ['Deuteronomy','6:5','Denken/Sinn'],
  ['Proverbs','8:22','er erschuf mich'],
  ['Jeremiah','1:11','Wortspiel'],
  ['Zechariah','9:9','sanftmütig']
 ]){
  const d=await hx.load(book),out=html(hx,d,ref);
  assert(out.includes(expected),book+' '+ref);
  assert(out.includes('Redaktionelle KI-Erläuterung von Codex'),book+' provenance');
 }
});
test('Symmachus as the LXX is one reference row, not an empty new LXX witness',async()=>{
 const {hx}=fixture(),d=await hx.load('Exodus'),out=html(hx,d,'18:2');
 assert.equal((out.match(/class="tc-hx-row-sig"/g)||[]).length,4);
 assert.match(out,/tc-hx-row-sig">[^]*?Σ\.[^]*?ὡς[^]*?Ο΄[^]*?data-hx-fn="5"[^]*?data-hx-type="gleich"/);
 assert(out.includes('>wie LXX</abbr>'));assert(!out.includes('Verweis: dieselbe Wiedergabe'));
 assert(!out.includes('hier „ὡς οἱ“'));
});
test('Editorial explanations stay brief and translate rather than repeating Greek',()=>{
 const spec=JSON.parse(fs.readFileSync(path.join(root,'tools/hexapla/explanations.json')));
 for(const [key,record] of Object.entries(spec.records))for(const n of record.variants||[record])for(const language of ['n','en']){
  assert(!/\p{Script=Greek}/u.test(n[language]),key+' '+language+' repeats Greek');
  assert(n[language].split(/\s+/).length<=28,key+' '+language+' is too long');
 }
 assert.equal(spec.records['Exodus 18:2#0 Ἄλλος'].n,'„Mitgift“ statt „Entlassung“ (vgl. 1 Kön 9:16).');
});
test('Lowercase Three is its own row and a same-as-LXX reference is not folded away',async()=>{
 const {hx}=fixture(),d=await hx.load('Exodus'),out=html(hx,d,'18:1');
 assert(out.includes('Nur eine andere griechische Schreibweise des Namens Jitro.'));
 assert.match(out,/class="tc-hx-row-sig"><b class="tc-hx-sig"[^>]*>Καὶ οἱ Γ΄\.<\/b>/);
 assert(out.includes('„Des Herrn“ statt des Ortsnamens „Midian“'));
 assert(!out.includes('tc-hx-same-t">ὡς'),'References must stay readable in the short synopsis');
});
test('Psalm 1:1 explains every differing translator row and preserves S as a source siglum',async()=>{
 const {hx}=fixture(),d=await hx.load('Psalms'),entries=hx.entries(d,[{ref:'Psalms 1:1',row:'1'}]);
 const rows=entries.flatMap(e=>e.hexaplaRows),different=rows.filter(r=>['wiedergabe','translit','vorlage','deutung'].includes(r.type));
 assert.equal(different.length,8);assert(different.every(r=>r.hasExplanation));
 assert(rows.some(r=>r.siglum==='Ε΄. S΄.'));assert(!rows.some(r=>/^S΄\./.test(r.reading)));
 assert(entries.every(e=>Number.isInteger(e.hexaplaSource.unit)&&e.hexaplaSource.page));
 const out=entries.map(e=>e.html).join('');assert(out.includes('„Versammlung“ statt „Ratschlag“'));assert(out.includes('„Fremde“ statt „Gottlose“'));assert(out.includes('„Spötter“ statt „Verderber“'));
 const open=hx.entries(d,[{ref:'Psalms 1:2',row:'2'}]).flatMap(e=>e.hexaplaRows);
 assert(open.filter(r=>['wiedergabe','translit','vorlage','deutung','mt'].includes(r.type)).every(r=>r.hasExplanation),'The following verse is covered as well');
});
test('Genesis 1–3 covers every identified difference and keeps repeated witness subreadings separate',async()=>{
 const {hx,window}=fixture(),d=await hx.load('Genesis');
 for(const ref of Object.keys(d.verses).filter(r=>+r.split(':')[0]<=3))for(const entry of hx.entries(d,[{ref:'Genesis '+ref,row:ref}])){
  for(const row of entry.hexaplaRows)if(['wiedergabe','translit','vorlage','deutung','mt'].includes(row.type))assert(row.hasExplanation,row.key+' '+row.reading);
 }
 const out=html(hx,d,'1:14');
 assert.equal(out.split('Andere Befehlsform mit demselben Sinn').length-1,1);
 assert.equal(out.split('Andere Präposition mit derselben Bedeutung').length-1,2);
 const spec=window.HEXAPLA_EXPLANATIONS.records['Genesis 1:14#0 ’Α.'];
 spec.variants[0].reading+=' unexpected';const changed=html(hx,d,'1:14');
 assert(!changed.includes('Andere Befehlsform mit demselben Sinn'),'A mismatched subreading must not inherit a note');
 assert(changed.includes('Andere Präposition mit derselben Bedeutung'),'Other source-bound subreadings still work');
});
test('An explanation relying on a Field footnote is withheld if that footnote changes',async()=>{
 const {hx,window}=fixture(),d=await hx.load('Genesis'),key='Genesis 2:15#0 Σ.',n=window.HEXAPLA_EXPLANATIONS.records[key];
 assert(n.noteSources&&Object.keys(n.noteSources).length);assert(html(hx,d,'2:15').includes(escape(n.n)));
 d.notes[Object.keys(n.noteSources)[0]].la+=' changed';
 assert(!html(hx,d,'2:15').includes(escape(n.n)));
});
test('Every identified Pentateuch difference has a visible source-bound note in both languages',async()=>{
 const books=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'];
 for(const lang of ['de','en']){
  const {hx}=fixture(lang);let checked=0;
  for(const book of books){
   const d=await hx.load(book);let bookRows=0;
   for(const ref of Object.keys(d.verses))for(const entry of hx.entries(d,[{ref:book+' '+ref,row:ref}])){
    for(const row of entry.hexaplaRows)if(['wiedergabe','translit','vorlage','deutung','mt'].includes(row.type)){
     assert(row.hasExplanation,lang+' '+row.key+' '+row.reading);checked++;bookRows++;
    }
   }
   assert(bookRows>400,book+' must exercise its actual corpus');
  }
  assert(checked>4300,'Full Pentateuch, not only a sample');
 }
});
test('Every identified Neviim difference has a visible source-bound note through Malachi',async()=>{
 const books=['Joshua','Judges','I Samuel','II Samuel','I Kings','II Kings','Isaiah','Jeremiah','Ezekiel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'];
 for(const lang of ['de','en']){
  const {hx}=fixture(lang);let checked=0;
  for(const book of books){
   const d=await hx.load(book);
   for(const ref of Object.keys(d.verses))for(const entry of hx.entries(d,[{ref:book+' '+ref,row:ref}]))for(const row of entry.hexaplaRows){
    if(['wiedergabe','translit','vorlage','deutung','mt'].includes(row.type)){checked++;assert(row.hasExplanation,lang+' '+row.key+' '+row.reading);}
   }
  }
  assert(checked>14000,'The complete comparison corpus remains present');
 }
});

test('Every identified Ketuvim difference has a visible source-bound note in both languages',async()=>{
 const books=['Psalms','Proverbs','Job','Song of Songs','Ruth','Lamentations','Ecclesiastes','Esther','Daniel','Ezra','Nehemiah','I Chronicles','II Chronicles'];
 for(const lang of ['de','en']){
  const {hx}=fixture(lang);let checked=0;
  for(const book of books){
   const d=await hx.load(book);let bookRows=0;
   for(const ref of Object.keys(d.verses))for(const entry of hx.entries(d,[{ref:book+' '+ref,row:ref}]))for(const row of entry.hexaplaRows){
    if(['wiedergabe','translit','vorlage','deutung','mt'].includes(row.type)){checked++;bookRows++;assert(row.hasExplanation,lang+' '+row.key+' '+row.reading);}
   }
   assert(bookRows>0,book+' must exercise its actual comparison corpus');
  }
  assert(checked>8500,'The complete Ketuvim comparison corpus remains present');
 }
});
