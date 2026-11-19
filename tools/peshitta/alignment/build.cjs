'use strict';
// Usage: node tools/peshitta/alignment/build.cjs /path/to/PaTraCoSy-files
// Positional GIZA links only. No lexical guessing, gap filling or variant classification.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),input=process.argv[2];if(!input)throw Error('PaTraCoSy source directory required');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),textHash=d=>hash(JSON.stringify(d.text));
const sandbox={window:{}};for(const f of ['interlin.js','interlin-sources.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'bundled/manifest.json'))).items;
const entry=(test)=>manifest.find(e=>e.title==='Genesis'&&test(e));
const heEntry=entry(e=>e.versionTitle.startsWith('Westminster')),syEntry=entry(e=>e.language==='Syriac');
const read=e=>JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel)));
const he=read(heEntry),sy=read(syEntry),ph=sandbox.window.INTERLIN.Umschrift.Genesis;
if(textHash(he)!==sandbox.window.INTERLIN_SOURCES.Umschrift.Genesis.he.textHash)throw Error('Phonetic bridge does not match MT');
const pinned=require('./sources.json');
const originals={};const readSource=f=>{const b=fs.readFileSync(path.join(input,f));originals[f]=hash(b);if(originals[f]!==pinned.files[f])throw Error('Unexpected source checksum: '+f);return b.toString('utf8').trimEnd().split(/\r?\n/).map(s=>s.trim());};
const a3=readSource('AA3.final'),heLines=readSource('Genesis_HE.txt'),syLines=readSource('Genesis_SYR.txt');
if(a3.length!==heLines.length*3||syLines.length!==heLines.length)throw Error('Source line counts differ');
const syLetters=[...'ܐܒܓܕܗܘܙܚܛܝܟܠܡܢܣܥܦܨܩܪܫܬ'],ascii=[...'>BGDHWZXVJKLMNS<PYQRCT'];
const toAscii=Object.fromEntries(syLetters.map((c,i)=>[c,ascii[i]]));
const syNorm=s=>[...s].map(c=>toAscii[c]||(/[A-Z><]/.test(c)?c:'')).join('');
const heNorm=s=>s.normalize('NFC').replace(/[\s.]/g,'');
const words=(html,cls)=>[...html.matchAll(new RegExp('<span class="'+cls+'"[^>]*>(.*?)</span>','g'))].map(m=>m[1]);
// Each source token must end on a complete reader token boundary. A maqqef
// group can span several MT words, but a link never slices through a word.
function bridge(source,target,norm){
 const from=source.map(norm),to=target.map(([ids,s])=>[ids,norm(s)]);
 if(from.some(s=>!s)||to.some(([,s])=>!s)||from.join('')!==to.map(([,s])=>s).join(''))return null;
 const ranges=[];let p=0;for(const [ids,s]of to){ranges.push([p,p+s.length,ids]);p+=s.length;}
 const out=[];p=0;for(const s of from){const end=p+s.length,hits=ranges.filter(([a,b])=>a<end&&b>p);if(hits[0]?.[0]!==p||hits.at(-1)?.[1]!==end)return null;out.push([...new Set(hits.flatMap(r=>r[2]))]);p=end;}return out;
}
const data={version:1,book:'Genesis',source:{repo:'https://github.com/ETCBC/PaTraCoSy',commit:'5ae978de615d9287c3bce71b0b971a14dcd9af09',files:originals,method:'GIZA++ automatic positional alignment; unreviewed',he:{versionTitle:heEntry.versionTitle,textHash:textHash(he)},translation:{versionTitle:syEntry.versionTitle,textHash:textHash(sy)}},verses:{}};
const report={sourceVerses:heLines.length,accepted:0,rejected:[],links:0,unlinkedMT:0,unlinkedSyriac:0};
let sentence=0;
he.text.forEach((chapter,ci)=>chapter.forEach((html,vi)=>{
 const line=sentence++,ref=(ci+1)+':'+(vi+1),reject=reason=>report.rejected.push({ref,reason});
 const hh=a3[line*3],ss=a3[line*3+1],aa=a3[line*3+2];
 if(!hh?.startsWith('# Sentence pair ('+(line+1)+')')||ss!==syLines[line])throw Error('Broken A3 record '+ref);
 const tokens=[...aa.matchAll(/(\S+) \(\{([^}]*)\}\)/g)];
 if(tokens[0]?.[1]!=='NULL')throw Error('Missing NULL record '+ref);
 const hTokens=tokens.slice(1).map(m=>m[1]);
 if(hTokens.join(' ')!==heLines[line])throw Error('HE input/A3 mismatch '+ref);
 // A3 includes sentence-final punctuation as an unlinked token.
 const keep=tokens.slice(1).filter(m=>heNorm(m[1]));
 const hw=words(html,'w'),sw=words(sy.text[ci]?.[vi]||'','syw');
 const hp=ph[ref];if(!hp||hp.some(([,s])=>s.includes('*')))return reject('No exact phonetic bridge');
 const hb=bridge(keep.map(m=>m[1]),hp,heNorm);
 if(!hb||new Set(hp.flatMap(([ids])=>ids)).size!==hw.length||hp.flatMap(([ids])=>ids).some(i=>i<1||i>hw.length))return reject('Hebrew word boundaries differ');
 const sb=bridge(ss.split(/\s+/),sw.map((s,i)=>[[i+1],s]),syNorm);
 if(!sb)return reject('Syriac text or word boundaries differ');
 const links=new Map();keep.forEach((m,i)=>{for(const n of m[2].trim().split(/\s+/).filter(Boolean).map(Number)){
  if(!sb[n-1])throw Error('Syriac token out of range '+ref);
  for(const s of sb[n-1]){const old=links.get(s)||new Set();hb[i].forEach(h=>old.add(h));links.set(s,old);}
 }});
 const rows=sw.map((s,i)=>[Array.from(links.get(i+1)||[]).sort((a,b)=>a-b),s]);
 const seen=new Set(rows.flatMap(r=>r[0]));
 data.verses[ref]={he:hw,sy:sw,links:rows.map(r=>r[0])};
 report.accepted++;report.links+=rows.reduce((n,r)=>n+r[0].length,0);report.unlinkedMT+=hw.length-seen.size;report.unlinkedSyriac+=rows.filter(r=>!r[0].length).length;
}));
if(sentence!==heLines.length)throw Error('Verse counts differ');
fs.writeFileSync(path.join(root,'peshitta-alignment-data.js'),'// Automatically transferred positional links; see tools/peshitta/alignment/README.md.\nwindow.PESHITTA_ALIGNMENT_DATA='+JSON.stringify(data)+';\n');
fs.writeFileSync(path.join(__dirname,'coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rejected:report.rejected.length}));
