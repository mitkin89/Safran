'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Exodus 18:8 folds exact CATSS groups under the full explanation without losing source details',async()=>{
 const window={GMorph:require('../gmorph'),TextCrit:require('../textcrit-core')},box={window},root=path.join(__dirname,'..');
 const host={esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),load:async(p,get)=>{if(!get())vm.runInNewContext(fs.readFileSync(path.join(root,p),'utf8'),box);return get();}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'library-tov.js'),'utf8'),box);
 const tov=window.LibraryTov.create(host);await tov.load();await tov.loadReadings('Exodus');
 const q=[{ref:'Exodus 18:8',row:'8'}],records=[...tov.entries(q),...tov.readingEntries(q,r=>tov.mt(r))];
 const before=records.map(r=>r.html),html=tov.renderEntries(records);
 const details=[...html.matchAll(/<details class="tc-tov-source-details">([\s\S]*?)<\/details>/g)].map(m=>m[1]);
 assert(details.length,'Source groups have collapsible details');
 assert(details.some(d=>(d.match(/<article /g)||[]).length===4),'All four original word groups retained');
 for(const row of records)assert(html.includes(row.html),'No original or classified entry lost');
 assert.deepEqual(records.map(r=>r.html),before,'Rendering does not rewrite source entries');
 assert(html.includes('vgl. Ex 18:10'));
 // A coincidentally identical surface at another anchor is not the same evidence.
 const raw=records.find(r=>r.tovSource&&details.some(d=>d.includes(r.html)));assert(raw);
 const shifted={...raw,anchor:{...raw.anchor,start:999,end:999}};
 const check=tov.renderEntries([shifted,...records.filter(r=>r.tovReading)]);
 assert(!check.includes('tc-tov-source-details'));assert(check.includes(raw.html));
});
