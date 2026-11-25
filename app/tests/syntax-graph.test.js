'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('../syntax-graph');
const term=lemma=>({op:'term',role:'verb',lemma,gram:{}});
test('Layout preserves clause paths and separates nodes on every level without changing the query',()=>{
 const tree={op:'all',children:[term('אמר'),{op:'related',relation:'child',child:{op:'any',children:[term('הלך'),term('ברא')]}}]},before=JSON.stringify(tree);
 const g=G.layout(tree);assert.equal(g.count,6);assert.equal(g.edges.length,5);
 assert(g.nodes.some(n=>n.path==='1.child.0'));
 for(const a of g.nodes){assert(a.x>=0&&a.x+a.width<=g.width);assert(a.y+a.height<=g.height);
  for(const b of g.nodes)if(a!==b&&a.y===b.y)assert(a.x+a.width<=b.x||b.x+b.width<=a.x);
 }
 assert.equal(JSON.stringify(tree),before);
});
test('Rendering escapes user values in text, tooltips and accessible labels',()=>{
 const g=G.render(term('<script>"&'));
 assert(!g.svg.includes('<script>'));assert(g.svg.includes('&lt;script&gt;&quot;&amp;'));
 assert(g.svg.includes('aria-pressed="true"'));assert(g.svg.includes('tabindex="0"'));
});
test('Graph limits match query bounds, including wrapping at the maximum depth',()=>{
 let tree=term('אמר');for(let i=0;i<6;i++)tree={op:'not',children:[tree]};assert.equal(G.layout(tree).maxDepth,6);
 assert.throws(()=>G.layout({op:'not',children:[tree]}),/40 Knoten/);
 assert.throws(()=>G.layout({op:'all',children:Array.from({length:13},()=>term(''))}),/Bedingungsgruppe/);
});
