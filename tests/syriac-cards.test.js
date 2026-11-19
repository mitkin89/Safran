'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {create,norm}=require('../syriac-cards');
const context={window:{}};const bytes=fs.readFileSync(require.resolve('../sedra-data.js'));vm.runInNewContext(bytes.toString(),context);const D=JSON.parse(JSON.stringify(context.window.SEDRA_DATA)),M=create(D);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
test('SEDRA cards preserve separate spelling candidates, explicit root families and recorded form ids',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),require('../tools/sedra/report.json').cardSha256);
 assert.equal(Object.keys(D.lexemes).length,35892);assert.equal(Object.values(D.words).reduce((n,rows)=>n+rows.length,0),64585);
 assert(M.lookup('ܪܫܝܬ').includes('3019'));assert.deepEqual(M.lookup('ܪܺܫܺܝܬ݂'),M.lookup('ܪܫܝܬ'));
 const candidates=M.lookup('ܒܪܐ');assert(candidates.includes('467')&&candidates.includes('470'));assert.equal(M.lookup('ܠܠܠܠܠܠܠ').length,0);
 assert(M.family('3019').length>1);for(const id of M.family('3019'))assert.equal(D.lexemes[id].root,D.lexemes['3019'].root);
 const raw=require('node:zlib').gunzipSync(fs.readFileSync(require.resolve('../tools/sedra/source/words.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse);
 const expected=raw.filter(w=>w.lexeme_id===3019&&w.review_status==='verified'&&w.is_theoretical===false&&!w.merged_into_id);
 assert.deepEqual(M.words('3019').map(w=>w.id),expected.map(w=>w.id));
 for(const word of M.words('3019')){const original=expected.find(w=>w.id===word.id);assert.equal(word.syriac_vocalized_west,original.syriac_vocalized_west);assert.equal(word.syriac_vocalized_east,original.syriac_vocalized_east);assert.equal(word.source_id,original.source_id);}
 const word=M.words('3019')[0];assert(word.id&&word.syriac);assert.equal(M.groups('3019').reduce((n,[,rows])=>n+rows.length,0),M.words('3019').length);
 assert.equal(norm('ܟܬܒ̈ܐ'),norm('ܟܬܒܐ'));
});
test('SEDRA cards require a choice for ambiguous spelling and keep lexical morphology distinct',()=>{
 const ambiguous=M.render(null,'ܒܪܐ',esc);assert(ambiguous.card.includes('data-sid="467"'));assert(!ambiguous.card.includes('sc-family'));assert(!ambiguous.forms.includes('data-sedra-word'));
 const selected=M.render('3019','ܪܫܝܬ',esc);assert(selected.card.includes('beginning'));assert(selected.card.includes('sc-family'));assert(selected.card.includes('CC BY-NC 4.0'));assert(selected.forms.includes('Westliche Vokalisierung')&&selected.forms.includes('Östliche Vokalisierung'));assert(!selected.forms.includes('×'));
 assert(!M.render(null,'<script>',esc).card.includes('<script>'));
 const missing=Object.entries(D.lexemes).find(([,l])=>l.root==null);assert(missing);assert.equal(M.family(missing[0]).length,0);assert(M.render(missing[0],missing[1].form,esc).card.includes('Keine ausdrückliche Wurzelzuordnung'));
});
