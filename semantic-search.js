'use strict';
// Exact lemma membership, never a prediction of the meaning in this context.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const Context = require('./semantic-context');
const Fields = require('./semantic-fields'), R = require('./reader'), S = require('./search');
const Order = require('./order'), Morph = require('./morph'), GM = require('./gmorph');
const { textOf } = require('./concordance'), Sources = require('./alignment-sources');
let lex, greek;
function load(name, key) {
  const w = {}; new Function('window', require('node:fs').readFileSync(path.join(__dirname, name), 'utf8'))(w); return w[key];
}
const hash = d => crypto.createHash('sha256').update(JSON.stringify(d.text)).digest('hex');
function ranges(text, forms) {
  let pos = 0;
  return forms.map(w => { const s = text.indexOf(w, pos); if (s < 0) return null; pos = s + w.length; return { s, e: pos }; });
}
function rowWords(e, html, p) {
  if (e.kind === 'he') return [...html.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)"[^>]*>([^<]*)<\/span>/g)].map(m => {
    const d = Morph.decode(m[2], m[1]); return { form: textOf(m[3]), id: d?.segs[d.main]?.lemma || '' };
  });
  if (p.length !== 2 || !p.every(Number.isInteger)) return [];
  const bi = GM.bookIndex(greek, e.title, e.versionTitle), forms = GM.words(html);
  const toks = bi < 0 ? null : GM.verse(greek, bi, p[0] + 1, p[1] + 1);
  if (!toks || toks.length !== forms.length) return [];
  return forms.map((form, i) => {
    const t = toks[i], info = t && GM.info(greek, t.id);
    // Guessed or uncertain morphology is insufficient for an asserted lemma match.
    return { form, id: info && !t.guess && !t.low && GM.sameForm(info.form, form) ? info.lemma : '' };
  });
}
const locators = new WeakMap();
function result(e, d, p, text, spans, ix) {
  if(!locators.has(d))locators.set(d,R.makeLocator(d.text,d.sectionNames));
  const loc = locators.get(d)(p);
  return { rel:e.rel, title:e.title, heTitle:e.heTitle, versionTitle:e.versionTitle, kind:e.kind, path:p,
    loc:loc ? {path:loc.path,label:loc.label} : null, where:loc ? [loc.sectionLabel,loc.label].filter(Boolean).join(' · ') : '',
    snippet:{before:'',hit:'',after:''}, parts:S.snippetParts(text,{idx:ix,toks:spans}),
    words:[...new Set(ix.map(i=>text.slice(spans[i].s,spans[i].e)))], sub:false };
}
async function translations({dir, entries, source, doc, rows, isCancelled}) {
  if (!rows.length || source.kind !== 'he') return;
  const expected = require('./interlin-sources'), choices = [];
  const sourceHash = hash(doc);
  let skipped = 0;
  for (const [name, books] of Object.entries(expected)) {
    const meta = books[source.title]; if (!meta || meta.he.versionTitle !== source.versionTitle) continue;
    for (const e of entries.filter(e=>e.kind==='de' && e.title===source.title && e.versionTitle===meta.translation.versionTitle)) {
      if (isCancelled()) return;
      try {
        const d = JSON.parse(await fs.readFile(path.join(dir,e.rel),'utf8'));
        if (!Sources.check(meta,{textHash:sourceHash},[{textHash:hash(d)}]).ok) { skipped++; continue; }
        choices.push({name,e,d});
      } catch { skipped++; }
    }
  }
  for (const r of rows) r.semantic.translationSkipped = skipped;
  if (!choices.length) return;
  const w = {};
  try { new Function('window',await fs.readFile(path.join(__dirname,'interlin',source.title.replace(/ /g,'_')+'.js'),'utf8'))(w); } catch { return; }
  for (const r of rows) {
    if (isCancelled()) return;
    if (r.path.length !== 2 || !r.path.every(Number.isInteger)) continue;
    const ref = r.path.map(i=>i+1).join(':'), hit = new Set(r.positions);
    r.parallels = [];
    for (const {name,e,d} of choices) {
      const segs = w.INTERLIN_PARTS?.[source.title]?.[name]?.[ref], html = R.getByPath(d.text,r.path);
      if (!segs || typeof html !== 'string') continue;
      const text = textOf(html), spans = [], ix = []; let pos = 0;
      // Same source-order matching used by the renderer; preserve the exact occurrence.
      for (const [indices, raw] of segs) {
        const term = raw.trim(); if (!term) continue;
        const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+'),'g');
        re.lastIndex = pos; const m = re.exec(text); if (!m || m.index-pos>80) continue;
        pos = m.index + m[0].length;
        if (indices.some(i=>hit.has(i))) { ix.push(spans.length); spans.push({s:m.index,e:pos}); }
      }
      if (ix.length) r.parallels.push({...result(e,d,r.path,text,spans,ix),semantic:r.semantic});
    }
  }
}
async function search({dir, entries, params, onProgress=()=>{}, isCancelled=()=>false}) {
  const request=Context.request(params.semantic);
  const field = Fields.resolve(request);
  const out = {results:[],stats:[],dist:[],scanned:0,total:0,truncated:false,capped:false,cancelled:false,semantic:field};
  if (!field) return {...out,error:'Bitte ein gültiges Bedeutungsfeld auswählen.'};
  lex ||= load('oshb-lemmas.js','OSHB_LEMMAS');
  if (field.he.some(id=>!lex[id])) return {...out,error:'Unbekannte Strong-Kennung im Bedeutungsfeld.'};
  if (field.gr.length) {
    greek ||= load('lxx-morph.js','LXX_MORPH');
    const known=new Set(greek.L.map(rec=>Fields.fold(rec.split('\t')[0])));
    if(field.gr.some(l=>!known.has(Fields.fold(l))))return {...out,error:'Griechisches Lemma im Septuaginta-Index nicht belegt.'};
  }
  const contextual=field.id==='fear'&&!field.custom;
  const local=new Map((request.corrections||[]).map(r=>[Context.key(r),r]));
  const seeds=new Map(contextual?require('./semantic-context-genesis.json').records.map(r=>[Context.key(r),r]):[]);
  if(contextual)out.semanticCoverage={total:0,editorial:0,local:0,unreviewed:0,stale:0};
  const he = new Set(field.he), gr = new Set(field.gr.map(Fields.fold));
  const list = Order.sortTitles(entries.filter(e=>e.kind==='he' && /^Westminster/.test(e.versionTitle||'') && he.size || e.kind==='other' && /^Septuaginta \(/.test(e.versionTitle||'') && gr.size && GM.bookIndex(greek,e.title,e.versionTitle)>=0),e=>e.title);
  out.total=list.length;
  const limit=Math.max(1,Math.min(5000,Number(params.limit)||1000)), perFile=Math.max(1,Math.min(1000,Number(params.perFile)||25)), stats=new Map();
  out.errors=0;
  for (const e of list) {
    if (isCancelled()) break;
    let d; try { d=JSON.parse(await fs.readFile(path.join(dir,e.rel),'utf8')); } catch { out.errors++;out.scanned++;continue; }
    const rows=[];R.walkStrings(d.text,[],(html,p)=>rows.push({html,p}));
    let hits=0,occ=0,shown=0;const selected=[];
    for (let k=0;k<rows.length;k++) {
      if (k%32===0) { await new Promise(resolve=>setImmediate(resolve)); if(isCancelled())break; }
      const {html,p}=rows[k], words=rowWords(e,html,p); let ix=[];
      words.forEach((w,i)=>{if(e.kind==='he'?he.has(w.id):gr.has(Fields.fold(w.id)))ix.push(i);});
      if(!ix.length)continue;
      const text=textOf(html), spans=ranges(text,words.map(w=>w.form)); if(spans.some(x=>!x))continue;
      const contexts=new Map(), signature=contextual?crypto.createHash('sha256').update(html).digest('hex'):null;
      if(contextual){
        for(const i of ix){
          const record={book:e.title,versionTitle:e.versionTitle,kind:e.kind,path:p,position:i+1,id:words[i].id,signature};
          const context=Context.classify(record,local,seeds);contexts.set(i,context);
          out.semanticCoverage.total++;out.semanticCoverage[context.sense==='unreviewed'?'unreviewed':context.basis]++;if(context.stale)out.semanticCoverage.stale++;
        }
        if(request.sense!=='all')ix=ix.filter(i=>contexts.get(i).sense===request.sense);
        if(!ix.length)continue;
      }
      hits++;occ+=ix.length;
      if(out.results.length>=limit){out.truncated=true;continue;}
      if(shown>=perFile){out.capped=true;continue;}
      const r=result(e,d,p,text,spans,ix); r.positions=ix.map(i=>i+1);
      r.semantic={fieldId:field.id,title:field.title,en:field.en,custom:!!field.custom,...(contextual?{signature}:{}),
        matches:ix.map(i=>({id:words[i].id,lemma:e.kind==='he'?lex[words[i].id][0]:words[i].id,form:words[i].form,position:i+1,source:e.kind==='he'?'OSHB':'lxx-morph',...(contextual?{context:contexts.get(i)}:{})}))};
      out.results.push(r);selected.push(r);shown++;
    }
    await translations({dir,entries,source:e,doc:d,rows:selected,isCancelled});
    if(hits){stats.set(e.title,(stats.get(e.title)||0)+hits);out.dist.push({t:e.title,v:e.versionTitle,k:e.kind,h:hits,o:occ});}
    out.scanned++;onProgress({scanned:out.scanned,total:out.total,found:out.results.length});
  }
  out.stats=Order.sortTitles([...stats].map(([title,n])=>({title,n})),e=>e.title);
  out.cancelled=isCancelled();return out;
}
module.exports={search,rowWords,ranges};
