// Versioned, bounded and independently testable saved-query storage.
(function(){
'use strict';
const P=typeof module!=='undefined'&&module.exports?require('./syntax-pattern'):window.SyntaxPattern;
const KEY='syntaxPatterns',MAX=200;
const fail=message=>{throw new Error(message);};
const copy=x=>JSON.parse(JSON.stringify(x));
function text(value,max){return typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f]/u.test(value)?value:fail('Ungültiges Suchmuster.');}
function grammar(g={}){
 if(!g||typeof g!=='object'||Array.isArray(g))fail('Ungültiges Suchmuster.');
 const known=['pos','stem','tense','person','gender','number','state','suffix','article'];
 if(Object.entries(g).some(([key,value])=>!known.includes(key)||typeof value!=='string'))fail('Ungültiges Suchmuster.');
 const n=P.clean({op:'term',role:'subject',gram:g});if(!n)fail('Ungültiges Suchmuster.');return n.gram;
}
function editable(n,raw){
 if(n.children)return {...n,children:n.children.map((c,i)=>editable(c,raw.children[i]))};
 if(n.child)return {...n,child:editable(n.child,raw.child)};
 if(n.lemmas){grammar(raw.gram??{});const {lemmas,...rest}=n;return {...rest,lemma:n.mode==='root'?String(raw.lemma||''):lemmas.join(', ')};}
 return n;
}
function snapshot(raw){
 if(!raw||typeof raw!=='object'||!['word','clause','advanced'].includes(raw.type))fail('Ungültiges Suchmuster.');
 const book=text(raw.book??'',100),base={type:raw.type,book};
 if(raw.type==='advanced'){
  const p=P.clean(raw.pattern);if(!p)fail('Ungültiges Suchmuster.');return {...base,pattern:editable(p,raw.pattern)};
 }
 const gram=grammar(raw.gram);
 if(raw.type==='word'){
  const query=text(raw.query??'',512).trim();if(!query&&!Object.keys(gram).length)fail('Das Suchmuster enthält keine Bedingung.');return {...base,query,gram};
 }
 const s=raw.syntax;if(!s||typeof s!=='object')fail('Ungültiges Suchmuster.');
 const verb=text(s.verb??'',128).trim(),subject=text(s.subject??'',256).trim(),object=text(s.object??'',256).trim();
 const words=[...(verb?[verb]:[]),...subject.split(/[\s,]+/u).filter(Boolean),...object.split(/[\s,]+/u).filter(Boolean)];
 if(words.some(w=>! /^(?=.*[א-ת])[\u0591-\u05C7א-ת]+$/u.test(w))||subject.split(/[\s,]+/u).filter(Boolean).length>12||object.split(/[\s,]+/u).filter(Boolean).length>12)fail('Ungültiges Suchmuster.');
 if(s.referents!==undefined&&typeof s.referents!=='boolean')fail('Ungültiges Suchmuster.');
 const domain=s.domain??'',relation=s.relation??'';
 if(!['','N','D','Q'].includes(domain)||!['','Resu'].includes(relation))fail('Ungültiges Suchmuster.');
 if(!words.length&&!domain&&!relation)fail('Das Suchmuster enthält keine Bedingung.');
 return {...base,syntax:{verb,subject,object,referents:s.referents===true,domain,relation},gram};
}
function item(raw){
 const id=text(raw?.id,80),name=text(raw?.name,100).trim();if(!id||!name)fail('Ein Name für das Suchmuster fehlt.');
 return {id,name,query:snapshot(raw.query),...(raw.origin?{origin:text(raw.origin,80)}:{})};
}
function parse(input){
 if(typeof input==='string'){if(input.length>2*1024*1024)fail('Die Suchmusterdatei ist zu groß.');try{input=JSON.parse(input);}catch{fail('Ungültige Suchmusterdatei.');}}
 if(input?.app!=='Safran'||input.kind!=='syntax-patterns'||input.version!==1||!Array.isArray(input.items)||input.items.length>MAX)fail('Ungültige Suchmusterdatei.');
 const items=input.items.map(item);if(new Set(items.map(x=>x.id)).size!==items.length)fail('Ungültige Suchmusterdatei.');return items;
}
const pack=items=>({app:'Safran',kind:'syntax-patterns',version:1,items});
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function create(storage){
 const list=()=>{const s=storage.getItem(KEY);return s?parse(s):[];};
 function write(items){if(items.length>MAX)fail('Höchstens 200 Suchmuster sind möglich.');const encoded=JSON.stringify(pack(items));if(encoded.length>2*1024*1024)fail('Die Suchmusterdatei ist zu groß.');storage.setItem(KEY,encoded);}
 return {list,
  save(name,query,selected=''){
   name=text(name,100).trim();if(!name)fail('Ein Name für das Suchmuster fehlt.');
   const items=list(),at=selected?items.findIndex(x=>x.id===selected):-1;
   if(selected&&at<0)fail('Dieses Suchmuster ist nicht mehr vorhanden.');
   if(items.some(x=>x.name===name&&x.id!==selected))fail('Dieser Name ist bereits vergeben.');
   const next={id:selected||id(),name,query:snapshot(query),...(at>=0&&items[at].origin?{origin:items[at].origin}:{})};if(at<0)items.push(next);else items[at]=next;write(items);return copy(next);
  },
  remove(selected){const items=list();write(items.filter(x=>x.id!==selected));},
  export(selected=''){const items=list().filter(x=>!selected||x.id===selected);if(!items.length)fail('Kein Suchmuster ausgewählt.');return JSON.stringify({...pack(items),exported:new Date().toISOString()},null,2);},
  import(input){
   const incoming=parse(input),items=list();let added=0,skipped=0;
   for(const next of incoming){
    const origin=next.origin||next.id;
    if(items.some(x=>(x.name===next.name||x.id===origin||x.origin===origin)&&JSON.stringify(x.query)===JSON.stringify(next.query))){skipped++;continue;}
    let name=next.name,n=2;while(items.some(x=>x.name===name)){name=next.name.slice(0,90)+' ('+(n++)+')';}
    items.push({id:id(),name,query:next.query,origin});added++;
   }
   write(items);return {added,skipped};
  },
 };
}
const api={create,snapshot,parse,KEY};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxPatterns=api;
})();
