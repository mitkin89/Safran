'use strict';
// Self-contained HTML and real Office Open XML, not HTML renamed to .docx.
const zlib=require('node:zlib'),{cite,resolveBlocks}=require('./research-store');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const isRtl=s=>/^[^\p{L}]*[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}]/u.test(String(s));
function documentModel(sheet,notes=[]){
 const bibliography=[],byCite=new Map(),blocks=resolveBlocks(sheet,notes).map(b=>{
  const c=b.type==='source'?cite(b.citation):'',key=c||'';let number=null;
  if(key){if(!byCite.has(key)){byCite.set(key,bibliography.length+1);bibliography.push(c);}number=byCite.get(key);}
  return {...b,citationText:c,citationNumber:number,edited:b.type==='source'&&b.text!==b.originalText};
 });return {title:sheet.title,description:sheet.description||'',blocks,bibliography};
}
function html(sheet,notes=[]){
 const d=documentModel(sheet,notes),para=s=>esc(s).replace(/\n/g,'<br>');
 const blocks=d.blocks.map(b=>{
  if(b.type==='heading')return '<h2 dir="auto">'+para(b.text||b.title)+'</h2>';
  return '<section class="block '+b.type+'">'+(b.title?'<h2 dir="auto">'+esc(b.title)+'</h2>':'')+
   (b.type==='source'?'<blockquote dir="auto">'+para(b.text)+'</blockquote>':'<p dir="auto">'+para(b.text)+'</p>')+
   (b.edited?'<p class="status">Bearbeiteter Auszug</p>':'')+(b.citationText?'<p class="citation">['+b.citationNumber+'] '+esc(b.citationText)+'</p>':'')+
   (b.noteSnapshot?.refs?.length?'<ul class="references">'+b.noteSnapshot.refs.map(r=>'<li>'+esc(r.label)+(r.citation?.edition?' — '+esc(r.citation.edition):'')+'</li>').join('')+'</ul>':'')+'</section>';
 }).join('\n');
 return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>'+esc(d.title)+'</title><style>@page{size:A4;margin:20mm}body{font-family:Georgia,"Times New Roman","SBL Hebrew",serif;font-size:12pt;line-height:1.55;color:#171717;max-width:180mm;margin:1.5em auto;padding:0 1em}h1{font-size:25pt}h2{font-size:15pt;break-after:avoid}blockquote{margin:0;border-inline-start:3px solid #b48b51;padding:0.5em 1em;white-space:normal;unicode-bidi:plaintext}p{unicode-bidi:plaintext}.citation,.status,.references{font-size:9pt;color:#555;overflow-wrap:anywhere}.block{margin:1.4em 0}.bibliography{border-top:1px solid #aaa;margin-top:2em}.bibliography li{margin:.6em 0;overflow-wrap:anywhere}@media print{body{margin:0;padding:0;max-width:none}h1,h2{break-after:avoid}.citation{break-before:avoid}blockquote{orphans:3;widows:3}}</style></head><body><h1>'+esc(d.title)+'</h1>'+(d.description?'<p>'+para(d.description)+'</p>':'')+blocks+(d.bibliography.length?'<section class="bibliography"><h2>Quellenverzeichnis</h2><ol>'+d.bibliography.map(c=>'<li>'+esc(c)+'</li>').join('')+'</ol></section>':'')+'</body></html>';
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
 const d=documentModel(sheet,notes),p=(s,style='Normal')=>String(s).split('\n').map(line=>'<w:p><w:pPr><w:pStyle w:val="'+style+'"/>'+(isRtl(line)?'<w:bidi/>':'')+'</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="SBL Hebrew"/>'+(isRtl(line)?'<w:rtl/>':'')+'</w:rPr><w:t xml:space="preserve">'+esc(line.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,''))+'</w:t></w:r></w:p>').join('');
 let body=p(d.title,'Title')+(d.description?p(d.description):'');
 for(const b of d.blocks){if(b.type==='heading'){body+=p(b.text||b.title,'Heading1');continue;}if(b.title)body+=p(b.title,'Heading2');body+=p(b.text,b.type==='source'?'Quote':'Normal');if(b.edited)body+=p('Bearbeiteter Auszug','Caption');if(b.citationText)body+=p('['+b.citationNumber+'] '+b.citationText,'Caption');for(const r of b.noteSnapshot?.refs||[])body+=p(r.label+(r.citation?.edition?' — '+r.citation.edition:''),'Caption');}
 if(d.bibliography.length){body+=p('Quellenverzeichnis','Heading1');d.bibliography.forEach((c,i)=>{body+=p('['+(i+1)+'] '+c,'Caption');});}
 const head='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 return zip({
  '[Content_Types].xml':head+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
  '_rels/.rels':head+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
  'word/document.xml':head+'<w:document xmlns:w="'+ns+'"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>',
  'word/_rels/document.xml.rels':head+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'word/styles.xml':head+'<w:styles xmlns:w="'+ns+'"><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+[['Normal','Normal',24],['Title','Title',44],['Heading1','heading 1',32],['Heading2','heading 2',28],['Quote','Quote',24],['Caption','Caption',19]].map(([style,name,size])=>'<w:style w:type="paragraph" w:styleId="'+style+'"'+(style==='Normal'?' w:default="1"':'')+'><w:name w:val="'+name+'"/>'+(style==='Normal'?'':'<w:basedOn w:val="Normal"/>')+'<w:pPr>'+(style.startsWith('Heading')?'<w:keepNext/>':'')+'</w:pPr><w:rPr><w:sz w:val="'+size+'"/>'+(style.startsWith('Heading')||style==='Title'?'<w:b/>':'')+'</w:rPr></w:style>').join('')+'</w:styles>',
  'docProps/core.xml':head+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+esc(d.title)+'</dc:title><dc:creator>Safran</dc:creator></cp:coreProperties>'
 });
}
module.exports={html,docx,documentModel,zip,crc32};
