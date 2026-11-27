'use strict';
// Use lexical annotations belonging to the witness itself, never an MT lemma
// or a spelling-based prefix remover. Keep homonym markers in the group key.
const SY = require('../../syriac-morph');
const content = new Set(['subs','nmpr','verb','adjv','advb','numr']);
function describe(surface, parts, language) {
  if (surface.trim().split(/\s+/u).length !== 1) return {key:'phrase:'+surface, type:'phrase', label:surface};
  const lexical = parts.filter(p => p.lex && content.has(p.sp));
  const main = lexical.length === 1 ? lexical[0] : !lexical.length && parts.length === 1 ? parts[0] : null;
  const label = main?.lex && (language === 'syr' ? SY.lemma(main.lex) : main.lex.replace(/[\/\[\]=]+$/g,''));
  return label ? {key:'lemma:'+main.lex+':'+main.sp, type:'lemma', label}
    : {key:'form:'+surface, type:'form', label:surface};
}
function add(index, lemma, descriptor, surface, code, number) {
  if (!index.has(lemma)) index.set(lemma,new Map());
  const groups=index.get(lemma);
  if (!groups.has(descriptor.key)) groups.set(descriptor.key,{...descriptor, forms:new Map(), cells:new Map()});
  const group=groups.get(descriptor.key), key=code+'\0'+surface;
  group.forms.set(surface,(group.forms.get(surface)||0)+1);
  if (!group.cells.has(key)) group.cells.set(key,{code,surface,refs:[]});
  group.cells.get(key).refs.push(number);
}
function serialize(index) {
  return Object.fromEntries([...index].map(([lemma,groups])=>{
    const entries=[...groups.values()];
    const labels=entries.map(g=>({type:g.type,key:g.key,forms:[g.label,...[...g.forms].sort((a,b)=>b[1]-a[1])]}));
    const cells=entries.flatMap((g,i)=>[...g.cells.values()].map(({code,surface,refs})=>{
      let previous=0;
      return [i,code,refs.length,refs.sort((a,b)=>a-b).map(ref=>{const delta=ref-previous;previous=ref;return delta.toString(36);}).join('.'),surface];
    }));
    return [lemma,[labels,cells]];
  }));
}
module.exports={describe,add,serialize};
