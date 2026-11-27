const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const GM=require('../gmorph'),Forms=require('../forms'),Morph=require('../morph'),API=require('../word-card-corpora');
const c={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../word-card-corpora-data'),'utf8'),c);const model=API.create(c.window.WORD_CARD_CORPORA,{GM,Forms,Morph});
test('Josephus and Philo share a lemma view with independently counted corpora',()=>{
 const rows=model.extra('λαλέω',true),all=model.count(rows),j=model.count(model.filter(rows,'Josephus',{})),p=model.count(model.filter(rows,'Philo',{}));
 assert(j>0&&p>0);assert.equal(all,model.count(model.filter(rows,'Josephus',{}))+model.count(model.filter(rows,'Philo',{}))+['Aquila','Symmachus','Theodotion'].reduce((n,k)=>n+model.count(model.filter(rows,k,{})),0));
 const selected=model.filter(rows,'Josephus',{tense:'pres',mood:'ind'});assert(selected.length>0);assert(model.count(selected)<j);assert(selected.every(r=>r.features.tense.includes('pres')&&r.features.mood.includes('ind')));
 assert(model.suggest('λαλ',true,true).some(x=>x.label==='λαλέω'));
});
test('Mishnah candidates keep ambiguity without double counting tokens',()=>{
 const rows=model.extra('אמר',false);assert(rows.length>0);assert(model.coverage.mishnah.length===11);
 assert(model.count(rows)<rows.flatMap(r=>r.hits).reduce((n,h)=>n+h.n,0)||rows.every(r=>r.status==='candidate'));
 const repeated=[{corpus:'Mishnah',features:{tense:['a']},hits:[{id:'a',n:1}]},{corpus:'Mishnah',features:{tense:['b']},hits:[{id:'a',n:1}]}];assert.equal(model.count(repeated),1);
 const f=model.facets(rows,'Mishnah',{});assert(f.pos?.length);assert(f.stem?.length);
});
test('Hebrew and Greek grammars retain their respective dimensions',()=>{
 const h=model.features('HVpv2ms',false);assert.equal(h.stem[0],'Pi‘el');assert.equal(h.tense[0],'Imperativ');
 const g=model.features('V aor ind act 3rd pl',true);assert.deepEqual(g.tense,['aor']);assert.deepEqual(g.mood,['ind']);assert.deepEqual(g.voice,['act']);
});
test('Base-corpus occurrence counts agree with existing word cards',()=>{
 for(const [file,name,F,lemma,greek]of [['lxx-morph.js','LXX_MORPH',GM,'λαλέω',true],['oshb-forms.js','OSHB_FORMS',Forms,'559',false]]){
  const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../'+file),'utf8'),context);const D=context.window[name],mdl=F.model(D,lemma);
  assert.equal(model.count(model.base({D,mdl,F,greek})),mdl.total);
 }
});

test('Samaritan words retain their reading edition, morphology and surface form',()=>{
 const rows=model.filter(model.extra('ברא',false),'Samaritan',{});assert(rows.length>0);assert(rows.some(r=>r.features.pos.includes('Verb')));
 for(const h of model.unique(rows)){assert(h.version.includes('Tal–Florentin'));assert(h.rel);assert(h.targetForms.length);assert(!h.field);}
 assert(model.suggest('ברא',false,false).some(s=>s.source.includes('Samaritanus')));
});
test('All three Field witnesses are searchable with original fragments and citation identities',()=>{
 for(const source of ['Aquila','Symmachus','Theodotion']){
  const rows=model.filter(model.extra('ὀρθρίζω',true),source,{});assert(rows.length>0,source);
  const hit=model.unique(rows).find(h=>h.title==='Exodus'&&h.path[0]===31&&h.label==='6');assert(hit,source);
  assert(hit.field.reading.includes(source==='Symmachus'?'ὀρθρίσαντες':'ὤρθρισε'));assert(hit.field.sources.includes(source));assert.equal(hit.field.page,'140');
  assert(rows.some(r=>r.features.tense.includes('aor')));
 }
 assert(model.suggest('ὀρθρίζω',true,false)[0].source.includes('Aquila'));
});
test('All Greek corpora use the same grammatical paradigm and preserve occurrence identities',()=>{
 const rows=model.extra('δοκέω',true);
 for(const source of ['all','Josephus','Philo']){
  const selected=model.filter(rows,source,{}),table=model.greekModel(selected,'δοκέω');
  assert.equal(table.total,model.count(selected));assert(table.sections.some(s=>s.title==='Präsens'));
  const rendered=GM.render(table,{note:'Combined sources'});assert(rendered.includes('fmGrid'));assert(rendered.includes('fmG'));assert(!rendered.includes('Nur in der Septuaginta'));
  const indices=new Set();for(const section of table.sections)for(const block of section.blocks)for(const table of block.tables)for(const row of table.rows)for(const cell of row.cells)for(const form of cell)form.i.split(',').forEach(i=>indices.add(+i));
  assert.equal(model.count([...indices].map(i=>table.forms[i])),table.total,'Every attested form has an accessible table cell');
 }
 for(const source of ['Aquila','Symmachus','Theodotion']){
  const selected=model.filter(model.extra('ὀρθρίζω',true),source,{}),table=model.greekModel(selected,'ὀρθρίζω');
  assert.equal(table.total,model.count(selected));assert(table.sections.some(s=>s.title==='Aorist'));
 }
});
test('Alternative analyses do not inflate paradigm totals or same-form cells',()=>{
 const row=(voice)=>({form:'f',features:{pos:['V'],tense:['pres'],mood:['ind'],voice:[voice],person:['3'],number:['sg']},hits:[{id:'shared',n:1}]});
 const table=model.greekModel([row('act'),row('mid')],'x');assert.equal(table.total,1);assert.equal(table.sections[0].n,1);
 assert.equal(table.sections[0].blocks[0].tables[0].rows[0].cells[0][0].n,1);
});
