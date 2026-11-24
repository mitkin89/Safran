// Editorial lemma sets; scope and lexical sources: docs/semantic-search.md.
(function(global){
'use strict';
const fields = [
  {
    "id": "fear",
    "title": "Angst und Furcht",
    "en": "Fear and dread",
    "aliases": [
      "Angst",
      "Furcht",
      "Schrecken",
      "Ehrfurcht",
      "fear"
    ],
    "he": [
      "3372",
      "3374",
      "6342",
      "6343"
    ],
    "gr": [
      "φοβέω",
      "φόβος",
      "τρέμω"
    ]
  },
  {
    "id": "joy",
    "title": "Freude und Jubel",
    "en": "Joy and rejoicing",
    "aliases": [
      "Freude",
      "Jubel",
      "freuen",
      "joy"
    ],
    "he": [
      "8055",
      "8057",
      "1523",
      "1524 a",
      "7442 b",
      "7440"
    ],
    "gr": [
      "χαίρω",
      "χαρά",
      "εὐφραίνω",
      "ἀγαλλιάω"
    ]
  },
  {
    "id": "mercy",
    "title": "Mitgefühl und Gnade",
    "en": "Compassion and grace",
    "aliases": [
      "Mitgefühl",
      "Barmherzigkeit",
      "Erbarmen",
      "Gnade",
      "Güte",
      "mercy"
    ],
    "he": [
      "7355",
      "7356 b",
      "7349",
      "2603 a",
      "2580",
      "2617 a"
    ],
    "gr": [
      "ἐλεέω",
      "ἔλεος",
      "οἰκτείρω",
      "οἰκτιρμός"
    ]
  },
  {
    "id": "justice",
    "title": "Recht und Gerechtigkeit",
    "en": "Justice and judgment",
    "aliases": [
      "Recht",
      "Gerechtigkeit",
      "Gericht",
      "richten",
      "justice"
    ],
    "he": [
      "8199",
      "4941",
      "6663",
      "6664",
      "6666"
    ],
    "gr": [
      "κρίνω",
      "κρίσις",
      "κρίμα",
      "δικαιοσύνη",
      "δίκαιος"
    ]
  },
  {
    "id": "love",
    "title": "Liebe",
    "en": "Love",
    "aliases": [
      "Liebe",
      "lieben",
      "Zuneigung",
      "love"
    ],
    "he": [
      "157",
      "160"
    ],
    "gr": [
      "ἀγαπάω",
      "ἀγάπη",
      "φιλέω"
    ]
  },
  {
    "id": "kinship",
    "title": "Verwandtschaft",
    "en": "Kinship",
    "aliases": [
      "Familie",
      "Verwandtschaft",
      "Eltern",
      "Geschwister",
      "kinship"
    ],
    "he": [
      "1",
      "517",
      "1121 a",
      "1323",
      "251",
      "269"
    ],
    "gr": [
      "πατήρ",
      "μήτηρ",
      "υἱός",
      "θυγάτηρ",
      "ἀδελφός",
      "ἀδελφή"
    ]
  },
  {
    "id": "worship",
    "title": "Opfer und Verehrung",
    "en": "Sacrifice and worship",
    "aliases": [
      "Opfer",
      "Kult",
      "Verehrung",
      "Anbetung",
      "worship"
    ],
    "he": [
      "7812",
      "2076",
      "2077",
      "5930 a",
      "7133 a",
      "7133 b"
    ],
    "gr": [
      "προσκυνέω",
      "θύω",
      "θυσία",
      "ὁλοκαύτωμα"
    ]
  },
  {
    "id": "motion",
    "title": "Gehen, Kommen und Fliehen",
    "en": "Going, coming and fleeing",
    "aliases": [
      "Bewegung",
      "gehen",
      "kommen",
      "fliehen",
      "motion"
    ],
    "he": [
      "1980",
      "935",
      "3318",
      "5127"
    ],
    "gr": [
      "πορεύομαι",
      "ἔρχομαι",
      "ἐξέρχομαι",
      "φεύγω"
    ]
  },
  {
    "id": "life",
    "title": "Leben",
    "en": "Life",
    "aliases": [
      "Leben",
      "lebendig",
      "life"
    ],
    "he": [
      "2421",
      "2416 a",
      "2416 e"
    ],
    "gr": [
      "ζάω",
      "ζωή"
    ]
  },
  {
    "id": "death",
    "title": "Tod und Sterben",
    "en": "Death and dying",
    "aliases": [
      "Tod",
      "sterben",
      "death"
    ],
    "he": [
      "4191",
      "4194"
    ],
    "gr": [
      "ἀποθνήσκω",
      "θάνατος"
    ]
  }
];
const heNames = {
  "1": [
    "אָב",
    "father",
    "Vater"
  ],
  "157": [
    "אָהֵב",
    "love",
    "lieben"
  ],
  "160": [
    "אַהֲבָה",
    "love",
    "Liebe"
  ],
  "251": [
    "אָח",
    "brother",
    "Bruder"
  ],
  "269": [
    "אָחוֹת",
    "sister",
    "Schwester"
  ],
  "517": [
    "אֵם",
    "mother",
    "Mutter"
  ],
  "935": [
    "בּוֹא",
    "come in",
    "kommen"
  ],
  "1323": [
    "בַּת",
    "daughter",
    "Tochter"
  ],
  "1523": [
    "גִּיל",
    "rejoice",
    "jubeln"
  ],
  "1980": [
    "הָלַךְ",
    "go",
    "gehen"
  ],
  "2076": [
    "זָבַח",
    "slaughter for sacrifice",
    "schlachten (zum Opfer)"
  ],
  "2077": [
    "זֶ֫בַח",
    "sacrifice",
    "Opfer"
  ],
  "2421": [
    "חָיָה",
    "live",
    "leben"
  ],
  "2580": [
    "חֵן",
    "favour",
    "Gunst"
  ],
  "3318": [
    "יָצָא",
    "go out",
    "hinausgehen"
  ],
  "3372": [
    "יָרֵא",
    "fear",
    "fürchten"
  ],
  "3374": [
    "יִרְאָה",
    "fear",
    "Furcht"
  ],
  "4191": [
    "מוּת",
    "die",
    "sterben"
  ],
  "4194": [
    "מָ֫וֶת",
    "death",
    "Tod"
  ],
  "4941": [
    "מִשְׁפָּט",
    "judgment",
    "Recht"
  ],
  "5127": [
    "נוּס",
    "flee",
    "fliehen"
  ],
  "6342": [
    "פָּחַד",
    "dread",
    "sich fürchten"
  ],
  "6343": [
    "פַּ֫חַד",
    "dread",
    "Schrecken"
  ],
  "6663": [
    "צָדֵק",
    "be just",
    "gerecht sein"
  ],
  "6664": [
    "צֶ֫דֶק",
    "rightness",
    "Gerechtigkeit"
  ],
  "6666": [
    "צְדָקָה",
    "righteousness",
    "Gerechtigkeit"
  ],
  "7349": [
    "רַחוּם",
    "compassionate",
    "barmherzig"
  ],
  "7355": [
    "רָחַם",
    "love",
    "lieben"
  ],
  "7440": [
    "רִנָּה",
    "ringing cry",
    "Jubelruf"
  ],
  "7812": [
    "שָׁחָה",
    "bow down",
    "sich niederwerfen"
  ],
  "8055": [
    "שָׂמַח",
    "rejoice",
    "sich freuen"
  ],
  "8057": [
    "שִׂמְחָה",
    "joy",
    "Freude"
  ],
  "8199": [
    "שָׁפַט",
    "judge",
    "richten"
  ],
  "1524 a": [
    "גִּיל",
    "rejoicing",
    "Jubel"
  ],
  "7442 b": [
    "רָנַן",
    "give a ringing cry",
    "jubeln"
  ],
  "7356 b": [
    "רַחֲמִים",
    "compassion",
    "Erbarmen"
  ],
  "2603 a": [
    "חָנַן",
    "shew favour",
    "gnädig sein"
  ],
  "2617 a": [
    "חֶ֫סֶד",
    "goodness",
    "Güte"
  ],
  "1121 a": [
    "בֵּן",
    "son",
    "Sohn"
  ],
  "5930 a": [
    "עֹלָה",
    "whole burnt-offering",
    "Brandopfer"
  ],
  "7133 a": [
    "קׇרְבָּן",
    "offering",
    "Opfergabe"
  ],
  "7133 b": [
    "קֻרְבָּן",
    "offering",
    "Opfergabe"
  ],
  "2416 a": [
    "חַי",
    "alive",
    "lebendig"
  ],
  "2416 e": [
    "חַיִּים",
    "life",
    "Leben"
  ]
};
const fold = value => String(value || '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ß/g,'ss').replace(/ς/g,'σ').trim();
function cleanCustom(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.he) || !Array.isArray(value.gr)) return null;
  const title = String(value.title || '').trim();
  if (!title || title.length > 80 || value.he.length + value.gr.length > 100) return null;
  const he = [...new Set(value.he.map(x=>String(x).trim().replace(/\s+/g,' ')))];
  const gr = [...new Set(value.gr.map(x=>String(x).trim().normalize('NFC')))];
  if (!he.length && !gr.length || he.some(x=>!/^\d{1,4}(?: [a-z])?$/.test(x)) || gr.some(x=>x.length>80 || !/^[\p{Script=Greek}\p{M}]+$/u.test(x))) return null;
  return {id:'custom',title,en:title,aliases:[],he,gr,custom:true};
}
function resolve(request) { return request?.custom ? cleanCustom(request.custom) : fields.find(f=>f.id===request?.fieldId) || null; }
function find(query, extra=[]) { const q=fold(query); return [...fields,...extra].filter(f=>!q || [f.title,f.en,...(f.aliases||[]),...f.gr,...f.he.map(id=>heNames[id]?.join(' ')||id)].some(s=>fold(s).includes(q))); }
const api={fields,heNames,fold,cleanCustom,resolve,find};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.SemanticFields=api;
})(typeof window!=='undefined'?window:globalThis);
