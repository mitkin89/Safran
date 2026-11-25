'use strict';
const fs=require('node:fs'),path=require('node:path'),{profile}=require('./source-profile'),{compose}=require('./compose');
const root=path.resolve(__dirname,'../..'),manifest=require('../../bundled/manifest.json').items;
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8'));
const romans=['I','II','III','IV'],slugs=['i','ii','iii','iv'];
const native=[['The Book of Maccabees I','Makkabäer I (Septuaginta)'],['The Book of Maccabees II','Makkabäer II (Septuaginta)'],['Das dritte Buch der Makkabäer','Das dritte Buch der Makkabäer'],['Das vierte Buch der Makkabäer','Makkabäer IV (Septuaginta)']];
function build(){
 const books={};let chapters=0,passages=0;
 for(let b=0;b<4;b++){
  const sources=native[b].map((title,family)=>{const e=manifest.find(e=>e.title===title&&e.kind===(family===0?'de':'other'));if(!e)throw Error('Missing bundled Maccabees source');return profile(require(path.join(root,'bundled',e.rel)),family,{rel:e.rel});});
  const germanGreek=read('maccabees-'+slugs[b]+'-groups.json'),pairs=[{families:[0,1],maps:germanGreek}];
  if(b===0){sources.push(read('kahana-source.json'));pairs.push({families:[2,1],maps:read('kahana-i-groups.json')});}
  if(b<2){const family=b===0?3:2,he=require(path.join(root,'tests/fixtures/maccabees-'+slugs[b]+'-he.json'));sources.push(profile(he,family,{source:he.source,versionSource:he.versionSource,license:he.license}));pairs.push({families:[family,0],maps:read('frankel-'+slugs[b]+'-groups.json')});}
  // English merged exports have their own native divisions and can be incomplete.
  if(b<2){
   for(const [slug,family,base]of (b===0?[['i',4,0],['kahana-i',5,2]]:[['ii',3,0]])){
    const fixture='maccabees-'+slug+'-en.json',doc=require(path.join(root,'tests/fixtures',fixture));
    const checked=profile(doc,family,{fixture,versionSource:doc.versionSource,license:doc.license});
    while(checked.chapters.length<sources[0].chapters.length)checked.chapters.push({slots:0,visible:0,signature:require('../../maccabees-text').signature([])});
    sources.push(checked);pairs.push({families:[family,base],maps:read('english-'+slug+'-groups.json')});
   }
  }
  const crossFile='maccabees-'+slugs[b]+'-cross-chapter.json',cross=fs.existsSync(path.join(__dirname,crossFile))?read(crossFile):[];
  const canonicalFiles=b===0?{0:'i-de',2:'i-kahana-he',3:'i-he',4:'i-en',5:'i-kahana-en'}:b===1?{0:'ii-de',2:'ii-he',3:'ii-en'}:b===3?{0:'iv-de'}:{};
  const canonical={};for(const [family,file]of Object.entries(canonicalFiles))canonical[family]=read('canonical-'+file+'.json');
  const book={sources,chapters:[],canonical};
  if(sources.some(s=>s.chapters.length!==sources[0].chapters.length))throw Error('Chapter count mismatch');
  for(let c=0;c<sources[0].chapters.length;c++){
   const counts=sources.map(s=>s.chapters[c].slots),chapterPairs=pairs.map(p=>({families:p.families,groups:Array.isArray(p.maps)?p.maps[c]:p.maps[c+1]})),groups=compose(counts,chapterPairs);
   const continuations=[];for(const link of cross)for(const [from,to]of [[link.source,link.target],[link.target,link.source]])if(from.chapter===c+1)continuations.push({from,to});
   book.chapters.push({groups,pairs:chapterPairs,continuations});chapters++;passages+=groups.length;
  }
  books['Makkabäer '+romans[b]]=book;
 }
 const data={schema:2,books,counts:{books:4,chapters,passages}};
 fs.writeFileSync(path.join(root,'maccabees-alignment-data.js'),'// Checked passage boundaries and source fingerprints; see tools/maccabees/README.md.\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else window.MACCABEES_ALIGNMENT_DATA=d;})('+JSON.stringify(data)+');\n');return data;
}
module.exports={build};if(require.main===module)console.log(build().counts);
