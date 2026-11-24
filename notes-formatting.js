(function(root){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function target(value){
  const s=String(value||'').trim();
  if(/^(https?:|mailto:)/i.test(s)){try{const u=new URL(s);if(['http:','https:','mailto:'].includes(u.protocol))return {url:u.href};}catch{}return null;}
  // Local references have a work name and a numeric locator, never a URI scheme.
  return !/[<>\n]/.test(s)&&!/^\w+:/i.test(s)&&/\p{L}/u.test(s)&&/\d/.test(s)?{reference:s}:null;
 }
 function runs(text,style={},depth=0){
  text=String(text||'');if(depth>6)return [{text,...style}];
  const re=/\*\*\*([^*\n]+)\*\*\*|\[([^\]\n]+)\]\(([^)\n]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;let out=[],last=0,m;
  while((m=re.exec(text))){if(m.index>last)out.push({text:text.slice(last,m.index),...style});last=re.lastIndex;
   if(m[2]){const link=target(m[3]);out.push({text:link?m[2]:m[0],...style,...(link?{target:link}:{})});}
   else out.push(...runs(m[1]||m[4]||m[5],{...style,...(m[1]?{bold:true,italic:true}:m[4]?{bold:true}:{italic:true})},depth+1));
  }if(last<text.length)out.push({text:text.slice(last),...style});return out;
 }
 function inline(text,exports=false){return runs(text).map(r=>{
  let h=esc(r.text);if(r.bold)h='<strong>'+h+'</strong>';if(r.italic)h='<em>'+h+'</em>';
  if(r.target){if(exports){if(r.target.url)h='<a href="'+esc(r.target.url)+'">'+h+'</a>';else if(r.text!==r.target.reference)h+=' ('+esc(r.target.reference)+')';}
   else h='<a href="#" '+(r.target.url?'data-nw-url="'+esc(r.target.url):'data-nw-reference="'+esc(r.target.reference))+'">'+h+'</a>';}
  return h;
 }).join('');}
 function paragraphs(text){return String(text||'').split('\n').map(line=>{const li=/^\s*[-•]\s+(.*)$/.exec(line),q=/^\s*>\s?(.*)$/.exec(line);return {type:li?'list':q?'quote':'paragraph',runs:runs(li?.[1]??q?.[1]??line)};});}
 function markdown(text,exportLinks=false){
  let out='',list=false,quote=false;
  const close=()=>{if(list){out+='</ul>';list=false;}if(quote){out+='</blockquote>';quote=false;}};
  for(const line of String(text||'').split('\n')){
   const li=/^\s*[-•]\s+(.*)$/.exec(line),q=/^\s*>\s?(.*)$/.exec(line);
   if(li){if(quote){out+='</blockquote>';quote=false;}if(!list){out+='<ul>';list=true;}out+='<li dir="auto">'+inline(li[1],exportLinks)+'</li>';}
   else if(q){if(list){out+='</ul>';list=false;}if(!quote){out+='<blockquote>';quote=true;}out+='<p dir="auto">'+inline(q[1],exportLinks)+'</p>';}
   else{close();out+=line.trim()?'<p dir="auto">'+inline(line,exportLinks)+'</p>':'<br>';}
  }close();return out;
 }
 function format(text,start,end,action,link){
  text=String(text||'');start=Math.max(0,Math.min(start,text.length));end=Math.max(start,Math.min(end,text.length));
  let a=start,b=end,value=text.slice(a,b),insert,selection;
  if(action==='bold'||action==='italic'){const mark=action==='bold'?'**':'*';
   if(value.includes('\n')){const lines=value.split('\n'),remove=lines.filter(Boolean).every(line=>line.startsWith(mark)&&line.endsWith(mark)&&line.length>2*mark.length);insert=lines.map(line=>!line?'':remove?line.slice(mark.length,-mark.length):mark+line+mark).join('\n');return {text:text.slice(0,a)+insert+text.slice(b),start:a,end:a+insert.length};}
   const before=/\*+$/.exec(text.slice(0,a))?.[0].length||0,after=/^\*+/.exec(text.slice(b))?.[0].length||0,count=Math.min(before,after);
   if(action==='bold'?count>=2:count%2===1){return {text:text.slice(0,a-mark.length)+value+text.slice(b+mark.length),start:a-mark.length,end:b-mark.length};}
   value=value||'Text';insert=mark+value+mark;selection=[a+mark.length,a+mark.length+value.length];
  }else if(action==='list'||action==='quote'){
   a=start===0?0:text.lastIndexOf('\n',start-1)+1;b=text.indexOf('\n',end>start&&text[end-1]==='\n'?end-1:end);if(b<0)b=text.length;
   const lines=text.slice(a,b).split('\n'),re=action==='list'?/^([-•])\s+/:/^>\s?/,prefix=action==='list'?'- ':'> ',remove=lines.every(s=>re.test(s));
   insert=lines.map(s=>remove?s.replace(re,''):prefix+s).join('\n');selection=[a,a+insert.length];
  }else if(action==='link'){if(!target(link))throw Error('Bitte eine gültige Webadresse oder Fundstelle eingeben.');value=value||link;insert='['+value.replace(/[\[\]\n]/g,' ')+']('+link.replace(/[()\n]/g,c=>encodeURIComponent(c))+')';selection=[a,a+insert.length];}
  else throw Error('Unbekannte Formatierung.');
  return {text:text.slice(0,a)+insert+text.slice(b),start:selection[0],end:selection[1]};
 }
 class History{
  constructor(text=''){this.entries=[{text,start:0,end:0}];this.at=0;}
  push(next){if(next.text===this.entries[this.at].text)return;this.entries.splice(this.at+1);this.entries.push({...next});while(this.entries.length>150||(this.entries.length>2&&this.entries.reduce((n,e)=>n+e.text.length,0)>4*1024*1024))this.entries.shift();this.at=this.entries.length-1;}
  undo(){return this.at?this.entries[--this.at]:null;}
  redo(){return this.at<this.entries.length-1?this.entries[++this.at]:null;}
  get canUndo(){return this.at>0;}get canRedo(){return this.at<this.entries.length-1;}
 }
 const api={esc,target,markdown,runs,paragraphs,format,History};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NotesFormatting=api;
})(typeof window==='undefined'?globalThis:window);
