'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const D=require('../tov-data'),GM=require('../gmorph'),audit=require('../tools/catss/tov-audit.json');
const root=path.resolve(__dirname,'..');
test('Tov apparatus preserves every imported original row and the licensed source fingerprints',()=>{
  const sources={};
  for(const [file,hash] of Object.entries(D.source.sha256)){
    const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'tools/catss/tov-source',file+'.gz')));
    assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),hash);
    sources[file]=raw.toString('latin1').split('\n');
  }
  let count=0;
  for(const v of Object.values(D.verses))for(const n of v.remarks){
    const line=sources[n.file][n.line-1].replace(/\r$/,'');
    assert.deepEqual(n.raw,[line.slice(0,30).trimEnd(),line.slice(30).trim()],v.ref);
    if(n.b)assert.equal(n.b,n.raw[0].slice(n.raw[0].indexOf('=')));
    if(n.raw.join(' ').includes('?'))assert(n.codes.includes('?'),v.ref);
    count++;
  }
  assert.equal(count,61284);
  assert.match(D.source.license,/BY-NC-SA 3.0/);
});
test('Greek contexts and word positions agree with the exact bundled CATSS witness, including A/B and Theodotion',()=>{
  const editions=new Map();
  for(const [code,e] of Object.entries(D.editions))editions.set(code,JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel))));
  for(const v of Object.values(D.verses)){
    const [,ch,vs]=/ (\d+):(\d+)$/.exec(v.ref),doc=editions.get(v.edition);
    const words=GM.words(doc.text[+ch-1][+vs-1]);assert.deepEqual(GM.words(v.text),words,v.ref);
    for(const n of v.remarks)if(n.g){const group=GM.words(n.g);assert.deepEqual(words.slice(n.start,n.start+group.length),group,v.ref);}
  }
  for(const [rel,hash] of Object.entries(audit.bundledSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'bundled',rel))).digest('hex'),hash);
  assert(D.editions.Jdga&&D.editions.Jdgb&&D.editions.DanTh);
});
test('Retroversions, uncertainty and missing coverage remain distinct; mislabeled Esther is excluded',()=>{
  const gen=D.verses['Gen 1:6'];
  assert(gen.remarks.some(n=>n.codes.includes('=;')&&n.bText.includes('ויהי')));
  assert(D.codes['=;'].includes('Rückübersetzung'));
  assert(D.codes['--+'].includes('kein Nachweis'));
  assert.equal(D.editions.Esth,undefined);assert.match(D.excluded.Esth,/Esra statt Esther/);
  for(const book of ['Psalms','Proverbs','Job','Hosea','Esther'])assert(!Object.values(D.editions).some(e=>e.book===book));
});

test('Numerical difference operators are preserved, not transliterated as Hebrew tet',()=>{
  const n=D.verses['Gen 2:2'].remarks.find(n=>n.codes.includes('=+'));
  assert.equal(n.b,'=+');assert.equal(n.bText,'=+');
  assert.equal(n.h,'השביעי');assert.equal(n.g,'τῇ ἕκτῃ');
  for(const v of Object.values(D.verses))for(const n of v.remarks){
    const prefix=n.codes.find(c=>c.startsWith('='));
    if(prefix)assert(n.bText.startsWith(prefix),v.ref+' '+n.b);
  }
});

test('MT grouping words retain their OSHB provenance and source-row position ranges',()=>{
  for(const [rel,hash] of Object.entries(audit.mtSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'bundled',rel))).digest('hex'),hash);
  for(const v of Object.values(D.verses)){
    assert(Array.isArray(D.mt[v.ref]),v.ref);
    for(const n of v.remarks)assert.equal(v.hWords.slice(n.hStart,n.hStart+n.hCount).join(' '),n.h,v.ref);
  }
});

test('Interlinear preview preserves the exact CATSS groups, counterparts, flags and retroversions',()=>{
  const docs=new Map();
  for(const [code,e] of Object.entries(D.editions))docs.set(code,JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel))));
  for(const v of Object.values(D.verses)){
    const [,ch,vs]=/ (\d+):(\d+)$/.exec(v.ref),original=docs.get(v.edition).text[+ch-1][+vs-1];
    const groups=[...original.matchAll(/<span class="wg(?: wm)?"([^>]*)>(.*?)<\/span>/g)].map(m=>{
      const attr=k=>new RegExp('data-'+k+'="([^"]*)"').exec(m[1])?.[1]||'';
      return [m[2],attr('h'),attr('f'),attr('r')];
    });
    assert.deepEqual(v.pairs.map(([g,h,f,r])=>[g,h,[...new Set(f)].sort().join(''),r]),groups,v.ref);
  }
});
