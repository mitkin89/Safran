(function(root){
'use strict';
function render(items,esc,names={}){
 const groups=new Map(),max=Math.max(1,...items.map(x=>x.n));
 for(const item of items){const key=item.corpus||'';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
 return `<div class="wcChart"><button type="button" class="wcChartReset" hidden>100% ↺</button><div class="wcChartViewport"><div class="wcPlot"><span class="wcMax">${max.toLocaleString()}</span>${[...groups].sort((a,b)=>['Tanach','Mishnah','LXX','Josephus','Philo','Onkelos','Neofiti 1','Pseudo-Jonathan','Peshitta'].indexOf(a[0])-['Tanach','Mishnah','LXX','Josephus','Philo','Onkelos','Neofiti 1','Pseudo-Jonathan','Peshitta'].indexOf(b[0])).map(([corpus,rows])=>`<div class="wcGrp" style="flex:${rows.length}"><div class="wcBars">${rows.map(r=>`<button type="button" class="wcBar wcDistBar" data-dist="${esc(r.key)}" data-corpus="${esc(corpus)}" data-chart-label="${esc(r.name+': '+r.n.toLocaleString())}" aria-label="${esc(r.name+': '+r.n.toLocaleString())}" style="--h:${r.n/max*100}"><i></i></button>`).join('')}</div><div class="wcAx">${esc(names[corpus]||corpus)}</div></div>`).join('')}</div></div><div class="wcTip" hidden></div></div>`;
}
const api={render};if(typeof module==='object'&&module.exports)module.exports=api;else root.WordCardChart=api;
})(typeof window==='object'?window:globalThis);
