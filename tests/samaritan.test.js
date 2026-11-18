'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const R = require('../reader'), S = require('../samaritan-core'), D = require('../samaritan-data');
const source = require('../tools/samaritan/source.json'), manifest = require('../bundled/manifest.json');
const root = path.resolve(__dirname,'..');
const items = manifest.items.filter(i=>i.versionTitle==='Samaritanischer Pentateuch (CACCHT, DT-UCPH 7.5.0)');
const span = /<span class="w" data-l="(sp:\d{6})" data-m="">([^<]*)<\/span>/g;
const plain = html => html.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g,'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').trim();
const sha = (value,algorithm='sha256')=>crypto.createHash(algorithm).update(value).digest('hex');
test('All five Samaritan books preserve the pinned source and clickable word groups',()=>{
  assert.equal(items.length,5);let verses=0,words=0,morphemes=0;const seen=new Set();
  for(const item of items){
    const raw=fs.readFileSync(path.join(root,'bundled',item.rel));assert.equal(sha(raw,'sha1'),item.hash);
    const doc=JSON.parse(raw);assert.equal(doc.license,'CC BY-NC 4.0');
    doc.text.forEach((chapter,c)=>chapter.forEach((html,v)=>{
      const ref=`${item.title} ${c+1}:${v+1}`;
      if(!Object.hasOwn(source.verseHashes,ref)){assert.equal(html,'','Source numbering gaps stay empty');return;}
      assert(html,ref);verses++;
      assert.equal(sha(plain(html)),source.verseHashes[`${item.title} ${c+1}:${v+1}`]);
      const original=[...html.matchAll(span)],cleaned=[...R.cleanHtml(html).matchAll(span)];
      assert.deepEqual(cleaned.map(m=>m[1]),original.map(m=>m[1]));
      for(const m of original){assert(!seen.has(m[1]));seen.add(m[1]);const w=S.word(D,m[1]);assert(w);words++;morphemes+=w.parts.length;}
    }));
  }
  assert.equal(verses,5841);assert.equal(words,82335);assert.equal(morphemes,114891);
  assert.equal(seen.size,Object.keys(D.words).length);
});
test('Morphology keeps prefixes distinct and does not invent unavailable stems',()=>{
  const first=S.word(D,'sp:405427');assert.deepEqual(first.parts.map(p=>p[2]),['prep','subs']);
  const verb=S.word(D,'sp:405429');assert.equal(S.lemma(verb.parts[0]),'ברא');
  assert(S.describe(verb.parts[0]).includes('Stamm: Qal'));
  assert(S.describe(verb.parts[0]).includes('Form: Perfekt'));
  const missing=D.lexicon.find(p=>p[2]==='verb'&&!p[3]);assert(missing);
  assert(S.describe(missing).includes('Stamm: Nicht bestimmt'));
  assert(!S.describe(missing).some(x=>x==='Stamm: Qal'));
  assert.equal(S.word(D,'bavli:berakhot:1'),null);
  assert.equal(S.word(D,'sp:999999'),null);
});
test('Tal–Florentin variants retain exact spans, readings, numbering and separate provenance',()=>{
  assert.equal(D.variants.length,1074);
  const v=D.variants.find(v=>v.ref==='Genesis 1:12'&&v.base==='ותוצא');assert(v);assert.equal(v.reading,'ותוציא');
  assert(!D.variants.some(v=>v.ref==='Genesis 1:22'));
  assert(D.variants.some(v=>v.span===0));assert(D.variants.some(v=>v.reading==='-'));
  assert(D.variants.some(v=>v.verseFT));
  const ids=Object.values(D.words).flatMap(w=>w[3]||[]);assert.equal(ids.length,1074);assert.equal(new Set(ids).size,1074);
  for(const v of D.variants){assert(Number.isInteger(v.span)&&v.span>=0);assert(source.verseHashes[v.ref]);}
});
test('The HTML cleaner only accepts bounded Samaritan word identifiers',()=>{
  assert(R.cleanHtml('<span class="w" data-l="sp:405429" data-m="">ברא</span>').includes('sp:405429'));
  assert(!R.cleanHtml('<span class="w" data-l="sp:405429" data-m="" onclick="alert(1)">ברא</span>').includes('onclick'));
  assert(!R.cleanHtml('<span class="w" data-l="sp:405429extra" data-m="">ברא</span>').includes('data-l'));
});
