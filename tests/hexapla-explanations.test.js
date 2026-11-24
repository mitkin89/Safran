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
 const e=html(hx,ex,'17:12');assert.match(e,/Nomen für אֱמוּנָה/);assert.match(e,/Field bezweifelt in Fußnote 14/);assert.match(e,/Zuschreibung ist daher unsicher/);assert.match(e,/data-hx-explanation="editorial"/);
 const j=html(hx,job,'1:4');assert.match(j,/jeden Tag/);assert.match(j,/jeder an seinem eigenen Tag/);assert.match(j,/Verteilung auf die einzelnen Söhne/);
});
test('Every editorial record is source-bound, visible, translated and escaped',async()=>{
 const {hx,window}=fixture(),spec=JSON.parse(fs.readFileSync(path.join(root,'tools/hexapla/explanations.json')));
 for(const [key,n] of Object.entries(spec.records)){
  const [,book,ref,index]=/^(.*) (\d+:\d+)#(\d+) /.exec(key),d=await hx.load(book);
  assert.equal(d.verses[ref][+index].t,n.unitText,key);assert(html(hx,d,ref).includes(escape(n.n)),key);
 }
 const d=await hx.load('Exodus'),key='Exodus 17:12#0 Ἀ.',record=window.HEXAPLA_EXPLANATIONS.records[key];
 const original=record.n;record.n='<img src=x onerror=alert(1)>';
 const safe=html(hx,d,'17:12');assert(safe.includes('&lt;img'));assert(!safe.includes('<img'));
 record.n=original;d.verses['17:12'][0].t+=' ';assert(!html(hx,d,'17:12').includes(escape(original)),'changed source cannot inherit an editorial explanation');
 const en=fixture('en'),job=await en.hx.load('Job');assert(html(en.hx,job,'1:4').includes('each on his own day'));assert(!html(en.hx,job,'1:4').includes('Verteilung auf die einzelnen'));
});
test('Reviewed Vorlage notes are visible without redundant automatic word comparisons',async()=>{
 const {hx}=fixture(),h=await hx.load('Hosea');assert.match(html(hx,h,'11:7'),/data-hx-explanation="reviewed"[^>]*>Erläuterung:.*Joch/);
 const g=await hx.load('Genesis'),auto=html(hx,g,'1:9');assert(!auto.includes('data-hx-explanation="comparison"'));assert(!auto.includes('Abweichende Wörter:'));assert(!auto.includes('Anderes griechisches Wort für denselben hebräischen Text'));
 assert(auto.includes('Ob Wortwahl, andere Deutung oder andere Vorlage vorliegt, ist damit nicht entschieden.'));
});
test('Further explanations distinguish wording, wordplay and unresolved causes across books',async()=>{
 const {hx}=fixture();
 for(const [book,ref,expected] of [
  ['Deuteronomy','6:5','Denken/Sinn'],
  ['Proverbs','8:22','theologische Auslegung'],
  ['Jeremiah','1:11','Wortspiel'],
  ['Zechariah','9:9','sanftmütig/mild']
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
 assert(out.includes('Verweis: dieselbe Wiedergabe wie in der LXX-Zeile.'));
 assert(!out.includes('hier „ὡς οἱ“'));
});
