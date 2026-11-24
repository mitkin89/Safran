'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../notes-rich-text');
const text=s=>({nodeType:3,textContent:s}),el=(tag,children=[],attrs={})=>({nodeType:1,tagName:tag.toUpperCase(),childNodes:children,getAttribute:k=>attrs[k]||null});
test('formatted text serializes to portable Markdown with Hebrew, paragraphs and links',()=>{
 const root=el('div',[el('p',[text('Text '),el('b',[text('שלום')]),text(' und '),el('i',[text('kursiv')])]),el('ul',[el('li',[text('Punkt')])]),el('blockquote',[el('p',[text('Zitat')])]),el('p',[el('a',[text('Stelle')],{'data-nw-reference':'Genesis 1:1'})])]);
 assert.equal(R.toMarkdown(root),'Text **שלום** und *kursiv*\n- Punkt\n> Zitat\n[Stelle](Genesis 1:1)');
});
test('blank paragraphs preserve line breaks; unsafe link destinations cannot enter the stored note',()=>{
 assert.equal(R.toMarkdown(el('div',[text('Erste Zeile'),el('div',[text('Zweite Zeile')])])), 'Erste Zeile\nZweite Zeile');
 assert.equal(R.toMarkdown(el('div',[el('p',[text('a')]),el('p',[el('br')]),el('p',[text('b')])])),'a\n\nb');assert.equal(R.toMarkdown(el('div',[el('p',[el('br')])])), '');
 assert.equal(R.toMarkdown(el('div',[el('a',[text('Sicher')],{href:'javascript:alert(1)'})])),'Sicher');assert(!R.html('<img src=x>').includes('<img'));assert(R.html('**שלום**').includes('<strong>שלום</strong>'));
});
