'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),M=require('../../mishnah-morph'),B=require('../../bavli-core'),R=require('../../reader'),AutoRef=require('../../autoref'),{stripHtml}=require('../../lib');
const version="Mishnah based on the Kaufmann manuscript, edited by Dan Be'eri",title='Mishnah Berakhot',rules=require('./rules.json');
const e=require('../../bundled/manifest.json').items.find(e=>e.title===title&&e.versionTitle===version),doc=JSON.parse(fs.readFileSync(path.join(root,'bundled',e.rel))),seed=require('../../bavli-morph');
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const main=s=>stripHtml(AutoRef.link(R.splitFootnotes(s).main,{last:''}).replace(/<a\b[^>]*class="aref"[^>]*>[\s\S]*?<\/a>/gi,' ').replace(/<small\b[^>]*>[\s\S]*?<\/small>/gi,' ').replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n')).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n));
const lex=new Map();
function add(word,a){if(/Ncmp/.test(a.morph))a={...a,lemma:a.lemma.split('/').map(l=>l==='מַי'?'מים':l).join('/')};const key=M.normalize(word);if(!key)return;const list=lex.get(key)||[];const id=a.lemma+'|'+a.morph;if(!list.some(x=>x.lemma+'|'+x.morph===id))list.push(a);lex.set(key,list);}
function ruleIds(a){const ids=['lexical'];if(/\/Sp/.test(a.morph))ids.push('suffix');if(/N|A/.test(a.morph.slice(1)))ids.push('nominal');if(/V/.test(a.morph.slice(1)))ids.push('verb');if(/P/.test(a.morph.slice(1)))ids.push('pronoun');if(/c(?:\/|$)/.test(a.morph))ids.push('construct');return [...new Set(ids)];}
// The Hebrew forms are lexical hints only. Bavli context, reviewed status,
// syntactic roles, and Aramaic analyses are deliberately not transferred.
for(const o of seed.occurrences){const entry=seed.lexicon[o.id];if(entry?.status!=='reviewed')continue;for(const a of B.analyses(entry)){
 if(a.lang!=='H'||!a.morph?.startsWith('H')||/V.[qw]/.test(a.morph))continue;
 add(o.word,{lemma:a.lemma,morph:a.morph,...(a.root?{root:a.root}:{}),rules:ruleIds(a),method:'lexicon'});
}}
// Closed forms and explicit Mishnaic lexical distinctions. These are our own
// implementations of grammatical facts, not copied paradigms or book text.
function own(word,lemma,morph,rule='nominal',root){if(/^HAc/.test(morph))lex.set(M.normalize(word),[]);add(word,{lemma,morph,...(root?{root}:{}),rules:[rule],method:'lexicon'});}
for(const[w,l,m]of [
 ['אֲנִי','אני','HPp1cs'],['אָנוּ','אנו','HPp1cp'],['אֲנַחְנוּ','אנחנו','HPp1cp'],['אַתָּה','אתה','HPp2ms'],['אַתְּ','את','HPp2fs'],['אַתֶּם','אתם','HPp2mp'],['אַתֵּם','אתם','HPp2mp'],['הוּא','הוא','HPp3ms'],['הִיא','היא','HPp3fs'],['הֵן','הן','HPp3fp'],['הֵם','הם','HPp3mp'],['זֶה','זה','HPdxms'],['זוֹ','זו','HPdxfs'],['זֹאת','זאת','HPdxfs'],['אֵלּוּ','אלו','HPdxcp'],['מִי','מי','HPi'],['מַה','מה','HPi'],['מָה','מה','HPi']])own(w,l,m,'pronoun');
for(const[w,l,m]of [['לֹא','לא','HTn'],['אִם','אם','HC'],['אוֹ','או','HC'],['אֶלָּא','אלא','HC'],['אֲבָל','אבל','HC'],['עַל','על','HR'],['עַד','עד','HR'],['מִן','מן','HR'],['בֵּין','בין','HR'],['כֵּן','כן','HD'],['לָמָּה','למה','HPi'],['מֵאֵמָּתַי','מן/אימתי','HR/Pi']])own(w,l,m,'prefix');
for(const[w,l,m]of [['רְבִּי','רבי','HNcmsa'],['רַבִּי','רבי','HNcmsa'],['רַבָּן','רבן','HNcmsa'],['קוֹרִין','קרא','HVqrmpa'],['קוֹרְאִין','קרא','HVqrmpa'],['נִכְנָסִים','כנס','HVNrmpa'],['לֹאכַל','ל/אכל','HR/Vqc'],['לִקְרוֹת','ל/קרא','HR/Vqc']])own(w,l,m,/V/.test(m)?'verb':'nominal');
// A known pointed cardinal is a lexical unit, not repeated relative prefixes.
own('שִׁשָּׁה','שש','HAcmsa','nominal');
// Shema is a prayer title throughout this pilot. Retain the verbal possibility
// in the form lexicon: a later token/context review may adjudicate a quotation.
own('שְׁמַע','שמע','HNcmsa','nominal');
// Independently written, form-level lexical candidates for this small pilot.
// These remain candidates; notes record lexical or contextual qualifications.
for(const file of ['lexical-review-a.json','lexical-review-b.json']){
 for(const entry of JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'))){
  for(const a of entry.analyses){
   if(!a.lemma||!/^H/.test(a.morph)||a.rules.some(id=>!rules[id]))throw Error('Invalid lexical candidate '+entry.word);
   add(entry.word,{...a,...(entry.note&&!a.note?{note:entry.note}:{})});
  }
 }
}
const clusters=w=>M.normalize(w).match(/[א-ת][\u05b0-\u05bc\u05c1\u05c2\u05c7]*/gu)||[];
const nominal=a=>a.morph.slice(1).split('/').some(p=>/^[NA]|^V.[rs]/.test(p));
const plural=a=>a.morph.slice(1).split('/').some(p=>/^[NA]..p|^V.[rs].p/.test(p));
const firstPlain=k=>k.replace(/^([א-ת][\u05b0-\u05c7]*)/,s=>s.replace(/\u05bc/g,''));
const memo=new Map();
function analyze(word,depth=0){const k=M.normalize(word),cacheKey=k+'|'+depth;if(memo.has(cacheKey))return memo.get(cacheKey);let aa=(lex.get(k)||[]).map(a=>({...a}));
 if(k.endsWith('ן'))for(const a of lex.get(k.slice(0,-1)+'ם')||[])if(plural(a))aa.push({...a,rules:[...new Set([...a.rules,'plural'])],method:'paradigm'});
 if(depth<3&&!aa.some(a=>/^HAc/.test(a.morph))){const cs=clusters(k),p=cs[0],rest=cs.slice(1).join('');if(cs.length>2&&p){
  const c=p[0],v=p.slice(1);let code='',lemma='',rid='prefix';
  if(c==='ו'&&/[\u05b0\u05b7\u05b8\u05bc]/.test(v)){code='C';lemma='ו';}
  if('בכל'.includes(c)&&/[\u05b0-\u05bb]/.test(v)){code='R';lemma=c;}
  if(c==='מ'&&/[\u05b4\u05b5]/.test(v)){code='R';lemma='מן';}
  if(c==='ש'&&/[\u05b6\u05b7]/.test(v)){code='Tr';lemma='ש';}
  if(c==='ה'&&/[\u05b6\u05b7\u05b8]/.test(v)){code='Td';lemma='ה';rid='article';}
  if(code){
   const keys=[rest];if(rid==='article'||c==='מ'||c==='ש'||'בכל'.includes(c))keys.push(firstPlain(rest));
   for(const key of new Set(keys))for(const a of analyze(key,depth+1)){
    if(rid==='article'&&!nominal(a))continue;
    aa.push({...a,lemma:lemma+'/'+a.lemma,morph:'H'+code+'/'+a.morph.slice(1),rules:[...new Set([...a.rules,rid])],method:'prefix'});
   }
  }
 }}
 const unique=new Map();for(const a of aa){const id=a.lemma+'|'+a.morph;if(!unique.has(id))unique.set(id,a);}aa=[...unique.values()];memo.set(cacheKey,aa);return aa;
}
const contexts=new Map(require('./context-corrections.json').map(r=>[r.ref+'/'+r.token,r]));
const forms=[],byKey=new Map(),rawForms=new Set(),chapters=[],totals={candidate:0,ambiguous:0,partial:0,unresolved:0};
for(const [c,ch]of doc.text.entries()){
 const out=[];
 for(const [m,html]of ch.entries()){
  const ids=[];
  for(const [i,t]of M.tokens(main(html)).entries()){
   const correction=contexts.get(`${c+1}:${m+1}/${i+1}`);
   if(correction&&M.normalize(correction.word)!==t.key)throw Error('Context correction no longer matches source');
   const key=correction?t.key+'|'+JSON.stringify(correction.analyses):t.key;
   let id=byKey.get(key);rawForms.add(t.key);
   if(id==null){
    const analyses=correction?correction.analyses:analyze(t.word),hints=[];
    if(!analyses.length&&/[י][\u05b0-\u05c7]*[םן]$/.test(t.key))hints.push('Pluralendung möglich; Grundform und Wortart bleiben offen.');
    const status=analyses.length>1?'ambiguous':analyses.length?'candidate':hints.length?'partial':'unresolved';
    id=forms.length;forms.push({word:t.word,key:t.key,status,analyses,hints,count:0});byKey.set(key,id);
   }
   forms[id].count++;totals[forms[id].status]++;ids.push(id);
  }
  out.push(ids);
 }
 chapters.push(out);
}
const D={version:1,edition:version,title,rules,sources:{[title]:{textHash:hash(doc.text),rel:e.rel,chapters}},forms,coverage:{chapters:chapters.length,mishnayot:chapters.reduce((n,c)=>n+c.length,0),words:Object.values(totals).reduce((a,b)=>a+b,0),forms:rawForms.size,analysisEntries:forms.length,statuses:totals},provenance:{method:'Grammar-based candidate analysis with screenshot feature comparison; unresolved differences retained',lexicalSeed:'Hebrew reviewed surface forms from Safran Bavli Berakhot 2a–10b, reused as lexical hints only',lexicalSeedSha256:hash(fs.readFileSync(path.join(root,'bavli-morph.js'),'utf8')),referenceStatus:'All 57 Berakhot units, chapters 1–9: 2159 source positions examined; 2153 grammatically comparable; 1885 compatible with supplied features, 268 strict feature or convention differences (47 separately accounted for by documented conventions), five wording variants and one source-only word; 205 positions lack separately visible suffix tags; all 226 residual positions separately reviewed, 10 still unresolved; screenshot comparison is not a full accuracy score'}};
fs.writeFileSync(path.join(root,'mishnah-morph-data.js'),'// Generated by tools/mishnah-morph/build.cjs; automatic candidates, not reviewed annotations.\n(function(D){if(typeof module!=="undefined"&&module.exports)module.exports=D;else window.MISHNAH_MORPH_DATA=D;})('+JSON.stringify(D)+');\n');
fs.writeFileSync(path.join(__dirname,'coverage.json'),JSON.stringify(D.coverage,null,2)+'\n');
console.log(D.coverage);
