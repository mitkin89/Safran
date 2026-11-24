// Deterministic query-tree layout. The diagram and form share one query model.
(function(){
'use strict';
function children(n,path){
 return n.child?[{node:n.child,path:path?path+'.child':'child'}]:(n.children||[]).map((node,i)=>({node,path:path?path+'.'+i:String(i)}));
}
function structure(tree){
 let count=0,maxDepth=0;
 function walk(n,path,depth){
  if(!n||depth>6||++count>40)throw Error('Höchstens 40 Knoten und 6 Ebenen sind möglich.');
  if(n.children&&(!n.children.length||n.children.length>12||(n.op==='not'&&n.children.length!==1)))throw Error('Ungültige Bedingungsgruppe.');
  maxDepth=Math.max(maxDepth,depth);for(const c of children(n,path))walk(c.node,c.path,depth+1);
 }
 walk(tree,'',0);return {count,maxDepth};
}
function layout(tree){
 const info=structure(tree),nodes=[],edges=[],widths=new Map(),W=234,H=96,GAP=24,LEVEL=146,PAD=24;
 function measure(n,path){const kids=children(n,path);const width=Math.max(W,kids.reduce((sum,c)=>sum+measure(c.node,c.path),0)+Math.max(0,kids.length-1)*GAP);widths.set(path,width);return width;}
 const width=measure(tree,'')+PAD*2,height=info.maxDepth*LEVEL+H+PAD*2;
 function place(n,path,left,depth,parent){
  const x=left+widths.get(path)/2-W/2,y=PAD+depth*LEVEL;
  nodes.push({path,node:n,x,y,width:W,height:H,parent});
  if(parent!==null)edges.push({from:parent,to:path});
  const kids=children(n,path);let offset=left+(widths.get(path)-(kids.reduce((s,c)=>s+widths.get(c.path),0)+Math.max(0,kids.length-1)*GAP))/2;
  for(const c of kids){place(c.node,c.path,offset,depth+1,path);offset+=widths.get(c.path)+GAP;}
 }
 place(tree,'',PAD,0,null);return {...info,width,height,nodes,edges};
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(tree,{selected='',t=x=>x,esc=escape,rootLabel=()=>''}={}){
 const graph=layout(tree),byPath=new Map(graph.nodes.map(n=>[n.path,n]));
 const roles={secondObject:'Zweites Objekt (MACULA o2)',prepositional:'Präpositionalgruppe',adverbial:'Adverbial (MACULA adv)',attribute:'Attribut / Genitiv',verb:'Verb',subject:'Ausdrückliches Subjekt',object:'Direktes Objekt',referent:'Gemeintes Subjekt',domain:'Textbereich',relation:'BHSA-Klauselbeziehung',kind:'Klauselart (BHSA)',clauseType:'Klauseltyp (BHSA)'};
 const names={all:'UND',any:'ODER',not:'NICHT',related:'Verknüpfte Klausel',same:'Dasselbe Wort',dependent:'Attribut dieses Wortes'};
 const relations={child:'Direkt abhängige Klausel',parent:'Übergeordnete Klausel',later:'Spätere Klausel im selben Vers',ancestor:'Übergeordnete Klauselkette',descendant:'Abhängige Klauselkette'};
 const labels={stem:{q:'Qal',N:'Nifal',p:'Piel',P:'Pual',h:'Hifil',H:'Hofal',t:'Hitpael',o:'Polel',O:'Polal',r:'Hitpolel',a:'Af‘el (aram.)',i:'Itpe‘el (aram.)',G:'Itaf‘al (aram.)'},number:{s:'Singular',p:'Plural',d:'Dual'},gender:{m:'m.',f:'f.',c:'c.'},tense:{p:'Perfekt',i:'Imperfekt',w:'Wayyiqtol',q:'Weqatal',v:'Imperativ',h:'Kohortativ',j:'Jussiv',r:'Partizip aktiv',s:'Partizip passiv',c:'Infinitiv constructus',a:'Infinitiv absolutus'},suffix:{1:'mit',0:'ohne'},article:{1:'mit',0:'ohne'},state:{a:'absolut',c:'constructus',d:'bestimmt / Emphaticus'},pos:{V:'Verb',Nc:'Nomen',Np:'Eigenname',Ng:'Gentilizium',A:'Adjektiv / Zahl',P:'Pronomen',R:'Präposition',C:'Konjunktion',D:'Adverb',T:'Partikel'}};
 const short=s=>String(s).length>29?String(s).slice(0,28)+'…':String(s);
 const links=graph.edges.map(e=>{
  const a=byPath.get(e.from),b=byPath.get(e.to),x=a.x+a.width/2,y=a.y+a.height,tx=b.x+b.width/2,ty=b.y;
  return `<path class="sxGraphEdge" d="M ${x} ${y} C ${x} ${y+24}, ${tx} ${ty-24}, ${tx} ${ty}"/>`;
 }).join('');
 const boxes=graph.nodes.map(n=>{
  const q=n.node,title=t(names[q.op]||roles[q.role]||q.role);
  const value=q.op==='dependent'?t('Am gebundenen Kernwort'):q.op==='same'?t(roles[q.role]):q.op==='related'?t(relations[q.relation])+(['ancestor','descendant'].includes(q.relation)?' · '+(q.minDepth??1)+'–'+(q.maxDepth??5):''):q.op==='term'?q.mode==='root'?t('Wortfamilie / Wurzel')+': '+(rootLabel(q.family)||q.lemma||q.family||t('auswählen')):q.value?t(q.value):q.lemma||q.lemmas?.join(', ')||t('beliebig'):children(q,n.path).length+' '+t(children(q,n.path).length===1?'direkte Bedingung':'direkte Bedingungen');
  const features=Object.entries(q.gram||{}).filter(([,v])=>v).map(([k,v])=>t({pos:'Wortart',stem:'Stamm',tense:'Zeitform',person:'Person',gender:'Genus',number:'Numerus',state:'Status',suffix:'Suffix',article:'Artikel'}[k])+': '+t(labels[k]?.[v]||v)).join(' · ');
  const position=q.preposition?t('Präposition')+': '+q.preposition:q.position?t({before:'davor',after:'danach',either:'Beliebig'}[q.position.order])+' '+t(roles[q.position.relative])+(q.position.maxGap===null?'':' · ≤ '+q.position.maxGap):'';
  const aria=[title,value,features,position].filter(Boolean).join(' · ');
  return `<g class="sxGraphNode ${q.op==='term'?'term':q.op==='related'?'related':'group'}${n.path===selected?' selected':''}" data-graph-select="${n.path}" role="button" tabindex="0" aria-pressed="${n.path===selected}" aria-label="${esc(aria)}" transform="translate(${n.x} ${n.y})"><title>${esc(aria)}</title><rect width="${n.width}" height="${n.height}" rx="10"/><text x="12" y="23" class="sxGraphTitle">${esc(short(title))}</text><text x="12" y="46" class="sxGraphValue" direction="auto">${esc(short(value))}</text><text x="12" y="66" class="sxGraphMeta">${esc(short(features))}</text><text x="12" y="84" class="sxGraphMeta">${esc(short(position))}</text></g>`;
 }).join('');
 return {...graph,svg:`<svg class="sxGraphCanvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${graph.width} ${graph.height}" width="${graph.width}" height="${graph.height}" role="group" aria-label="${esc(t('Grafischer Suchaufbau'))}">${links}${boxes}</svg>`};
}
const api={children,structure,layout,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SyntaxGraph=api;
})();
