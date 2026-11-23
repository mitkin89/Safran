// Search categories are independent of the catalog/download hierarchy.
(function(){
'use strict';
const ROOT='Kommentare zum Tanach';
const commentary=new Set(['Rishonim on Tanakh','Acharonim on Tanakh','Modern Commentary on Tanakh','Commentary']);
function path(categories){
 const cats=Array.isArray(categories)?categories:[];
 return cats[0]==='Tanakh'&&commentary.has(cats[1])?[ROOT,...cats.slice(1)]:[...cats];
}
function matches(entry,categories,titles){
 const cats=categories.map(c=>path(String(c).split('/')).join('/'));
 return (!cats.length&&!titles.size)||titles.has(entry.title)||cats.some(c=>(path(entry.categories).join('/')+'/').startsWith(c+'/'));
}
const api={path,matches,ROOT};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SearchCategories=api;
})();
