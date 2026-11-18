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
test('Tal–Florentin apparatus is complete, source-labelled and attached without text changes',()=>{
  const tal=require('../tools/samaritan/tal-notes.json');
  assert.deepEqual(tal.counts,{footnote:3459,endnote:790});
  assert.equal(tal.notes.length,4249);
  assert.equal(tal.source.pdfSha256,'db109c6b620965c36f7b818ad16846ec7b13b8f8e79ebbbb63131bb2665f8d7a');
  const docs=new Map(items.map(i=>[i.title,JSON.parse(fs.readFileSync(path.join(root,'bundled',i.rel)))]));
  for(const n of tal.notes){
    assert(n.targets.length&&n.refs.length);
    assert.deepEqual(n.pdfPages,n.pages.map(p=>p+17));
    assert(n.pages.every(p=>n.kind==='footnote'?p>=87&&p<=896:p>=899&&p<=1032));
    assert(!/[\uFFFD\u0900-\u0DFF]/u.test(n.html),'No broken font encoding');
    let isolates=0;for(const c of n.html){if(/[\u2066-\u2068]/u.test(c))isolates++;if(c==='\u2069')isolates--;assert(isolates>=0);}assert.equal(isolates,0);
    assert(!R.cleanHtml(n.html).includes('<script'));
    for(const ref of n.targets){
      assert(source.verseHashes[ref],ref);const [book,cv]=ref.split(' '),[c,v]=cv.split(':').map(Number);
      const footnotes=R.splitFootnotes(docs.get(book).text[c-1][v-1]).notes;
      assert.equal(footnotes.filter(f=>f.html===n.html).length,1,`${ref} note ${n.id}`);
    }
  }
  const first=tal.notes.find(n=>n.kind==='endnote'&&n.refs[0]==='Genesis 1:11');
  assert(first.html.includes('clarifies'));assert(first.html.includes('syntactic structure'));
  assert(first.html.includes('Tal–Florentin, Endnote Genesis 1:11 (S. 899)'));
  const shifted=tal.notes.find(n=>n.refs[0]==='Exodus 20:13');assert.deepEqual(shifted.targets,['Exodus 20:17']);
  const inserted=tal.notes.find(n=>n.refs[0]==='Exodus 30:1');assert.deepEqual(inserted.targets,['Exodus 26:35']);
  const moved=tal.notes.find(n=>n.refs[0]==='Exodus 29:28');assert.deepEqual(moved.targets,['Exodus 29:21']);
  const arabic=tal.notes.find(n=>n.kind==='endnote'&&n.refs[0]==='Genesis 2:14');assert(arabic.html.includes('الدجل'));
  const quoted=moved.html.replace(/<[^>]+>|[\u2066-\u2069]/g,'').replace(/\s+/g,' ');assert(quoted.includes('ולקחת משמן המשחה ומן הדם אשר על המזבח'));
  const ligature=tal.notes.find(n=>n.kind==='endnote'&&n.refs[0]==='Genesis 2:7');assert(ligature.html.includes('الانسان'));
});
