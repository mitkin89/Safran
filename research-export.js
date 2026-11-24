'use strict';
// Self-contained HTML and real Office Open XML, not HTML renamed to .docx.
const zlib=require('node:zlib'),{cite,resolveBlocks}=require('./research-store'),L=require('./research-layout');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const isRtl=s=>/^[^\p{L}]*[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}]/u.test(String(s));
function documentModel(sheet,notes=[]){
 const bibliography=[],byCite=new Map(),blocks=resolveBlocks(sheet,notes).map(b=>{
  const c=b.type==='source'?cite(b.citation):'',key=c||'';let number=null;
  if(key){if(!byCite.has(key)){byCite.set(key,bibliography.length+1);bibliography.push(c);}number=byCite.get(key);}
  return {...b,citationText:c,citationNumber:number,edited:b.type==='source'&&b.text!==b.originalText};
 });return {title:sheet.title,description:sheet.description||'',blocks,bibliography,layout:L.layout(sheet.layout)};
}
function html(sheet,notes=[]){
 const d=documentModel(sheet,notes),l=d.layout,classic=l.template==='classic',para=s=>esc(s).replace(/\n/g,'<br>');
 const render=b=>{
  if(b.type==='heading')return '<h2 dir="auto">'+para(b.text||b.title)+'</h2>';
  return '<section class="block '+b.type+'">'+(b.title?'<h2 dir="auto">'+esc(b.title)+'</h2>':'')+
   (b.type==='source'?'<blockquote dir="auto">'+para(b.text)+'</blockquote>':'<p dir="auto">'+para(b.text)+'</p>')+
   (b.edited?'<p class="status">Bearbeiteter Auszug</p>':'')+(b.citationText?'<p class="citation">['+b.citationNumber+'] '+esc(classic?[b.citation.work,b.citation.locator].filter(Boolean).join(' '):b.citationText)+'</p>':'')+
   (b.noteSnapshot?.refs?.length?'<ul class="references">'+b.noteSnapshot.refs.map(r=>'<li>'+esc(r.label)+(r.citation?.edition?' — '+esc(r.citation.edition):'')+'</li>').join('')+'</ul>':'')+'</section>';
 };
 const g=L.group(d.blocks),side=(100-l.mainWidth)/2;
 const column=(blocks,role,width)=>'<td class="region '+role+'"'+(width?' style="width:'+width+'%"':'')+'>'+blocks.map(render).join('\n')+'</td>';
 const body=classic?'<table class="classic-upper" role="presentation"><tbody><tr>'+column(g.left,'left',side)+column(g.main,'main',l.mainWidth)+column(g.right,'right',side)+'</tr></tbody></table>'+(g.bottom.length?'<div class="bottom-wrap"><table class="classic-bottom" role="presentation"><tbody><tr>'+L.columns(g.bottom).map(xs=>column(xs,'bottom',100/3)).join('')+'</tr></tbody></table></div>':''):d.blocks.map(render).join('\n');
 return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>'+esc(d.title)+'</title><style>@page{size:A4 '+l.orientation+';margin:16mm}body{font-family:Georgia,"Times New Roman","SBL Hebrew",serif;font-size:12pt;line-height:1.55;color:#171717;background:white;max-width:'+(l.orientation==='landscape'?'265':'180')+'mm;margin:1.5em auto;padding:0 1em}h1{font-size:23pt;margin:0 0 1em}h2{font-size:1.06em;break-after:avoid}blockquote{margin:0;border-inline-start:2px solid #b48b51;padding:.4em .8em;unicode-bidi:plaintext}p{unicode-bidi:plaintext}.citation,.status,.references{font-size:9pt;color:#555;overflow-wrap:anywhere}.block{margin:1em 0}.bibliography{border-top:1px solid #aaa;margin-top:2em;font-size:10pt}.bibliography li{margin:.6em 0;overflow-wrap:anywhere}.references li{break-inside:avoid}table{border-collapse:collapse;table-layout:fixed;width:100%}.region{vertical-align:top;padding:0 3mm;overflow-wrap:anywhere}.region:first-child{padding-left:0}.region:last-child{padding-right:0}.region .block:first-child{margin-top:0}.region.main{font-size:'+l.mainSize+'pt;line-height:1.8}.region.left,.region.right{font-size:'+l.sideSize+'pt}.region.bottom{font-size:'+l.bottomSize+'pt}.region blockquote{padding:0;border:0}.region .citation,.region .references,.region .status{font-size:8pt}.bottom-wrap{border-top:1.5px solid #555;padding-top:5mm;margin-top:6mm}@media print{body{margin:0;padding:0;max-width:none}h1,h2{break-after:avoid}.citation{break-before:avoid}blockquote{orphans:3;widows:3}}</style></head><body>'+(l.showTitle?'<h1>'+esc(d.title)+'</h1>':'')+(d.description?'<p>'+para(d.description)+'</p>':'')+body+(d.bibliography.length?'<section class="bibliography"><h2>Quellenverzeichnis</h2><ol>'+d.bibliography.map(c=>'<li>'+esc(c)+'</li>').join('')+'</ol></section>':'')+'</body></html>';
}

const CRC_TABLE=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let crc=0xffffffff;for(const x of b)crc=CRC_TABLE[(crc^x)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function zip(files){
 const local=[],central=[];let offset=0;
 for(const [name,value]of Object.entries(files)){
  const filename=Buffer.from(name),raw=Buffer.from(value),compressed=zlib.deflateRawSync(raw),crc=crc32(raw),h=Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(filename.length,26);
  local.push(h,filename,compressed);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);central.push(c,filename);offset+=h.length+filename.length+compressed.length;
 }
 const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,cd,end]);
}
function docx(sheet,notes=[]){
 const d=documentModel(sheet,notes),p=(s,style='Normal',size=null)=>String(s).split('\n').map(line=>'<w:p><w:pPr><w:pStyle w:val="'+style+'"/>'+(isRtl(line)?'<w:bidi/>':'')+'</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="SBL Hebrew"/>'+(isRtl(line)?'<w:rtl/>':'')+(size?'<w:sz w:val="'+Math.round(size*2)+'"/><w:szCs w:val="'+Math.round(size*2)+'"/>':'')+'</w:rPr><w:t xml:space="preserve">'+esc(line.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,''))+'</w:t></w:r></w:p>').join('');
 let body=(d.layout.showTitle?p(d.title,'Title'):'')+(d.description?p(d.description):'');
 const render=(b,size=null)=>{let out='';if(b.type==='heading')return p(b.text||b.title,'Heading1',size);if(b.title)out+=p(b.title,'Heading2',size);out+=p(b.text,b.type==='source'?'Quote':'Normal',size);if(b.edited)out+=p('Bearbeiteter Auszug','Caption',8);if(b.citationText)out+=p('['+b.citationNumber+'] '+(d.layout.template==='classic'?[b.citation.work,b.citation.locator].filter(Boolean).join(' '):b.citationText),'Caption',d.layout.template==='classic'?8:null);for(const r of b.noteSnapshot?.refs||[])out+=p(r.label+(r.citation?.edition?' — '+r.citation.edition:''),'Caption',8);return out;};
 const landscape=d.layout.orientation==='landscape',pageW=landscape?16838:11906,pageH=landscape?11906:16838,usable=pageW-2268;
 const table=(cells,widths,sizes,border=false)=>'<w:tbl><w:tblPr><w:tblW w:w="'+usable+'" w:type="dxa"/><w:tblLayout w:type="fixed"/>'+(border?'<w:tblBorders><w:top w:val="single" w:sz="8"/></w:tblBorders>':'')+'<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid><w:tr>'+cells.map((blocks,i)=>'<w:tc><w:tcPr><w:tcW w:w="'+widths[i]+'" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>'+(blocks.map(b=>render(b,sizes[i])).join('')||p(''))+'</w:tc>').join('')+'</w:tr></w:tbl>';
 if(d.layout.template==='classic'){
  const g=L.group(d.blocks),center=Math.round(usable*d.layout.mainWidth/100),left=Math.floor((usable-center)/2);
  body+=table([g.left,g.main,g.right],[left,center,usable-center-left],[d.layout.sideSize,d.layout.mainSize,d.layout.sideSize]);
  if(g.bottom.length)body+=p('')+table(L.columns(g.bottom),[Math.floor(usable/3),Math.floor(usable/3),usable-2*Math.floor(usable/3)],[d.layout.bottomSize,d.layout.bottomSize,d.layout.bottomSize],true);
 }else body+=d.blocks.map(b=>render(b)).join('');
 if(d.bibliography.length){body+=p('Quellenverzeichnis','Heading1');d.bibliography.forEach((c,i)=>{body+=p('['+(i+1)+'] '+c,'Caption');});}
 const head='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 return zip({
  '[Content_Types].xml':head+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
  '_rels/.rels':head+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
  'word/document.xml':head+'<w:document xmlns:w="'+ns+'"><w:body>'+body+'<w:sectPr><w:pgSz w:w="'+pageW+'" w:h="'+pageH+'"'+(landscape?' w:orient="landscape"':'')+'/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>',
  'word/_rels/document.xml.rels':head+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'word/styles.xml':head+'<w:styles xmlns:w="'+ns+'"><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+[['Normal','Normal',24],['Title','Title',44],['Heading1','heading 1',32],['Heading2','heading 2',28],['Quote','Quote',24],['Caption','Caption',19]].map(([style,name,size])=>'<w:style w:type="paragraph" w:styleId="'+style+'"'+(style==='Normal'?' w:default="1"':'')+'><w:name w:val="'+name+'"/>'+(style==='Normal'?'':'<w:basedOn w:val="Normal"/>')+'<w:pPr>'+(style.startsWith('Heading')?'<w:keepNext/>':'')+'</w:pPr><w:rPr><w:sz w:val="'+size+'"/>'+(style.startsWith('Heading')||style==='Title'?'<w:b/>':'')+'</w:rPr></w:style>').join('')+'</w:styles>',
  'docProps/core.xml':head+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+esc(d.title)+'</dc:title><dc:creator>Safran</dc:creator></cp:coreProperties>'
 });
}
module.exports={html,docx,documentModel,zip,crc32};
