// Hexapla as an apparatus witness: Frederick Field, Origenis Hexaplorum quae supersunt (Oxford 1875).
// Lemma, readings of the LXX with hexaplaric signs and of Aquila, Symmachus, Theodotion and others,
// footnotes in Latin with an English translation (hexapla-data/<Book>.js, tools/hexapla/build.py).
window.LibraryHexaplaTC=(()=>{
'use strict';
const BOOKS=/*BOOKS*/["Amos", "Daniel", "Deuteronomy", "Ecclesiastes", "Esther", "Exodus", "Ezekiel", "Ezra", "Genesis", "Habakkuk", "Haggai", "Hosea", "I Chronicles", "I Kings", "I Samuel", "II Chronicles", "II Kings", "II Samuel", "Isaiah", "Jeremiah", "Job", "Joel", "Jonah", "Joshua", "Judges", "Lamentations", "Leviticus", "Malachi", "Micah", "Nahum", "Nehemiah", "Numbers", "Obadiah", "Proverbs", "Psalms", "Ruth", "Song of Songs", "Zechariah", "Zephaniah"]/*END*/;
const HEXSIG=[[/^[’'‘]?Α\.|^Ἀ\./,'α′'],[/^Σ\./,'σ′'],[/^Θ\./,'θ′'],[/^(?:[Κκ]αὶ\s+)?[Οο]ἱ [Γγ]/,'οἱ γ′'],[/^Οἱ λ/,'οἱ λ′'],[/^Ὁ Σύρος/,'ὁ Σύρος'],[/^Ὁ Ἑβραῖος|^‘Ο ‘Εβραῖος|^Ἑβρ\./,'ὁ Ἑβραῖος'],[/Σαμαρειτικ/,'τὸ Σαμ.'],[/^[ΕE]΄/,'ε′'],[/^[Ϛς]΄/,'ϛ′'],[/^S΄/,'S΄'],[/^Ζ΄/,'ζ′'],[/^Ἄλλ|^Alia|^Aliter/,'ἄλλος']];
const SIGLA=/(Ο΄\.|(?:[Κκ]αὶ\s+)?[Οο]ἱ [Γγ]΄\.?|Οἱ λοιποί|Οἱ λ΄\.?|Ὁ Σύρος|Ὁ Ἑβραῖος|‘Ο ‘Εβραῖος|Ὁ Σαμαρειτικός|Τὸ Σαμαρειτικόν|Ἄλλος|Ἄλλως|[’'‘]?Α\.|Ἀ\.|Σ\.|Θ\.|Alia exempl\.|Aliter:|Ε΄\.|Ϛ΄\.|S΄\.|Ζ΄\.)/g;
// What each siglum stands for (hover).
const SIGTITLE=[[/^Ο΄/,'Ο΄ = die Septuaginta (LXX, „die Siebzig“)'],[/^(?:[Κκ]αὶ\s+)?[Οο]ἱ [Γγ]/,'Οἱ Γ΄ = „die Drei“: Aquila, Symmachus und Theodotion'],[/^Οἱ λ/,'Οἱ λοιποί = „die Übrigen“: die anderen griechischen Übersetzer (meist Aquila, Symmachus, Theodotion)'],[/^[’'‘]?Α\.|^Ἀ\./,'Ἀ. = Aquila (griechische Übersetzung, 2. Jh. n. Chr., sehr wörtlich)'],[/^Σ\./,'Σ. = Symmachus (griechische Übersetzung, um 200 n. Chr., freier und idiomatisch)'],[/^Θ\./,'Θ. = Theodotion (griechische Revision der LXX nach dem Hebräischen)'],[/^[ΕE]΄/,'Ε΄ = Quinta, die fünfte griechische Übersetzung der Hexapla (anonym)'],[/^[Ϛς]΄/,'Ϛ΄ = Sexta, die sechste griechische Übersetzung der Hexapla (anonym)'],[/^S΄/,'S΄ = Sigle der Field-Transkription'],[/^Ζ΄/,'Ζ΄ = Septima, eine siebte griechische Übersetzung (anonym)'],[/^Ὁ Σύρος/,'Ὁ Σύρος = „der Syrer“: von griechischen Kirchenvätern zitierte syrische Wiedergabe'],[/^Ὁ Ἑβραῖος|^‘Ο ‘Εβραῖος|^Ἑβρ\./,'Ὁ Ἑβραῖος = „der Hebräer“: anonymer, von Kirchenvätern zitierter Gewährsmann'],[/Σαμαρειτικ/,'Τὸ Σαμαρειτικόν = griechische Übersetzung des samaritanischen Pentateuch'],[/^Ἄλλος/,'Ἄλλος = „ein anderer“: nicht namentlich bekannter Übersetzer'],[/^Ἄλλως|^Aliter/,'„anders“: abweichende Wiedergabe'],[/^Alia/,'Alia exemplaria = andere Handschriften']];
function create(host){
  const esc=s=>host.esc(window.I18N?.textCrit?.(String(s))??s);
  const raw=s=>host.esc(String(s));
  const cache=new Map();
  const file=book=>'hexapla-data/'+String(book).replace(/ /g,'_')+'.js';
  function available(book){return BOOKS.includes(book);}
  let morph=null,vorlage=null,explanations=null;
  function load(book){
    if(!available(book))return Promise.resolve(null);
    // Greek morphology of the readings (hexapla-morph.js): optional, the apparatus works without it
    morph=morph||host.load('hexapla-morph.js',()=>window.HEXAPLA_MORPH).catch(()=>{morph=null;return null;});
    vorlage=vorlage||host.load('hexapla-vorlage.js',()=>window.HEXAPLA_VORLAGE).catch(()=>{vorlage=null;return null;});
    explanations=explanations||host.load('hexapla-explanations.js',()=>window.HEXAPLA_EXPLANATIONS).catch(()=>{explanations=null;return null;});
    if(!cache.has(book))cache.set(book,Promise.all([host.load(file(book),()=>window.HEXAPLA_DATA?.[book]),morph,vorlage,explanations]).then(([d])=>d).catch(e=>{cache.delete(book);throw e;}));
    return cache.get(book);
  }
  // Greek word -> tooltip with lemma, analysis (German via GMorph.describe) and short gloss
  const GWORD=/(<b class="tc-hx-sig"[^>]*>[^<]*<\/b>|<[^>]*>)|([\u0370-\u03FF\u1F00-\u1FFF][\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F]*[᾿’]?)/g;
  function lookup(w){
    const F=window.HEXAPLA_MORPH?.F;if(!F)return null;
    const k=window.GMorph?.form?window.GMorph.form(w):w;
    return F[k]||null;
  }
  const distinct=a=>{const seen=new Set();return a.filter(([l,k])=>{const id=l+'|'+k;if(seen.has(id))return false;seen.add(id);return true;}).slice(0,4);};
  function analyse(a){
    const G=window.GMorph,t=window.I18N?.t?(x=>window.I18N.t(x)):(x=>x);
    const seen=new Set();
    return a.filter(([l,k])=>{const id=l+'|'+k;if(seen.has(id))return false;seen.add(id);return true;}).slice(0,4).map(([lemma,key,gloss])=>{
      const d=G?.describe?G.describe(key,t):{pos:key,info:''};
      return lemma+' – '+[d.pos,d.info].filter(Boolean).join(', ')+(gloss?' – '+gloss:'');
    }).join('\n');
  }
  function words(h){
    return h.replace(GWORD,(m,tag,w)=>{
      if(tag)return tag;
      const a=lookup(w);
      // Morphology opens on click, not on hover (library-textcrit.js, data-tc-hx).
      return a?'<span class="tc-hx-w" tabindex="0" role="button" data-tc-hx="'+raw(analyse(a))+'" data-hx-an="'+raw(JSON.stringify(distinct(a)))+'">'+w+'</span>':w;
    });
  }
  const italic=s=>s.replace(/_([^_]+)_/g,'<i>$1</i>');
  function reading(data,u){return markup(data,u,u.t);}
  function markup(data,u,text){
    // markup on the escaped reading first; footnote tooltips are inserted last so their text stays untouched
    let h=italic(raw(text)).replace(SIGLA,m=>{const t=SIGTITLE.find(([re])=>re.test(m));return '<b class="tc-hx-sig"'+(t?' tabindex="0" title="'+esc(t[1])+'"':'')+'>'+m+'</b>';})
      .replace(/※/g,'<span class="tc-hx-sign" title="'+esc('Asterisk: von Origenes nach dem Hebräischen ergänzt')+'">※</span>')
      .replace(/÷/g,'<span class="tc-hx-sign" title="'+esc('Obelus: in der LXX ohne hebräisches Gegenstück')+'">÷</span>')
      .replace(/↙/g,'<span class="tc-hx-sign" title="'+esc('Metobelus: Ende eines mit kritischem Zeichen markierten Abschnitts')+'">↙</span>');
    h=words(h);
    return h.replace(/\^(\d+)/g,(m,n)=>{
      const key=(u.fn||[]).find(k=>k.endsWith('.'+n)),note=key&&data.notes[key];
      if(!note)return '<sup>'+n+'</sup>';
      // The footnote opens in place, right after its number (English first, Latin folded).
      return '<sup class="tc-hx-fn" tabindex="0" role="button" aria-expanded="false" data-hx-fn="'+raw(n)+'" title="'+esc('Fußnote aufklappen')+'">'+n+'</sup>'+inlineNote(note,n);
    });
  }
  // Synopsis: one row per translator under the LXX; words the same as in the LXX row are folded to „…“
  // (shown again with „Volltext“). Only for plain readings that start with Ο΄ and have at least two rows.
  const norm=t=>t.normalize('NFD').replace(/[^\p{L}]/gu,'').toLowerCase();
  function explanation(data,u,key,r,vl){
    const bound=window.HEXAPLA_EXPLANATIONS,review=bound?.records?.[key];
    const editorial=review?.unitText===u.t&&Object.entries(review.noteSources||{}).every(([id,n])=>data.notes?.[id]?.la===n.la&&data.notes?.[id]?.en===n.en)?(review.variants?review.variants.find(v=>v.reading===r.text.trim()&&(!v.forWord||v.forWord===r.for)):review):null,en=window.I18N?.lang==='en';
    const render=(text,kind,title)=>'<small class="tc-hx-explanation" lang="'+(en?'en':'de')+'" data-hx-explanation="'+kind+'" title="'+esc(title)+'">'+text+'</small>';
    if(editorial)return render(raw(en?editorial.en:editorial.n),'editorial','Redaktionelle KI-Erläuterung von Codex, 2026; Grundlage: Fields griechischer Wortlaut und Fußnoten.');
    if(vl?.n)return render(raw(en&&vl.en?vl.en:vl.n),'reviewed','Redaktionelle Einordnung von Claude, 2026; keine Aussage Fields.');
    if(r.lxxReference)return ''; // The adjacent ‘wie LXX’ label already translates this reference.
    if(!r.type||r.type==='gleich')return '';
    if(r.type==='asterisk'||r.type==='obelus')return render(esc(HXTYPES[r.type][1]),'sign','Erläuterung des hexaplarischen Zeichens.');
    return ''; // Word differences are already visible in the synopsis.

  }
  // A witness named inside ‘as/likewise the LXX’ is a reference, not a new reading.
  const referenceSiglum=(text,index,siglum)=>/^Ο΄/.test(siglum)&&/(?:ὡς\s+(?:οἱ\s+)?|ὁμοίως\s+(?:τοῖς\s+)?)$/u.test(text.slice(0,index));
  function comparisonBase(text){
    // A cited alternative LXX is evidence in the display, not the base reading
    // against which a witness is compared. Keep nested source annotations intact.
    let out='';
    for(let i=0;i<text.length;i++){
      if(text[i]!=='('){out+=text[i];continue;}
      let end=i+1,depth=1;
      for(;end<text.length&&depth;end++){if(text[end]==='(')depth++;else if(text[end]===')')depth--;}
      if(depth){out+=text.slice(i);break;}
      const bracket=text.slice(i,end);
      if(!/^\(\s*(?:alia\b|s\.|fort\.|potior\b)/u.test(bracket))out+=bracket;
      i=end-1;
    }
    return out;
  }
  function comparisonReference(text){
    // Field's comparison formula is editorial prose, whereas a following or
    // preceding Greek example is real evidence and must still be compared.
    let actual=text.trim(),present=false;
    if(/^ὁμοίως\s+τούτοις[.]?(?:\^\d+)?$/u.test(actual))return{present:true,actual:'',pure:true,previous:true};
    const others=/\s+Οἱ λοιποὶ (?:ὡς οἱ Ο΄\.|ὁμοίως τοῖς Ο΄\.)(?:\^\d+)?$/u;
    if(others.test(actual)){actual=actual.replace(others,'');present=true;}
    if(/^μόνος\s+(?:ὁμοίως|ὡσαύτως)[.]?(?:\^\d+)?$/u.test(actual))return {present:true,actual:'',pure:true};
    const prefix=/^(?:δὲ\s+)?(?:ὡς\s+(?:οἱ\s+)?Ο΄\.?|(?:ὁμοίως|ὡσαύτως)(?:\s+τοῖς\s+Ο΄\.?)?)(?:[·.,:]?\s*)/u;
    if(prefix.test(actual)){actual=actual.replace(prefix,'');present=true;}
    const suffix=/(?:[,·]\s*|\s+)(?:ὡς\s+(?:οἱ\s+)?Ο΄\.?|ὁμοίως[.]?)((?:\^\d+)?[.]?\s*)$/u;
    if(suffix.test(actual)){actual=actual.replace(suffix,'$1');present=true;}
    return {present,actual,pure:present&&!actual.replace(/\^\d+/g,'').replace(/[\s·.,:()]+/g,'')};
  }
  function synopsis(data,u,key,auditRows){
    // Source-specific typography is enabled only for inspected witnesses; it
    // must not reinterpret every 'Hebrew' annotation in the existing corpus.
    const extraSigla=[];
    if(new Set(['Psalms 113:1#0','Psalms 139:8#0','Proverbs 8:22#0','Proverbs 16:27#0']).has(key))extraSigla.push('Ἑβρ\\.');
    if(new Set(['Psalms 24:6#0','Psalms 25:1#0','Psalms 25:17#0']).has(key))extraSigla.push('E΄\\.');
    if(new Set(['Psalms 74:16#0','Psalms 74:23#0','Psalms 75:4#1','Psalms 76:4#1','Psalms 77:2#0','Psalms 78:31#1']).has(key))extraSigla.push('ς΄\\.');
    const parserSigla=extraSigla.length?new RegExp(SIGLA.source.slice(0,-1)+'|'+extraSigla.join('|')+')','g'):SIGLA;
    const bracketedAttribution=new Set(['Psalms 149:9#0','Song of Songs 1:6#2','Song of Songs 1:6#3','Song of Songs 7:1#1','Daniel 11:11#0','Daniel 11:11#1','Proverbs 1:20#0','Proverbs 2:3#0','Proverbs 3:11#0','Proverbs 15:5#0','Proverbs 28:19#0','Proverbs 29:22#0']).has(key);
    // italic Latin (_…_) stays one token: its spaces become no-break spaces
    // Field puts single words of other translators into the LXX text in brackets: Ο΄. κατέναντι (Ἀ. ἐξ ἀνατολῆς)
    // Ἀσσυρίων. – the LXX row is the text without the bracket, the bracket becomes a row of its own.
    const inner=[],sourceNotes=[];const lead=new RegExp('^(?:'+parserSigla.source+'[ \u00a0]*)+');
    // Parentheses qualifying an attribution/edition belong to its heading,
    // not to a new translator reading. Shield them while parsing the outer
    // parentheses, and restore their exact wording for display afterwards.
    const qualifierTexts=[],bracketedHeads=[];
    const standaloneAttribution=text=>{const head=text.slice(1,-1).trim();return bracketedAttribution&&/^\([^()]+\)$/.test(text)&&head&&!head.replace(new RegExp(parserSigla.source,'g'),'').trim()?head:null;};
    const isQualifier=text=>/^\(juxta\s+ed\.\s*\d+\w*\)$/i.test(text)||(
      /^\((?:s\.|fort\.|potius)\s+/u.test(text)&&
      !text.replace(/^\((?:s\.|fort\.|potius)\s+/u,'').replace(/\)$/,'').replace(new RegExp(parserSigla.source,'g'),'').replace(/[\s·.,]+/g,'')
    );
    const qualifierToken=/\uE000(\d+)\uE001/g;
    const restoreQualifiers=text=>{for(const h of bracketedHeads)text=text.split(h.mask).join(h.original);return text.replace(qualifierToken,(_,i)=>qualifierTexts[+i]);};
    const attributionKey=head=>head.replace(', καὶ ἑτέρα ἔκδοσις τῶν Ο΄.','').replace(/\([^()]*\)/g,text=>standaloneAttribution(text)|| (isQualifier(text)?'':text)).replace(/\s+/g,' ').trim();
    const headingEnd=(text,end)=>{const tail=/^(?:\s*\uE000\d+\uE001)+/u.exec(text.slice(end));return tail?end+tail[0].length:end;};
    let source=u.t.replace(/\([^()]*\)/g,text=>{const head=standaloneAttribution(text);if(!head)return text;const token='\uE000'+(qualifierTexts.push(text)-1)+'\uE001',mask=head+token;bracketedHeads.push({mask,original:text});return mask;}).replace(/\([^()]*\)/g,text=>isQualifier(text)?'\uE000'+(qualifierTexts.push(text)-1)+'\uE001':text);
    if(key==='Psalms 150:6#0')source=source.replace(/\s+(ADDENDA\.\s+MONITUM[\s\S]*)$/,(all,note)=>{sourceNotes.push(note);return '';});
    // The attribution is to Symmachus and a second LXX edition, not a variant made of editorial prose.
    if(key==='Lamentations 1:17#0')source=source.replace('Σ., καὶ ἑτέρα ἔκδοσις τῶν Ο΄.', 'Σ.\uE000'+(qualifierTexts.push(', καὶ ἑτέρα ἔκδοσις τῶν Ο΄.')-1)+'\uE001');
    // Field occasionally puts a one-word reading before its attribution
    // ('Dimon, likewise the Three and the Hebrew'). Preserve both spellings
    // and the complete attribution while restoring the usual synopsis order.
    const postposed=/^(Ο΄\.\s*)([^.]+\.)\s+(\S+)\s+ὁμοίως\s+((?:οἱ|Οἱ) Γ΄\.?)(,\s*καὶ\s+τὸ\s+Ἑβραϊκόν\.?)(\^\d+)?\s*$/u.exec(source);
    if(postposed){inner.push({head:postposed[4]+postposed[5],headKey:postposed[4],text:postposed[3]+' ὁμοίως'+(postposed[6]||'')});source=postposed[1]+postposed[2];}
    // A translator named inside an initial asterisk supplies only the words up to
    // the metobelus. The following LXX text is not that translator's reading
    // (e.g. Ex 1:11: the Three supply 'and', not the whole Ramesses/On clause).
    const initialAddition=new RegExp('^(Ο΄\\.\\s*※\\s*)((?:(?:'+parserSigla.source.slice(1,-1)+')\\s*)+)([^↙()]+)(↙(?:\\^\\d+)?)([\\s\\S]+)$');
    const addition=initialAddition.exec(source);
    if(addition&&!new RegExp(parserSigla.source).test(addition[3])&&/[\u0370-\u03ff\u1f00-\u1fff]/.test(addition[5])){
      inner.push({head:addition[2].trim(),text:addition[3].trim()+' '+addition[4]});
      source=addition[1]+addition[3]+addition[4]+addition[5];
    }
    const t=source.replace(/_[^_]+_/g,x=>x.replace(/ /g,'\u00a0')).replace(/\(([^()]*)\)/g,(m,c,at,all)=>{const s=c.trimStart();const prev=(all.slice(0,at).match(/([\p{L}\p{M}’]+)[^\p{L}\p{M}]*$/u)||[])[1]||'';if(!lead.test(s))return m;const re2=new RegExp(parserSigla.source,'g'),cut=[];let x;while((x=re2.exec(s)))if(!referenceSiglum(s,x.index,x[0]))cut.push([x.index,headingEnd(s,x.index+x[0].length)]);const rs=[];for(const [a,b] of cut){const l=rs.at(-1);if(l&&/^(?:καὶ(?:\s+ὁ)?|,|Οἱ)?$/u.test(s.slice(l.e,a).trim())){l.head+=s.slice(l.e,b);l.e=b;continue;}if(l)l.text=s.slice(l.e,a);rs.push({head:s.slice(a,b),e:b});}rs.at(-1).text=s.slice(rs.at(-1).e);if(rs.some(r=>!r.text.trim()))return m;inner.push(...rs.map(r=>({head:r.head,text:r.text,for:prev})));return '';}).replace(/ {2,}/g,' ').replace(/ ([.,·;])/g,'$1');
    const re=new RegExp(parserSigla.source,'g'),marks=[];let m;
    while((m=re.exec(t))){
      // “Σ. ὡς οἱ Ο΄.” means “Symmachus as the LXX”, not a new
      // Septuagint row. Keep its footnote with the referring witness.
      if(referenceSiglum(t,m.index,m[0]))continue;
      marks.push([m.index,headingEnd(t,m.index+m[0].length)]);
    }
    if(!marks.length||t.slice(0,marks[0][0]).trim())return null;
    const rows=[];
    for(let i=0;i<marks.length;i++){
      const last=rows.at(-1),between=last?t.slice(last.hend,marks[i][0]):'';
      if(last&&(!between.trim()||/^(?:καὶ(?:\s+ὁ)?|,|Οἱ)$/u.test(between.trim()))){last.hend=marks[i][1];continue;}       // Ο΄. Θ. – one row for several translators
      if(last)last.text=between;
      rows.push({hstart:marks[i][0],hend:marks[i][1]});
    }
    rows.at(-1).text=t.slice(rows.at(-1).hend);
    rows.splice(1,0,...inner);
    rows.forEach(r=>{if(r.head==null)r.head=t.slice(r.hstart,r.hend);r.head=restoreQualifiers(r.head);r.headKey=r.headKey||attributionKey(r.head);r.text=restoreQualifiers(r.text);r.tok=r.text.trim().split(/[ \t\n]+/).filter(Boolean);});
    if(rows.length<2||!/Ο΄/.test(rows[0].head)||rows[0].tok.length<1||rows.some(r=>!r.tok.length))return null;
    // These units contain separately introduced LXX lemmata, not competing readings.
    // A joint LXX/translator attribution and an Aliter heading never reset the base.
    const localBaseUnits=new Set(['Daniel 4:29#0','II Chronicles 35:20#1','Nehemiah 7:7#1','Proverbs 9:18#1','Proverbs 17:16#0','Proverbs 22:14#1','Proverbs 26:19#0','Proverbs 28:17#0','Psalms 57:3#0','Song of Songs 6:6#0','Esther 9:26#0','Job 31:35#0']);
    let localBase=rows[0];
    rows.forEach((r,i)=>{r.isBase=!i||localBaseUnits.has(key)&&r.headKey==='Ο΄.'&&!r.for;if(r.isBase)localBase=r;r.comparisonRow=localBase;});
    const row=(r,i)=>{
      let body;
      if(r.isBase)body=markup(data,u,r.tok.join(' '));
      else{
        // longest common subsequence with the LXX row
        const reference=comparisonReference(r.text),tokens=reference.present?reference.actual.replace(/[—–]{2,}/gu,' ').trim().split(/[ \t\n]+/).filter(Boolean):r.tok;
        const a=reference.present?comparisonBase(r.comparisonRow.text).trim().split(/[ \t\n]+/).filter(Boolean).map(norm):r.comparisonRow.tok.map(norm),b=tokens.map(norm),L=Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
        for(let x=a.length-1;x>=0;x--)for(let y=b.length-1;y>=0;y--)L[x][y]=a[x]&&a[x]===b[y]?L[x+1][y+1]+1:Math.max(L[x+1][y],L[x][y+1]);
        const same=new Array(b.length).fill(false);for(let x=0,y=0;x<a.length&&y<b.length;){if(a[x]&&a[x]===b[y]){same[y]=true;x++;y++;}else if(L[x+1][y]>=L[x][y+1])x++;else y++;}
        const parts=[];tokens.forEach((w,k)=>{const p=parts.at(-1);if(p&&p.same===same[k])p.w.push(w);else parts.push({same:same[k],w:[w]});});
        const words=tokens.filter(w=>norm(w)),differ=tokens.filter((w,k)=>norm(w)&&!same[k]);
        const translit=differ.length&&differ.filter(w=>(lookup(w.replace(/[^\p{L}\p{M}’]/gu,''))||[])[0]?.[1]==='Y').length*2>=differ.length;
        r.previousReference=reference.previous||key==='Psalms 113:1#0'&&r.headKey==='Ὁ Σύρος'&&r.for&&/^ὁμοίως(?:\^\d+)?[.]?$/u.test(r.text.trim());
        r.lxxReference=!r.previousReference&&(reference.pure||reference.present&&!differ.length);
        r.type=r.lxxReference||r.previousReference?'gleich':!words.length?'':!differ.length?'gleich':translit?'translit':'wiedergabe';
        body=reference.present?markup(data,u,r.text.trim()):parts.map(p=>p.same?'<span class="tc-hx-same"><span class="tc-hx-same-t">'+markup(data,u,p.w.join(' '))+'</span></span>':markup(data,u,p.w.join(' '))).join(' ');
      }
      if(r.isBase)r.type=/※/.test(r.text)?'asterisk':/÷/.test(r.text)?'obelus':'';
      // reviewed: other Vorlage / other reading of the same consonants (hexapla-vorlage.js)
      const vlKey=i&&key?key+' '+r.headKey:null;
      const vl=vlKey?window.HEXAPLA_VORLAGE?.[vlKey]:null;
      const forV=r.for?'<span class="tc-hx-for" title="'+esc('Field setzt diese Lesart in Klammern hinter dieses Wort der LXX')+'">'+esc('für')+' <span lang="grc">'+raw(r.for)+'</span>:</span> ':'';
      const note=explanation(data,u,vlKey,r,vl);
      auditRows?.push({key:key+' '+r.headKey,siglum:r.headKey,attribution:r.head,type:vl?.t||r.type||'',reading:r.text.trim(),forWord:r.for||'',hasExplanation:!!note,lxxReference:!!r.lxxReference});
      if(vl)return '<span class="tc-hx-row-sig">'+markup(data,u,r.head)+'</span><span class="tc-hx-row" lang="grc">'+forV+body+' '+typeTag(vl.t,vl)+(window.TextCritTraditions?.badge(window.TextCritTraditions.tags('Hex','',vlKey,vl),raw)||'')+note+'</span>';
      const forW=r.for?'<span class="tc-hx-for" title="'+esc('Field setzt diese Lesart in Klammern hinter dieses Wort der LXX')+'">'+esc('für')+' <span lang="grc">'+raw(r.for)+'</span>:</span> ':'';
      return '<span class="tc-hx-row-sig">'+markup(data,u,r.head)+'</span><span class="tc-hx-row" lang="grc">'+forW+body+(r.type?' '+typeTag(r.previousReference?'verweis':r.type):'')+note+'</span>';
    };
    return '<div class="tc-hx-syn">'+rows.map(row).join('')+'</div><button type="button" class="tc-hx-syn-toggle" aria-pressed="false">'+esc('Volltext')+'</button>'+sourceNotes.map(note=>'<details class="tc-hx-source-note"><summary>'+esc('Fields Nachträge')+'</summary><div>'+markup(data,u,note)+'</div></details>').join('');
  }
  // Type of a translator row against the LXX row (machine; see agree() for the MT check)
  const HXTYPES={verweis:['wie zuvor','Verweis auf eine zuvor genannte Wiedergabe; der genaue Bezug steht im Originalhinweis'],gleich:['wie LXX','Gleicher Wortlaut wie die LXX-Zeile'],
    wiedergabe:['andere Wiedergabe','Abweichender griechischer Wortlaut gegenüber der LXX-Zeile; automatisch erkannt. Ob Wortwahl, andere Deutung oder andere Vorlage vorliegt, ist damit nicht entschieden.'],
    mt:['mögliche MT-Angleichung','Automatischer Hinweis: andere griechische Wiedergabe an einer eingeordneten LXX-Abweichung. Eine Übereinstimmung mit dem MT ist damit nicht nachgewiesen.'],
    translit:['Transkription','Hebräisches Wort in griechischen Buchstaben'],
    vorlage:['andere Vorlage','Setzt einen anderen hebräischen Konsonantentext voraus (meist ein verwechselbarer Buchstabe); von Claude geprüft'],
    deutung:['andere Deutung','Gleiche oder fast gleiche Konsonanten, anders gelesen oder von einer anderen Wurzel her verstanden; von Claude geprüft'],
    asterisk:['Zusatz nach dem Hebräischen','※ Asterisk: von Origenes in die LXX-Spalte nach dem Hebräischen eingefügt'],
    obelus:['LXX-Plus','÷ Obelus: in der LXX ohne Gegenstück im Hebräischen']};
  const typeTag=(t,vl)=>'<abbr class="ab tc-tov-tag tc-hx-type" data-hx-type="'+t+'" title="'+esc(HXTYPES[t][1])+(vl?.n?' · '+raw(window.I18N?.lang==='en'&&vl.en?vl.en:vl.n):'')+'">'+esc(HXTYPES[t][0])+'</abbr>'+(vl?.he?' <span class="tc-tov-reading">≈ <bdi lang="he" dir="rtl">'+raw(vl.he)+'</bdi></span>':'');
  // Where an assessed LXX reading (not mere translation technique) covers the same MT words, a translator
  // a differing rendering can be a possible MT alignment; wording alone is not proof.
  function agree(records){
    const lxx=records.filter(r=>r.anchor&&/tc-lxx-reading/.test(r.html)&&!/data-lxx-type="(technik|grfehler)"/.test(r.html));
    for(const r of records){
      if(!r.anchor||!/tc-hx-entry/.test(r.html)||!r.html.includes('data-hx-type="wiedergabe"'))continue;
      const a=r.anchor,hit=lxx.some(o=>o.anchor.ref===a.ref&&(a.kind==='gap'?o.anchor.kind==='gap'&&o.anchor.start===a.start:o.anchor.kind==='word'&&o.anchor.start<=a.end&&o.anchor.end>=a.start));
      if(hit)r.html=r.html.split(typeTag('wiedergabe')).join(typeTag('mt'));
    }
  }
  // Field's footnote as an inline note: English translation first, the Latin original folded inside.
  function inlineNote(note,n){
    const la=italic(raw(note.la)),en=note.en&&note.en!==note.la?italic(raw(note.en)):'';
    return '<span class="tc-hx-note" data-hx-fn="'+raw(n)+'" role="note" hidden><span class="tc-hx-note-n">'+raw(n)+'</span> '+(en?'<span lang="en">'+en+'</span> <button type="button" class="tc-hx-la-toggle" aria-expanded="false">'+esc('Latein')+'</button><span class="tc-hx-la" lang="la" hidden> '+la+'</span>':'<span lang="la">'+la+'</span>')+'</span>';
  }
  function entries(data,queries){
    if(!data)return [];
    const out=new Map();
    for(const {ref,row} of queries){
      const m=/^(.*) (\d+:\d+)$/.exec(ref);if(!m||m[1]!==data.book)continue;
      (data.verses[m[2]]||[]).forEach((u,i)=>{
        const id=ref+'|'+i,prev=out.get(id);if(prev){if(!prev.rows.includes(row))prev.rows.push(row);return;}
        const anchor=u.s==null?null:u.gap?{kind:'gap',start:u.e,end:u.e,ref}:{kind:'word',start:u.s,end:u.e,ref};
        const cite='Field, Hexapla '+(data.vol===2?'II':'I')+', S. '+u.pg+(u.field&&u.field!==m[2]?' · Field '+u.field:'');
        const traditions=window.TextCritTraditions;
        const traditionTags=traditions?.sourceTags(data.book,m[2],i,u)||[];
        const comparison=traditionTags.length?'<div class="tc-hx-traditions">'+traditions.badge(traditionTags,raw)+' '+traditionTags.map(tag=>raw(window.I18N?.lang==='en'?tag.en:tag.de)).join(' ')+'</div>':'';
        const comparisonRows=[];
        const html='<article class="tc-entry tc-hx-entry" data-witness="Hex"><div class="tc-note-text"><span class="tc-witness-label" title="'+esc('Hexapla (Field 1875)')+'">Field</span> '+((syn=>syn?'<div class="tc-hx-read">'+syn+'</div>':'<span class="tc-hx-read" lang="grc">'+reading(data,u)+'</span>')(synopsis(data,u,data.book+' '+m[2]+'#'+i,comparisonRows)))+(u.l?'<div class="tc-hx-foot"><button type="button" class="tc-hx-la-toggle tc-hx-lat-toggle" aria-expanded="false" title="'+esc('Fields lateinische Übersetzung des hebräischen Stichworts')+'">'+esc('Latein')+'</button><span class="tc-hx-lat" hidden title="'+raw(u.h)+'">'+italic(raw(u.l))+'</span></div>':'')+'</div>'+'<small class="tal-cite" tabindex="0" title="'+raw('Blatt '+u.leaf+(u.cont?' · Fortsetzung':''))+'">'+raw(cite)+'</small>'+comparison+'</article>';
        const sig=[...new Set((u.t.match(SIGLA)||[]).map(x=>HEXSIG.find(([re])=>re.test(x))?.[1]).filter(Boolean))];
        out.set(id,{hexaplaRows:comparisonRows,hexaplaSource:{unit:i,fieldRef:u.field,lemma:u.h,volume:data.vol,page:u.pg,leaf:u.leaf},anchor,displayRef:ref,rows:[row],html,lz:sig.map(w=>({f:'Hex',w,op:'cite',title:'Hexapla (Field)'}))});
      });
    }
    return [...out.values()];
  }
  const credit=()=>'<p class="tc-credit">'+esc('Hexapla: Frederick Field, Origenis Hexaplorum quae supersunt I–II (Oxford 1875), gemeinfrei; Scan archive.org. Transkription und englische Übersetzung der lateinischen Fußnoten: Claude, 2026. Fußnoten öffnen sich an der Fußnotenzahl (englisch, lateinisches Original eingeklappt). Siglen beim Überfahren erklärt. Griechische Wörter: Bestimmung und Wortkarte beim Anklicken nach der LXX-Morphologie (Seth Kushniryk, CC BY 4.0) bzw. Perseus Morpheus (CC BY-SA 3.0 US); Bedeutungen außerhalb der LXX aus LSJ (Perseus Digital Library, CC BY-SA).')+' '+esc('Kurzerläuterungen: Codex/Claude, 2026, redaktionell; nicht Teil von Fields Originaltext. Erläuterungen erklären Bedeutung, Grammatik oder Quellenhinweise; reine Wortwiederholungen werden nicht ergänzt.')+'</p>';
  function preview(anchor){
    let an=[];try{an=JSON.parse(anchor.dataset.hxAn||'[]');}catch{}
    const G=window.GMorph,t=window.I18N?.t?(x=>window.I18N.t(x)):(x=>x),form=anchor.textContent;
    const rows=an.map(([lemma,key,gloss])=>{const d=G?.describe?G.describe(key,t):{pos:key,info:''};const info=raw(JSON.stringify({lemma,form,key}));
      return '<div class="wseg"><span class="wlem wgl" lang="grc">'+raw(lemma)+'</span> <span class="muted">'+raw(gloss||'')+'</span><br><b>'+raw(d.pos)+'</b>'+(d.info?' · '+raw(d.info):'')+'<div class="tc-hx-cards"><button type="button" class="wforms" data-gr-card="card" data-gr-lemma="'+raw(lemma)+'" data-gr-info="'+info+'">'+esc('Wortkarte')+'</button><button type="button" class="wforms" data-gr-card="forms" data-gr-lemma="'+raw(lemma)+'" data-gr-info="'+info+'">'+esc('Alle Formen (Tabelle)')+'</button><button type="button" class="wforms" data-gr-card="all" data-gr-lemma="'+raw(lemma)+'">'+esc('Alle Stellen')+'</button></div></div>';}).join('');
    return '<b lang="grc">'+raw(form)+'</b>'+rows+'<small>'+esc('Bestimmung maschinell; ein Wort kann mehrdeutig sein.')+'</small>';
  }
  return {available,load,entries,credit,preview,agree};
}
return {create,BOOKS};
})();
