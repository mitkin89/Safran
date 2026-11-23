'use strict';
const Morph=require('./morph');
let roots,keys;
function data(){if(!roots){roots=require('./passage-stats-data').roots;keys=new Set(Object.values(roots).map(f=>f.lang+':'+f.id));}return roots;}
function has(key){data();return keys.has(key);}
function valid(pattern){
 if(pattern.op==='term')return pattern.mode!=='root'||has(pattern.family);
 if(pattern.op==='related')return valid(pattern.child);
 return pattern.children.every(valid);
}
function matches(key,word){
 const d=word&&Morph.decode(word.morph,word.lemma),id=d?.segs[d.main]?.lemma,f=id&&data()[id];
 return f?f.lang+':'+f.id===key:null;
}
module.exports={has,valid,matches};
