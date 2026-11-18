'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const R = require('../reader'), S = require('../samaritan-core'), D = require('../samaritan-data');
const source = require('../tools/samaritan/source.json'), manifest = require('../bundled/manifest.json');
const root = path.resolve(__dirname,'..');
const items = manifest.items.filter(i=>i.versionTitle==='Samaritanischer Pentateuch (Tal–Florentin)');
const span = /<span class="w" data-l="(sp:\d{6})" data-m="">/g;
const plain = html => html.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g,'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').trim();
const sha = (value,algorithm='sha256')=>crypto.createHash(algorithm).update(value).digest('hex');
test('All five Tal main texts apply the variants and preserve verified morphology',()=>{
  const tal=require('../tools/samaritan/tal-source.json'),P=require('../tools/samaritan/tal-parallel.json');
  assert.equal(items.length,5);const seen=new Set();let words=0;
  assert.equal(tal.appliedVariants,1074);
  assert.equal(sha(fs.readFileSync(path.join(root,'tools/samaritan/tal-parallel.json'))),tal.parallelDataSha256);
  for(const item of items){
    const raw=fs.readFileSync(path.join(root,'bundled',item.rel));assert.equal(sha(raw,'sha1'),item.hash);
    const doc=JSON.parse(raw);assert.equal(doc.license,'CC BY-NC 4.0');
    doc.text.forEach((chapter,c)=>chapter.forEach((html,v)=>{
      const ref=`${item.title} ${c+1}:${v+1}`,text=plain(html);
      if(!Object.hasOwn(tal.verseHashes,ref)){assert.equal(text,'');return;}
      assert.equal(sha(text),tal.verseHashes[ref],ref);
      assert.equal(text,P.he[ref].map(w=>w[0]).join(' '));words+=P.he[ref].length;
      const original=[...html.matchAll(span)],cleaned=[...R.cleanHtml(html).matchAll(span)];
      assert.deepEqual(cleaned.map(m=>m[1]),original.map(m=>m[1]));
      for(const m of original){assert(!seen.has(m[1]),m[1]);seen.add(m[1]);assert(S.word(D,m[1]));}
    }));
  }
  assert.equal(words,82446);
  assert.equal(tal.wordsWithSourceMorphology+tal.wordsWithoutTransferredMorphology,words);
  assert.equal(Object.keys(D.words).length,82335);
  assert.equal(Object.values(D.words).reduce((n,w)=>n+w[0].length,0),114891);
  const genesis=JSON.parse(fs.readFileSync(path.join(root,'bundled',items.find(i=>i.title==='Genesis').rel)));
  assert(plain(genesis.text[0][11]).includes('ותוציא'));
  const changed=D.variants.find(v=>v.ref==='Genesis 1:12'&&v.base==='ותוצא');
  assert(!genesis.text[0][11].includes(`data-l="sp:${changed.node}"`),'Changed form receives no assumed source analysis');
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
      assert(tal.notes.some(n=>n.targets.includes(ref)),ref);const [book,cv]=ref.split(' '),[c,v]=cv.split(':').map(Number);
      const footnotes=R.splitFootnotes(docs.get(book).text[c-1][v-1]).notes;
      assert.equal(footnotes.filter(f=>f.html===n.html).length,1,`${ref} note ${n.id}`);
    }
  }
  const first=tal.notes.find(n=>n.kind==='endnote'&&n.refs[0]==='Genesis 1:11');
  assert(first.html.includes('clarifies'));assert(first.html.includes('syntactic structure'));
  assert(first.html.includes('Tal–Florentin, Endnote Genesis 1:11 (S. 899)'));
  const shifted=tal.notes.find(n=>n.refs[0]==='Exodus 20:13');assert.deepEqual(shifted.targets,['Exodus 20:13']);
  const inserted=tal.notes.find(n=>n.refs[0]==='Exodus 30:1');assert.deepEqual(inserted.targets,['Exodus 30:1']);
  const moved=tal.notes.find(n=>n.refs[0]==='Exodus 29:28');assert.deepEqual(moved.targets,['Exodus 29:28']);
  const arabic=tal.notes.find(n=>n.kind==='endnote'&&n.refs[0]==='Genesis 2:14');assert(arabic.html.includes('الدجل'));
  const quoted=moved.html.replace(/<[^>]+>|[\u2066-\u2069]/g,'').replace(/\s+/g,' ');assert(quoted.includes('ולקחת משמן המשחה ומן הדם אשר על המזבח'));
  const ligature=tal.notes.find(n=>n.kind==='endnote'&&n.refs[0]==='Genesis 2:7');assert(ligature.html.includes('الانسان'));
});

test('Printed red differences survive the cleaner in Hebrew, English and notes',()=>{
  const P=require('../tools/samaritan/tal-parallel.json');let redHebrew=0;
  function colors(html){
    html=html.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g,'');
    const result=[],stack=[false];
    for(const part of html.match(/<[^>]*>|[^<]+/g)||[]){
      if(part.startsWith('</'))stack.pop();
      else if(part.startsWith('<'))stack.push(stack.at(-1)||part.includes('class="mt-diff"'));
      else for(const c of part.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'))if(/[א-ת]/.test(c))result.push([c,stack.at(-1)]);
    }return result;
  }
  for(const item of items){
    const doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',item.rel)));
    doc.text.forEach((ch,c)=>ch.forEach((h,v)=>{
      const ref=`${item.title} ${c+1}:${v+1}`;if(!P.he[ref])return;
      const expected=P.he[ref].flatMap(([w,m])=>[...w].map((c,i)=>[c,!!(m&(2**(w.length-i-1)))]));
      assert.deepEqual(colors(R.cleanHtml(h.replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g,''))),expected,ref);
      redHebrew+=expected.filter(x=>x[1]).length;
    }));
  }
  assert.equal(redHebrew,25690);
  assert(P.en['Deuteronomy 32:28'].map(p=>p[0]).join('').includes('nation void of its counsel')); // printed in a distinct 12pt italic run
  const ens=manifest.items.filter(i=>i.versionTitle==='The Samaritan Pentateuch, Florentin and Tal (2024)');assert.equal(ens.length,5);
  for(const item of ens){const raw=fs.readFileSync(path.join(root,'bundled',item.rel));assert.equal(sha(raw,'sha1'),item.hash);const doc=JSON.parse(raw);
    for(const [ref,parts] of Object.entries(P.en)){if(!ref.startsWith(item.title+' '))continue;const [c,v]=ref.split(' ')[1].split(':').map(Number);assert.equal(plain(doc.text[c-1][v-1]),parts.map(p=>p[0]).join('').trim(),ref);}
  }
  assert(R.cleanHtml('<span class="mt-diff">red</span>').includes('class="mt-diff"'));
  assert(!R.cleanHtml('<span class="mt-diff" onclick="alert(1)">red</span>').includes('onclick'));
  const tal=require('../tools/samaritan/tal-notes.json');assert(tal.notes.find(n=>n.refs[0]==='Genesis 1:11').html.includes('class="mt-diff"'));
  const nearRed=tal.notes.find(n=>n.kind==='footnote'&&n.refs[0]==='Genesis 17:10');assert(nearRed.html.includes('ונמלתם'));assert(nearRed.html.includes('class="mt-diff"')); // PDF uses #fb0007 here.
});
test('Parallel book export keeps MT red in both main texts and the apparatus',()=>{
  const E=require('../library-export');
  const selected=manifest.items.filter(i=>i.title==='Genesis'&&['Samaritanischer Pentateuch (Tal–Florentin)','The Samaritan Pentateuch, Florentin and Tal (2024)'].includes(i.versionTitle));
  const loaded=selected.map(entry=>({...JSON.parse(fs.readFileSync(path.join(root,'bundled',entry.rel))),entry}));
  const result=E.buildHtml({group:{title:'Genesis'},loaded,idx:0,sections:[{k:'1',label:'Kapitel 1',path:[0]}]},
    {scope:'current',fn:true},{t:s=>s,tr:s=>s,loc:'de',labels:{he:'Hebräisch',en:'Englisch'},shortVer:s=>s,stripHe:s=>s,noteId:()=>''});
  assert(result.includes('.mt-diff{color:#d00000!important}'));
  assert(result.includes('<span class="mt-diff">ועץ</span>'));
  assert(result.includes('<span class="mt-diff"><em>and</em></span>'));
  assert(result.includes('Tal–Florentin, Fußnote Genesis 1:11'));
  assert(result.includes('class="fn"'));
});
