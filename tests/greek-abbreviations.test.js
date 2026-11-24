'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {mark,dictionary}=require('../greek-abbreviations');
const plain=s=>s.replace(/<[^>]*>/g,'');
test('dictionary detection is limited to LSJ and Pape',()=>{
 assert.equal(dictionary('Liddell&Scott Greek-English Lexicon'),'lsj');
 assert.equal(dictionary('Pape, Griechisch-deutsches Handwörterbuch'),'pape');
 assert.equal(mark('acc. Arist.Ath.54.1','Other dictionary'),'acc. Arist.Ath.54.1');
});
test('LSJ author and work context repairs previously mislabelled sigla',()=>{
 const source='Arist.<i><abbr class="gab" data-t="Athenaeus">Ath.</abbr></i>54.1; Pl.Lg.774b; acc.';
 const result=mark(source,'LSJ');
 assert(result.includes('Aristoteles — Ἀθηναίων Πολιτεία'));
 assert(result.includes('Plato — Leges'));
 assert(mark('Pl.Prm. p.136','LSJ').includes('Plato — Parmenides'));
 assert(result.includes('Akkusativ'));
 assert(mark('acc. to the cited author','LSJ').includes('according to'));
 assert(!result.includes('data-t="Athenaeus"'));
 assert.equal(plain(result),plain(source));
 assert.equal(mark(result,'LSJ'),result);
});
test('Pape recognises italic author and work labels with punctuation outside tags',()=>{
 const source='<i>Plat. Phaedr</i>. 241 e; <i>acc</i>. c. <i>inf</i>.';
 const result=mark(source,'Pape');
 assert(result.includes('Plato — Phaedrus'));
 assert(result.includes('Akkusativ'));
 assert(mark('acc. to the cited author','LSJ').includes('according to'));
 assert(result.includes('Infinitiv'));
 assert.equal(plain(result),plain(source));
 assert(result.includes('<i>'));
 assert.equal(mark(result,'Pape'),result);
});
test('ambiguous Pape author sigla retain both names',()=>{
 const result=mark('Aesch. 2.26','Pape');
 assert(result.includes('Mehrdeutig: Aeschylus / Aeschines'));
});
test('Pape position labels are not assigned to book letters before locators',()=>{
 assert(!mark('A. 12; E. 15; M. 3','Pape').includes('greek-abbr'));
 assert(mark('241 A.','Pape').includes('am Anfang'));
});
test('markup attributes, scripts, ordinary words and visible text stay intact',()=>{
 const source='<a data-q="acc.">ordinary words</a><script>acc.</script><style>.acc {}</style> acc.';
 const result=mark(source,'LSJ');
 assert(result.includes('data-q="acc."'));
 assert(result.includes('<script>acc.</script>'));
 assert(result.includes('<style>.acc {}</style>'));
 assert.equal((result.match(/class="gab greek-abbr"/g)||[]).length,1);
 assert.equal(plain(result),plain(source));
 assert.equal(mark('Das ist ein Wort. This is ordinary prose.','Pape'),'Das ist ein Wort. This is ordinary prose.');
});
