(function(root){
 'use strict';
 const F=typeof module!=='undefined'&&module.exports?require('./notes-formatting'):root.NotesFormatting;
 const tag=n=>String(n.tagName||'').toLowerCase();
 function toMarkdown(rootNode){
  function content(children){return children.reduce((out,node)=>out+(out&&!out.endsWith('\n')&&/^(p|div|ul|ol|blockquote)$/.test(tag(node))?'\n':'')+walk(node),'');}
  function walk(node){
   if(node.nodeType===3)return String(node.textContent||'').replace(/\u00a0/g,' ');
   if(node.nodeType!==1)return '';
   const name=tag(node),children=Array.from(node.childNodes||[]),body=content(children);
   if(name==='br')return '\n';
   if(name==='strong'||name==='b')return body?'**'+body+'**':'';
   if(name==='em'||name==='i')return body?'*'+body+'*':'';
   if(name==='a'){const value=node.getAttribute('data-nw-reference')||node.getAttribute('data-nw-url')||node.getAttribute('href')||'',target=F.target(value);return target?'['+body.replace(/[\[\]\n]/g,' ')+']('+value.replace(/[()\n]/g,encodeURIComponent)+')':body;}
   if(name==='li')return '- '+body.replace(/\n$/,'').replace(/\n/g,'\n  ')+'\n';
   if(name==='blockquote')return body.replace(/\n$/,'').split('\n').map(line=>'> '+line).join('\n')+'\n';
   if(name==='p'||name==='div')return (children.length===1&&tag(children[0])==='br'?'':body)+'\n';
   return body;
  }
  return content(Array.from(rootNode.childNodes||[])).replace(/\n$/,'');
 }
 function html(text){return text?F.markdown(text):'<p><br></p>';}
 function selection(element){const s=element.ownerDocument.getSelection();if(!s?.rangeCount)return null;const range=s.getRangeAt(0);return element.contains(range.commonAncestorContainer)?range.cloneRange():null;}
 function restore(element,range){element.focus();const s=element.ownerDocument.getSelection();s.removeAllRanges();if(range&&range.startContainer.isConnected&&element.contains(range.commonAncestorContainer))s.addRange(range);else{const r=element.ownerDocument.createRange();r.selectNodeContents(element);r.collapse(false);s.addRange(r);}}
 const api={toMarkdown,html,selection,restore};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NotesRichText=api;
})(typeof window==='undefined'?globalThis:window);
