'use strict';
// Show a frozen data-quality report only for the exact audited edition and live coverage.
const report=require('./peshitta-concordance-status.json');
const books=new Map(report.books.map(b=>[b.book,b]));
function edition(entry,sourceSha256,words,withLemma){
 if(entry.language!=='Syriac'||!entry.versionTitle?.startsWith('ETCBC Peshitta'))return null;
 const b=books.get(entry.title);
 if(!b||b.sourceSha256!==sourceSha256||b.words!==words||b.withLemma!==withLemma)return null;
 return {stage:report.stage,unassigned:b.unassigned,provenance:b.sources,gaps:report.categories.map(c=>({id:c.id,label:c.label,count:b.gaps[c.id]||0})).filter(c=>c.count)};
}
module.exports={edition};
