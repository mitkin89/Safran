// Krauss, Talmudische Archäologie – handgepflegte Werkliste für die Kurzzitate.
// Aus diesem Verzeichnis erzeugt bibliographie.js die Datei bibliographie.json (Kurzform -> voller Titel).
//
// Eintrag: w(namen, kurztitel, titel, optionen)
//   namen     – Name, wie er im Text gesperrt (in Großbuchstaben) steht; mehrere Formen als Liste (MARQ. / MARQUARDT)
//   kurztitel – Kurztitel, die im Text nach dem Namen stehen („HELLWALD, Haus und Hof S. 46“); Punkte und Leerraum
//               werden beim Markieren tolerant behandelt („Pl.²“, „Pl²“), ein Komma zwischen Name und Kurztitel ist optional
//   titel     – voller Titel, wie Krauss ihn an einer Stelle des Werkes druckt (Vorname, Name, Titel, Ort Jahr)
//   optionen  – std: dieses Werk gilt für den bloßen Namen („HELLWALD S. 147“), wenn der Zusammenhang nichts anderes ergibt
//               ini: Vornamen-Initiale, die im Text vor dem Namen steht und das Werk einer Person zuordnet (L. LÖW / I. LÖW)
//               e:   Titel steht im Werk nicht vollständig; nach der Standardbibliographie ergänzt
//               nb:  der bloße Name wird für dieses Werk nie markiert (Name meint meist anderes)
//               abs: [[von, bis], …] – gedruckte Paragraphen (§), in denen der bloße Name dieses Werk meint (nach Lektüre der Stellen)
// Bei mehreren Werken ohne std nennt die Blase für den bloßen Namen alle Kandidaten („… ; oder: …“),
// außer der Zusammenhang (zuletzt mit Titel zitiertes Werk desselben Autors) entscheidet; s. markieren.js.
'use strict';
const W = [];
const w = (namen, kurz, titel, o = {}) => W.push({ namen: [].concat(namen), kurz, titel, ...o });

// ---------- Kapitel I (Wohnung und Hausgerät), Literatur ----------
w('WARNEKROS', ['Entwurf der hebr. Altertümer', 'Entwurf'], 'H. E. WARNEKROS, Entwurf der hebr. Altertümer, Weimar 1794');
w('IKENIUS', ['Antiquitates Hebraicae', 'Antiqu. Hebr.'], 'C. IKENIUS, Antiquitates Hebraicae, Bremae 1764');
w('JAHN', ['Bibl. Arch.', 'Arch.'], 'J. JAHN, Biblische Archäologie (Bibl. Arch.), Wien 1796—1805', { std: 1 });
w('SAALSCHÜTZ', ['Arch. der Hebr.', 'Arch.'], 'J. L. SAALSCHÜTZ, Archäologie der Hebräer, Königsberg 1855, 1856', { std: 1 });
w('SAALSCHÜTZ', ['Das mos. Recht', 'Das Mos. Recht', 'Mos. Recht'], 'J. L. SAALSCHÜTZ, Das mosaische Recht, Berlin 1848');
w('SAALSCHÜTZ', ['Musik', 'Geschichte und Würdigung der Musik'], 'J. L. SAALSCHÜTZ, Geschichte und Würdigung der Musik bei den Hebräern, Berlin 1829');
w(['BENZINGER', 'BENZ.'], ['Hebr. Arch.', 'Arch.'], 'I. BENZINGER, Hebräische Archäologie, Freib. i. Br. und Leipz. 1894, 2. Aufl. Tübingen 1907', { std: 1 });
w('BENZINGER', ['Wein und Weinbau'], 'I. BENZINGER, Wein und Weinbau, in Prot. RE³');
w('NOWACK', ['Lehrb. d. hebr. Arch.', 'Arch.'], 'W. NOWACK, Lehrbuch der hebräischen Archäologie, Freib. i. Br. und Leipz. 1894', { std: 1 });
w('WINER', ['Bibl. Rwb.', 'BRwb.', 'BRWb.', 'Rwb.'], 'G. B. WINER, Biblisches Realwörterbuch, 3. Aufl., Leipzig 1847—1848', { std: 1, e: 1 });
w('HAMBURGER', ['RE des Judentums', 'RE', 'R E'], 'J. HAMBURGER, Real-Encyclopädie für Bibel und Talmud (bei Krauss „RE des Judentums“), Abt. I: Biblische Artikel, Abt. II: Talmud u. Midrasch, Strelitz 1870—1883; Supplemente 1886—1901', { std: 1, e: 1 });
w('HORA', ['Die hebr. Bauweise', 'Hebr. Bauweise', 'Hebr. Bauw.', 'Hebr. Bauwesen'], 'HORA, Die hebr. Bauweise im A. T., Karlsbad 1903', { std: 1 });
w('ROSENZWEIG', ['Das Wohnhaus', 'Wohnhaus'], 'A. ROSENZWEIG, Das Wohnhaus in der Mišnah, Berlin 1907', { std: 1 });
w('ROSENZWEIG', ['Kleidung und Schmuck', 'Kleidung'], 'A. ROSENZWEIG, Kleidung und Schmuck im bibl. und talm. Schrifttum, Berlin 1905');
w('ROSENZWEIG', ['Geselligkeit und Geselligkeitsfreuden', 'Geselligkeit'], 'A. ROSENZWEIG, Geselligkeit und Geselligkeitsfreuden in Bibel und Talmud, Berlin 1895');
w('ROSENZWEIG', ['Das Auge'], 'A. ROSENZWEIG, Das Auge in Bibel und Talmud, Berlin 1892');
w('KRENGEL', ['Das Hausgerät', 'Hausgerät'], 'J. KRENGEL, Das Hausgerät in der Mišnah, Frankf. a. M. 1899', { std: 1 });
w('HELLWALD', ['Haus und Hof', '„Das Beduinenzelt“'], 'FR. HELLWALD, Haus und Hof in ihrer Entwickelung mit Bezug auf die Wohnsitten der Völker, Leipz. 1888', { std: 1 });
w('ZUMPT', ['Über die bauliche Einrichtung'], 'ZUMPT, Über die bauliche Einrichtung des römischen Wohnhauses, Berlin 1844', { std: 1 });
w('DURM', ['Baukunst der Etrusker und Römer', 'Baukunst der Römer', 'Baukunst'], 'J. DURM, Die Baukunst der Etrusker und Römer, 2. Aufl., Stuttgart 1905 (Handbuch der Architektur, II. Teil, 2. Bd.)', { std: 1 });
w('DURM', ['Baukunst der Gr.', 'Bauwesen d. Gr.', 'Gr.'], 'J. DURM, Die Baukunst der Griechen, 2. Aufl., Darmstadt 1892 (Handbuch der Architektur, II. Teil, 1. Bd.)', { e: 1 });
w('MERCKEL', ['Ingenieurtechnik', 'Ingenieurtechn.'], 'C. MERCKEL, Die Ingenieurtechnik im Altertum, Berlin 1899', { std: 1 });
w(['BLÜMNER', 'BLUMNER'], ['Technologie', 'Technol.', 'Techn.'], 'FR. BLÜMNER, Technologie und Terminologie der Gewerbe und Künste der Griechen und Römer, Leipz. 1875—1887', { std: 1 });
w(['BLÜMNER', 'BLUMNER'], ['Kunstgew. im Altert.', 'Kunstgew. im Alert.', 'Kunstgew.'], 'H. BLÜMNER, Das Kunstgewerbe im Altertum, Leipzig und Prag 1885', { e: 1 });
w(['MARQUARDT', 'MARQ.'], ['Das Privatleben der Römer', 'Privatleben', 'Privatl.', 'Pl.', 'Pl'], 'J. MARQUARDT, Das Privatleben der Römer, 2. Aufl., Leipz. 1886', { std: 1 });
w('VOIGT', ['Die röm. Altertümer', 'Privataltertümer', 'Privataltert.', 'Privatalt.', 'Altert.'], 'M. VOIGT, Die röm. Altertümer. Privataltertümer und Kulturgeschichte, in I. Müllers Handb. der klass. Altertumswissenschaft, IV. Bd., 2. Abteilung, München 1893', { std: 1 });
w('BECKER-GÖLL', ['Gallus'], 'W. A. BECKER, Gallus oder röm. Szenen aus der Zeit Augusts, neu bearbeitet von H. GÖLL, Berlin 1880', { std: 1 });
w('BECKER-GÖLL', ['Charikles', 'Char.'], 'W. A. BECKER, Charikles. Bilder altgriechischer Sitte, neu bearbeitet von H. GÖLL, Berlin 1877—1878', { e: 1 });
w('BECKER', ['Gallus'], 'W. A. BECKER, Gallus oder röm. Szenen aus der Zeit Augusts, neu bearbeitet von H. GÖLL, Berlin 1880', { nb: 1 });
w('BECKER', ['Charikles', 'Char.'], 'W. A. BECKER, Charikles. Bilder altgriechischer Sitte, neu bearbeitet von H. GÖLL, Berlin 1877—1878', { e: 1, nb: 1 });
w('RICH', ['Illustriertes Wörterbuch'], 'A. RICH, Illustriertes Wörterbuch der röm. Altertümer, übersetzt von C. MÜLLER, Paris und Leipzig 1862', { std: 1 });
w('FORRER', ['Reallexikon', 'Reallex.'], 'R. FORRER, Reallexikon der prähistor., klass. und frühchristl. Altertümer, Berlin und Stuttgart 1907', { std: 1 });
w('ARJE', ['Das bürgerl. Wohnhaus'], 'S. ARJE, Das bürgerl. Wohnhaus in Palästina (Manuskript)', { std: 1 });

// ---------- Bauwesen, Reisen, Orient ----------
w('LAYARD', ['Ninive und seine Überreste', 'Niniveh', 'Ninive'], 'LAYARD, Ninive und seine Überreste, deutsch von W. Meissner, Lpz. 1850', { std: 1 });
w('BAEDEKER', ['Pal. u. Syrien', 'Pal. u. Syr.', 'Pal.'], 'K. BAEDEKER, Palästina und Syrien, 6. Aufl., Leipzig 1904', { std: 1, e: 1 });
w('BAUER', ['Volksleben im Lande der Bibel', 'Volksleben', 'Volksl.'], 'L. BAUER, Volksleben im Lande der Bibel, 2. Aufl.', { std: 1, e: 1 });
w('RITTER', ['Erdk.', 'Ek.'], 'C. RITTER, Die Erdkunde im Verhältnis zur Natur und zur Geschichte des Menschen, 2. Aufl., Berlin 1822—1859', { std: 1, e: 1 });
w('RAUMER', ['Pal.', 'Palästina'], 'K. v. RAUMER, Palästina, 4. Aufl., Leipzig 1860', { std: 1, e: 1 });
w('RAUMER', ['Geschichte der Pädagogik', 'Pädagogik'], 'K. RAUMER, Geschichte der Pädagogik, 3. Aufl., Stuttgart 1857—1861');
w('ROBINSON', ['Pal.', 'Palästina'], 'E. ROBINSON, Palästina und die südlich angrenzenden Länder, Halle 1841—1842', { std: 1, e: 1 });
w('RELAND', ['Pal.', 'Palaestina'], 'H. RELAND, Palaestina ex monumentis veteribus illustrata, Utrecht 1714', { std: 1, e: 1 });
w('NIEBUHR', ['Beschreibung von Arabien', 'Beschreib. von Arabien', 'Beschreib. v. Arabien', 'Beschreib. von Arab.', 'Beschreib. v. Arab.', 'Beschr. v. Arabien', 'Beschr. v. Arab.'], 'C. NIEBUHR, Beschreibung von Arabien, Kopenhagen 1772');
w('NIEBUHR', ['Reisebeschreibung von Arabien', 'Reisebeschreibung', 'Reisebeschr.', 'Reisen', 'Reise'], 'C. NIEBUHR, Reisebeschreibung nach Arabien und andern umliegenden Ländern, Kopenhagen 1774—1778', { e: 1 });
w('BURCKHARDT', ['Bemerkungen über die Beduinen', 'Beduinen u. Wahaby'], 'J. L. BURCKHARDT, Bemerkungen über die Beduinen und Wahaby, Weimar 1831');
w('BURCKHARDT', ['Reisen'], 'J. L. BURCKHARDT, Reisen in Syrien, Palästina und der Gegend des Berges Sinai, Weimar 1823—1824', { e: 1, std: 1 });
w('BURCKHARDT', ['Arab.'], 'J. L. BURCKHARDT, Reisen in Arabien, Weimar 1830', { e: 1 });
w('ARVIEUX', [], 'L. d’ARVIEUX, Merkwürdige Nachrichten (deutsche Übersetzung seiner Mémoires), Kopenhagen und Leipzig 1753—1756', { std: 1, e: 1 });
w('WETZSTEIN', ['Die syr. Dreschtafel', 'Dreschtafel'], 'WETZSTEIN, Die syr. Dreschtafel, in Zschr. für Ethnol. 1873, 187—294');
w('WETZSTEIN', ['Reisebericht über den Haurân', 'Reisebericht', 'Reise im Haurân'], 'J. G. WETZSTEIN, Reisebericht über Hauran und die Trachonen, Berlin 1860', { e: 1 });
w('SACHAU', ['Reisen in Syrien', 'Reisen in Syr.'], 'E. SACHAU, Reise in Syrien und Mesopotamien, Leipzig 1883', { std: 1, e: 1 });
w('SACHAU', ['Am Euphrat u. Tigris', 'Am Euphrat und Tigris'], 'E. SACHAU, Am Euphrat und Tigris, Leipzig 1900', { e: 1 });
w('SACHAU', ['Drei aramäische Papyrusurk.'], 'E. SACHAU, Drei aramäische Papyrusurkunden, Berlin 1908');
w('PALMER', ['Wüstenwanderung'], 'E. H. PALMER, Der Schauplatz der vierzigjährigen Wüstenwanderung Israels, Gotha 1876', { std: 1, e: 1 });
w('PALMER', ['The desert of the Exodus'], 'E. H. PALMER, The desert of the Exodus, Cambridge 1871', { e: 1 });
w('BOVET', ['Voyage en Terre-Sainte', 'Voyage en terre-sainte'], 'F. BOVET, Voyage en Terre-Sainte, Paris 1861', { std: 1 });
w('NOLDE', ['Reise nach Innerarabien', 'Reise', 'Reisen'], 'ED. NOLDE, Reise nach Innerarabien, Kurdistan und Armenien, Braunschweig 1895', { std: 1 });
w('BELL', ['Durch die Wüsten', 'Syrien'], 'G. L. BELL, Durch die Wüsten und Kulturstätten Syriens, Leipz. 1908', { std: 1 });
w('FURRER', ['Wanderungen in Pal.'], 'FURRER, Wanderungen in Pal., St.-Gallen 1863');
w('FURRER', ['Wanderungen durch d. h. Land'], 'FURRER, Wanderungen durch d. h. Land, Zürich 1891');
w('MUNK', ['Palestine', 'Pal.'], 'MUNK, Palestine, Paris 1881', { std: 1 });
w('TOBLER', ['Denkblätter'], 'T. TOBLER, Denkblätter aus Jerusalem, St. Gallen 1853', { e: 1 });
w('TOBLER', ['Topogr.'], 'T. TOBLER, Zur Topographie von Jerusalem und seinen Umgebungen, Berlin 1853—1854', { e: 1 });
w('MOMMERT', ['Siloah'], 'C. MOMMERT, Siloah, Brunnen, Teich, Kanal zu Jerusalem, Lpz. 1908');
w('MOMMERT', ['Der Teich Bethesda', 'Bethesda'], 'C. MOMMERT, Der Teich Bethesda zu Jerusalem, Lpz. 1907');
w('MOMMERT', ['Topogr. des alt. Jerus.', 'Topogr. d. alt. Jerus.', 'Topogr.'], 'C. MOMMERT, Topographie des alten Jerusalem, Lpz. 1900');
w('SCHLATTER', ['Zur Topogr. u. Gesch. Pal.', 'Zur Top. u. Gesch. Pal.'], 'A. SCHLATTER, Zur Topographie und Geschichte Palästinas, Calw und Stuttgart 1893', { std: 1, e: 1 });
w('BUHL', ['Geogr. des alt. Pal.', 'Geogr. d. alt. Pal.', 'Geogr.'], 'F. BUHL, Geographie des alten Palästina, Freiburg i. Br. 1896', { std: 1, e: 1 });
w(['NEUBAUER', 'NEUB.', 'NEUB'], ['Géogr.'], 'A. NEUBAUER, La Géographie du Talmud, Paris 1868', { std: 1, e: 1 });
w('ANDRAE', ['Der Anu-Adad-Tempel'], 'WALTER ANDRAE, Der Anu-Adad-Tempel in Assur, Lpz. 1909', { std: 1 });
w('BEZOLD', ['Ninive und Babylon', 'Ninive u. Babylon', 'Niniveh und Babylon'], 'C. BEZOLD, Ninive und Babylon, Bielef. u. Lpz. 1903', { std: 1 });
w('MASPERO-STEINDORFF', ['Ägypt. Kunstgesch.', 'Kunstg.'], 'G. MASPERO, Ägyptische Kunstgeschichte, deutsch von G. STEINDORFF, Leipzig 1889', { std: 1, e: 1 });
w('WILKINSON', ['Manners and Customs', 'Manners', 'Anc. Egyptians', 'Ancient Egyptians', 'Anc. Egypt.'], 'J. G. WILKINSON, Manners and Customs of the Ancient Egyptians, London 1837', { std: 1, e: 1 });
w('LANE', ['Manners and Customs', 'Mann. and customs', 'Sitten'], 'E. W. LANE, Manners and Customs of the Modern Egyptians, London 1836', { std: 1 });
w('ERMAN', ['Ägypten und ägyptisches Leben', 'Ägypten u. ägypt. Leben'], 'ERMAN, Ägypten und ägyptisches Leben im Altertum', { std: 1 });
w(['OVERBECK-MAU', 'OVERBECK'], ['Pompeji', 'Pomp.', 'Pom.'], 'J. OVERBECK — A. MAU, Pompeji in seinen Gebäuden, Alterthümern und Kunstwerken, 4. Aufl., Leipzig 1884', { std: 1, e: 1 });
w('MICHAELIS', ['Arch. Entdeckungen'], 'A. MICHAELIS, Arch. Entdeckungen im 19. Jh., Lpz. 1906');
w('MICHAELIS', ['Mosaisches Recht', 'MR'], 'J. D. MICHAELIS, Mosaisches Recht, Frankfurt a. M. 1770—1775', { e: 1 });
w('CLERMONT-GANNEAU', ['La Palestine inconnue'], 'CLERMONT-GANNEAU, La Palestine inconnue, Paris 1876');
w('CLERMONT-GANNEAU', ['Mission en Palestine'], 'CLERMONT-GANNEAU, Mission en Palestine et en Phénicie, 5e rapport, Paris 1884');
w('CLERMONT-GANNEAU', ['Recueil', 'Recuil'], 'CLERMONT-GANNEAU, Recueil d’archéologie orientale, Paris 1888 ff.', { e: 1 });
w('STRECK', ['Die alte Landschaft Babylonien'], 'STRECK, Die alte Landschaft Babylonien nach den arab. Geographen, 1900', { std: 1 });
w('SPRENGER', ['Post- und Reiserouten'], 'A. SPRENGER, Post- und Reiserouten des alten Orient, Lpz. 1864', { std: 1 });
w('PICK', ['Assyrisches und Talmudisches', 'Assyrisches u. Talmudisches'], 'H. PICK, Assyrisches und Talmudisches, Berlin 1903', { std: 1 });
w('MEISSNER', ['Bauinschriften des Sanherib'], 'B. MEISSNER, Die Bauinschriften Sanheribs, Leipzig 1902', { e: 1 });
w('MEISSNER', ['Beitr. zum altbabyl. Privatrecht'], 'B. MEISSNER, Beiträge zum altbabylonischen Privatrecht, Leipzig 1893', { e: 1 });
w('SCHORR', ['Babyl. Rechtsurkunden'], 'SCHORR, Babyl. Rechtsurkunden, Wien 1907', { std: 1 });

// ---------- Nachschlagewerke, Wörterbücher ----------
w(['GESENIUS', 'GES.', 'GESEN.', 'GES', 'GES-BUHL'], ['Hwb.', 'Hwb', 'Wb.', 'Wb'], 'W. GESENIUS, Hebräisches und aramäisches Handwörterbuch über das Alte Testament, 14. Aufl. bearbeitet von F. Buhl, Leipzig 1905 (¹³ = 13. Aufl. 1899)', { std: 1, e: 1 });
w(['BROCKELM.', 'BROCKELMANN'], ['Lex. Syr.'], 'C. BROCKELMANN, Lexicon Syriacum, Berlin 1895', { std: 1, e: 1 });
w(['BUXTORF', 'BUXT.'], ['Lex.'], 'J. BUXTORF, Lexicon Chaldaicum, Talmudicum et Rabbinicum, Basel 1639', { std: 1, e: 1 });
w('BUXTORF', ['De sponsalibus et divortiis'], 'J. BUXTORF, De sponsalibus et divortiis, Basel 1652');
w('BUXTORF', ['Floril. Hebr.', 'Florileg. Hebr.'], 'J. BUXTORF, Florilegium Hebraicum, Basel 1648', { e: 1 });
w('SCHULTHESS', ['Lex. Syropal.', 'Lex. Syro-Pal.', 'Lex.'], 'F. SCHULTHESS, Lexicon Syropalaestinum, Berlin 1903', { std: 1, e: 1 });
w('SCHULTHESS', ['Homonyme Wurzeln'], 'F. SCHULTHESS, Homonyme Wurzeln im Syrischen, Berlin 1900', { e: 1 });
w('DOZY', ['Suppl.'], 'R. DOZY, Supplément aux dictionnaires arabes, Leyde 1881', { std: 1, e: 1 });
w('DOZY', ['Dict. des vêtements', 'Hist. des vêtem.'], 'R. DOZY, Dictionnaire détaillé des noms des vêtements chez les Arabes, Amsterdam 1845', { e: 1 });
w('DOZY', ['Essai'], 'DOZY, Essai sur l’Hist. de l’Islamisme, Leyde-Paris 1879');
w('BELOT', [], 'J. B. BELOT, Vocabulaire arabe-français, Beyrouth', { std: 1, e: 1 });
w('PAPE', ['Gr. Wb.', 'Wb.', 'Wb'], 'W. PAPE, Griechisch-deutsches Handwörterbuch, 3. Aufl., Braunschweig 1880', { std: 1, e: 1 });
w('GEORGES', ['Lat. Wb.', 'Wb.'], 'K. E. GEORGES, Ausführliches lateinisch-deutsches Handwörterbuch', { std: 1, e: 1 });
w('KLUGE', ['Etym. Wb.', 'Et. Wb.', 'Etym. Wb', 'Et. Wb'], 'F. KLUGE, Etymologisches Wörterbuch der deutschen Sprache, 5. Aufl., Straßburg 1894', { std: 1, e: 1 });
w(['STADE-SIEGFRIED', 'SIEGFRIED-STADE', 'STADE-SIEGFR.'], ['Wb.', 'Wb'], 'C. SIEGFRIED — B. STADE, Hebräisches Wörterbuch zum Alten Testamente, Leipzig 1893', { std: 1, e: 1 });
w('STRACK-SIEGFRIED', ['Lehrb. d. neuhebr. Spr.', 'Nh. Gramm.'], 'H. L. STRACK — C. SIEGFRIED, Lehrbuch der neuhebräischen Sprache und Literatur, Karlsruhe und Leipzig 1884', { std: 1, e: 1 });
w('MANDELKERN', ['Konkordanz'], 'S. MANDELKERN, Veteris Testamenti concordantiae hebraicae atque chaldaicae, Leipzig 1896', { std: 1, e: 1 });
w('RIEHM', ['Hwb.', 'Hwb'], 'E. RIEHM, Handwörterbuch des biblischen Altertums, Bielefeld und Leipzig 1884 (2. Aufl. 1893—1894)', { std: 1, e: 1 });
w('LÜBKER', ['Reallexikon', 'RL'], 'F. LÜBKER, Reallexikon des klassischen Altertums, 7. Aufl., Leipzig 1891', { std: 1, e: 1 });
w('PAULY-WISSOWA', ['RE'], 'A. PAULY — G. WISSOWA, Real-Encyclopädie der classischen Altertumswissenschaft, Stuttgart 1894 ff.', { std: 1, e: 1 });
w('DAREMBERG-SAGLIO', ['Dictionnaire des Antiquités', 'Dict. des Antiquitées', 'Dict.'], 'CH. DAREMBERG — E. SAGLIO, Dictionnaire des antiquités grecques et romaines, Paris 1877 ff.', { std: 1, e: 1 });
w('HERMANN', ['Gr. Privataltertümer', 'Gr. Privataltert.'], 'K. F. HERMANN, Lehrbuch der griechischen Privatalterthümer, 3. Aufl. von H. Blümner, Freiburg i. Br. 1882', { e: 1 });
w('HERMANN', ['Lehrb. der griech. Antiqu.', 'Lehrb. der gr. Ant.'], 'K. F. HERMANN, Lehrbuch der griechischen Antiquitäten', { e: 1 });
w('LIDZBARSKI', ['Hb. d. nordsem. Epigraphik'], 'M. LIDZBARSKI, Handbuch der nordsemitischen Epigraphik, Weimar 1898', { e: 1 });
w('FABRICIUS', ['Cod. Apoc. V. T.'], 'J. A. FABRICIUS, Codex pseudepigraphus Veteris Testamenti, Hamburg 1713', { e: 1 });
w('FABRICIUS', ['Bibliographia Antiquaria', 'Bibliogr. Antiquaria'], 'J. A. FABRICIUS, Bibliographia antiquaria, Hamburg 1713', { e: 1 });
w('THILO', ['Cod. Apocr. N. Test.', 'Cod. Apocr. N. T.'], 'J. C. THILO, Codex apocryphus Novi Testamenti, Leipzig 1832', { std: 1, e: 1 });
w('LAND', ['Anecd. Oxon', 'Anekdota Oxon', 'Anecd. Syr.'], 'J. P. N. LAND, Anecdota Syriaca, Leiden 1862—1875', { e: 1 });
w('LAMBERT-BRANDIN', ['Glossaire'], 'M. LAMBERT — L. BRANDIN, Glossaire hébreu-français du XIIIe siècle, Paris 1905', { std: 1, e: 1 });

// ---------- Talmud, Judentum ----------
w('SACHS', ['Beiträge', 'Beitr.'], 'M. SACHS, Beiträge zur Sprach- und Alterthumsforschung aus jüdischen Quellen, 2 Hefte, Berlin 1852—1854', { std: 1, e: 1 });
w('LEWYSOHN', ['Die Zoologie des Talmuds', 'Zool. d. Talm.', 'Zoologie', 'Zool.'], 'L. LEWYSOHN, Die Zoologie des Talmuds, Frankfurt a. M. 1858', { std: 1 });
w('LEWYSOHN', ['Gesch. und System des j. Kalenderwesens'], 'L. M. LEWYSOHN, Gesch. und System des j. Kalenderwesens, Lpz. 1853');
w('LEWYSOHN', ['Über die hebr. und aram. Benennungen'], 'L. LEWYSOHN, Über die hebr. und aram. Benennungen für „Schule“ „Schüler“ und „Lehrer“, in MGWJ 7,384');
w('LÖW', ['Pfl.', 'Pflanzennamen', 'Aramäische Pflanzennamen'], 'I. LÖW, Aramäische Pflanzennamen, Leipzig 1881', { std: 1, ini: 'I.' });
w('LÖW', ['Fischnamen'], 'I. LÖW, Aramäische Fischnamen (in der Nöldeke-Festschrift, Gießen 1906)', { e: 1, ini: 'I.' });
w('LÖW', ['La', 'Lebensalter'], 'L. LÖW, Die Lebensalter in der jüdischen Literatur, Szegedin 1875', { e: 1, ini: 'L.', abs: [[109, 135]] });
w('LÖW', ['Ges. Schr.', 'Gesamm. Schr.', 'Ges. Schriften', 'g. Schr.'], 'L. LÖW, Gesammelte Schriften, Szegedin 1889—1900', { e: 1, ini: 'L.' });
w('LÖW', ['Graphische Requisiten', 'Graph. Requisiten', 'Graph. Requis.', 'Graph. Requ.'], 'L. LÖW, Graphische Requisiten und Erzeugnisse bei den Juden, zwei Lieferungen, Leipzig 1870. 1871', { ini: 'L.', abs: [[192, 194], [260, 300]] });
w('LÖW', ['Tierschutz im Judentum'], 'A. LÖW, Tierschutz im Judentum, Budapest 1890', { ini: 'A.' });
w('LÖW', ['A csók'], 'I. LÖW, A csók (= Der Kuß), Szeged 1882', { ini: 'I.' });
w('LÖW', ['Die Finger'], 'I. LÖW, Die Finger, in Kfm-Gedenkbuch S. 61—85', { ini: 'I.' });
w('LÖW', ['Der biblische ʾēzōb'], 'I. LÖW, Der biblische ʾēzōb, Sitzungsber. Wien 1909', { ini: 'I.' });
w('LÖW', ['Zsidó Eskü'], 'L. LÖW, Zsidó Eskü (= Jüdischer Schwur), Pest 1868', { ini: 'L.' });
w('LÖWY', ['Müller und Bäcker', 'Die Technologie und Terminologie der Müller'], 'G. LÖWY, Die Technologie und Terminologie der Müller und Bäcker in den rabbinischen Quellen (Dissertation), Leipzig 1898', { std: 1 });
w('RIEGER', ['Versuch einer Technologie', 'Technologie', 'Technol.'], 'P. RIEGER, Versuch einer Technologie und Terminologie der Handwerke in der Mišnâh, I. Teil: Spinnen, Färben, Weben, Walken, Berlin 1894', { std: 1 });
w('RIEGER', ['Gesch. d. Juden in Rom'], 'H. VOGELSTEIN — P. RIEGER, Geschichte der Juden in Rom, Berlin 1895—1896', { e: 1, nb: 1 });
w('VOGELSTEIN-RIEGER', ['Gesch. d. Juden in Rom'], 'H. VOGELSTEIN — P. RIEGER, Geschichte der Juden in Rom, Berlin 1895—1896', { e: 1, std: 1 });
w('VOGELSTEIN', ['Die Landwirtschaft', 'Landwirtschaft', 'Landwirtsch.', 'Landw.'], 'H. VOGELSTEIN, Die Landwirtschaft in Palästina zur Zeit der Mišnâh, I. Teil: Der Getreidebau, Berlin 1894', { std: 1 });
w('BRÜLL', ['Trachten der Juden', 'Trachten'], 'A. BRÜLL, Trachten der Juden im nachbibl. Altertume I. Teil, Frankf. a. M. 1873', { std: 1, ini: 'A.' });
w('BRÜLL', ['Jahrb.', 'Jahrbr.'], 'N. BRÜLL, Jahrbücher für jüdische Geschichte und Literatur, Frankfurt a. M. 1874—1890', { e: 1, ini: 'N.' });
w('GOLDMANN', ['Der Ölbau', 'Ölbau', 'Ölbaum'], 'F. GOLDMANN, Der Ölbau in Palästina zur Zeit der Mišnâh, Preßburg 1907 (SA aus MGWJ 1907)', { std: 1 });
w('GOLDMANN', ['La figue en Palestine'], 'F. GOLDMANN, La figue en Palestine à l’époque de la Mischna, REJ 1911, Bd. 62, p. 216 ff.');
w('MAINZER', ['Über Jagd', 'Jagd'], 'M. MAINZER, Jagd, Fischfang und Bienenzucht bei den Juden in der tannäischen Zeit, MGWJ 1909, Bd. 53', { std: 1 });
w('SCHEFTEL', ['ערך מלין'], 'CH. J. SCHEFTEL, ערך מלין (Wörterbuch) der Maße der schriftlichen und mündlichen Lehre, der Münzen, Hohlmaße, Gewichte, Längenmaße und Zeitrechnungen, Berdytschew 1904', { std: 1 });
w(['HERZFELD', 'HERZF.'], ['Handelsgeschichte', 'Handelsg.', 'Hg.'], 'L. HERZFELD, Handelsgeschichte der Juden des Altertums, Braunschweig 1879', { std: 1, ini: 'L.' });
w(['HERZFELD', 'HERZF.'], ['Metrologische Voruntersuchungen', 'Metr. Vorunters.', 'Metr.'], 'L. HERZFELD, Metrologische Voruntersuchungen, II. Lieferung, Lpz. 1865', { ini: 'L.', abs: [[224, 232]] });
w('HERZFELD', ['Zwei Vorträge'], 'L. HERZFELD, Zwei Vorträge über die Kunstleistungen der Hebräer und der alten Juden, Lpz. 1864', { ini: 'L.' });
w('HERZFELD', ['Untersuchungen über die histor. Topogr.'], 'E. HERZFELD, Untersuchungen über die histor. Topogr. der Landschaft am Tigris usw., in Memnon, Lpz. 1907', { ini: 'E.' });
w('ZUCKERMANN', ['Das Mathemat. im Talmud'], 'B. ZUCKERMANN, Das Mathematische im Talmud (Jahresbericht d. Breslauer j.-theol. Seminars), 1878');
w('ZUCKERMANN', ['Das j. Maßsystem'], 'B. ZUCKERMANN, Das j. Maßsystem (in Jahresber. des j. theol. Seminars in Breslau 1867)');
w('ZUCKERMANN', ['Materialien zur Entwickelung'], 'B. ZUCKERMANN, Materialien zur Entwickelung der altj. Zeitrechnung im Talmud, Breslau 1882');
w('ZUCKERMANN', ['Über talm. Münzen', 'Münzen'], 'B. ZUCKERMANN, Über talm. Münzen und Gewichte, 1862');
w('ZUCKERMANDEL', ['Tosefta, Mischna und Bor.', 'Tosefta Mischna und Boraitha', 'Tosefta Mischna u. Bor.', 'Tos. Mischna und Borajtha', 'Tos. Mischna und Bor.', 'Tos. Mischna u. Bor.', 'Tos. Mischn. und Bor.', 'Tos. M. und Bor.', 'Mischna Tos. u. Bor.'], 'M. S. ZUCKERMANDEL, Tosefta, Mischna und Boraitha in ihrem Verhältnis zu einander, Frankfurt a. M. 1908—1909', { std: 1, e: 1 });
w('MADDEN', ['Coins of the Jews', 'Coins', 'Coinage'], 'MADDEN, Coins of the Jews, London 1881', { std: 1 });
w('LEVY', ['Gesch. d. j. Münzen', 'Gesch. d. j. M.', 'j. Münzen'], 'M. A. LEVY, Gesch. d. j. Münzen, Lpz. 1862', { std: 1 });
w('REINACH', ['Les Monnaies Juives'], 'TH. REINACH, Les Monnaies Juives, 1887 (in Actes et Conférences SÉJ)');
w('REINACH', ['Textes'], 'TH. REINACH, Textes d’auteurs grecs et romains relatifs au Judaïsme, Paris 1895', { e: 1 });
w('HULTSCH', ['Griech. u. römische Metrologie', 'Gr. u. röm. Metrologie', 'Gr. u. röm. Metrol.', 'Metrol.'], 'F. HULTSCH, Griech. u. römische Metrologie, 2. Aufl., Berlin 1882', { std: 1 });
w('IBEL', ['Die Wage'], 'TH. IBEL, Die Wage im Altertum u. im Mittelalter, Erlangen 1908', { std: 1 });
w('BACHER', ['Die Agada der Tannaiten', 'Ag. der Tann.', 'Ag. d. Tann.', 'Tann.'], 'W. BACHER, Die Agada der Tannaiten, Straßburg 1884—1890 (Bd. 1, 2. Aufl. 1903)', { e: 1 });
w('BACHER', ['Die Agada der pal. Amoräer', 'Ag. der pal. Amor.', 'Ag. d. pal. Amor.', 'Ag. der pal. Am.', 'Ag. d. pal. Am.', 'pal. Am.'], 'W. BACHER, Die Agada der palästinensischen Amoräer, Straßburg 1892—1899', { e: 1 });
w('BACHER', ['Die exegetische Terminologie', 'Exeget. Terminologie', 'Exeget. Terminol.'], 'W. BACHER, Die exegetische Terminologie der jüdischen Traditionsliteratur, Leipzig 1899—1905', { e: 1 });
w('BACHER', ['Tanchum Jeruš.', 'Tanch. Jeruš.'], 'W. BACHER, Aus dem Wörterbuche Tanchum Jeruschalmis, Straßburg 1903', { e: 1 });
w('BACHER', ['Das altjüd. Schulwesen'], 'W. BACHER, Das altjüd. Schulwesen, in Jahrb. für j. Gesch. u. Lit. Bd. 6, 1903');
w('BLAU', ['Das althebr. Buchwesen', 'Buchwesen'], 'L. BLAU, Studien zum althebräischen Buchwesen und zur biblischen Litteraturgeschichte (kurz „Buchwesen“), im 25. Jahresberichte der Landesrabbinerschule zu Budapest, 1902 (SA Straßb. 1902)', { abs: [[192, 194], [260, 300]] });
w('BLAU', ['Das altjüd. Zauberwesen', 'Das altj. Zauberwesen', 'Altj. Zauberwesen', 'Zauberwesen'], 'L. BLAU, Das altjüdische Zauberwesen, Straßburg 1898', { e: 1, abs: [[100, 135]] });
w('BLAU', ['Zur Einleitung in die heilige Schrift', 'Zur Einl. in die hl. Schrift', 'Zur Einleitung', 'Zur Einl.'], 'L. BLAU, Zur Einleitung in die heilige Schrift, im 17. Jahresberichte der Landesrabbinerschule zu Budapest, 1894');
w('BLAU', ['Masoretische Untersuchungen'], 'L. BLAU, Masoretische Untersuchungen, Straßb. im Els. 1891');
w('BLAU', ['Sul libro'], 'L. BLAU, La letteratura moderna sul libro considerata dal punto di visto del libro Ebraico (SA aus Rivista Isr. V—VII), Firenze 1910');
w('BLAU', ['Die j. Ehescheidung'], 'L. BLAU, Die j. Ehescheidung u. der j. Scheidebrief, im Jahresbericht der Landes-Rabbinerschule zu Budapest 1911');
w('BÜCHLER', ['Der gal. ʿAm ha-ʾAreṣ', 'Der gal. Am ha-ʾAreṣ', 'Der gal. ʾAm ha-Areṣ'], 'A. BÜCHLER, Der galiläische ʿAm ha-ʾAreṣ des zweiten Jahrhunderts, Wien 1906', { e: 1 });
w('BÜCHLER', ['Synedrion'], 'A. BÜCHLER, Das Synedrion in Jerusalem und das große Beth-Din in der Quaderkammer des jerusalemischen Tempels, Wien 1902', { e: 1 });
w('BÜCHLER', ['Priester und Cultus'], 'A. BÜCHLER, Die Priester und der Cultus im letzten Jahrzehnt des jerusalemischen Tempels, Wien 1895', { e: 1 });
w('BÜCHLER', ['Die Tobiaden'], 'A. BÜCHLER, Die Tobiaden und die Oniaden, Wien 1899');
w('BÜCHLER', ['Das jüd. Verlöbnis'], 'A. BÜCHLER, Das jüd. Verlöbnis und die Stellung der Verlobten eines Priesters im ersten und zweiten Jahrhundert (in Lewy-Festschrift, Breslau 1911)');
w('BÜCHLER', ['Das Ausgießen von Wein und Öl'], 'A. BÜCHLER, Das Ausgießen von Wein und Öl als Ehrung bei den Juden, MGWJ 1905, 49,12—40');
w('PERLES', ['Etym. Stud.', 'Etym. St.', 'Et. Stud.', 'Et. St.'], 'J. PERLES, Etymologische Studien zur Kunde der rabbinischen Sprache und Alterthümer, Breslau 1871', { e: 1, ini: 'J.' });
w('PERLES', ['Beitr. zur rabb. Sprach- u. Altertumsk.', 'Beitr. zur rabb. Sprach- u. Altertumskunde', 'Beitr. zur rabb. Sprach- und Altertumskunde', 'Beitr.'], 'J. PERLES, Beitr. zur rabb. Sprach- u. Altertumskunde (SA aus MGWJ 37), Breslau 1893', { ini: 'J.' });
w('PERLES', ['Rabb. Sprach- und Sagenk.'], 'F. PERLES, Zur rabbinischen Sprach- und Sagenkunde, Breslau 1893', { e: 1, ini: 'F.' });
w('PERLES', ['Die j. Hochzeit'], 'J. PERLES, Die j. Hochzeit in nachbiblischer Zeit, Leipzig 1860, SA aus MGWJ 9, 1860', { ini: 'J.', abs: [[117, 125]] });
w('PERLES', ['Die Leichenfeierlichkeiten'], 'J. PERLES, Die Leichenfeierlichkeiten im nachbiblischen Judentume, Breslau (SA aus MGWJ 10)', { ini: 'J.', abs: [[126, 133]] });
w('PERLES', ['Analekten'], 'F. PERLES, Analekten zur Textkritik des A. T., München 1895', { ini: 'F.' });
w('PERLES', ['Babylonisch-j. Glossen'], 'F. PERLES, Babylonisch-j. Glossen (in Orientalist. Ltrztg. 1905, 8,335)', { ini: 'F.' });
w('PERLES', ['Zur Erkl. der Ps. Sal.'], 'F. PERLES, Zur Erkl. der Ps. Sal., Berlin 1902', { ini: 'F.' });
w('PERLES', ['Bousset’s Religion'], 'F. PERLES, Bousset’s Religion des Judentums, Berlin 1903', { ini: 'F.' });
w('PERLES', ['Zur Gesch. der Abbreviaturen'], 'F. PERLES, Zur Gesch. der Abbreviaturen im Hebräischen, in Archiv für Stenographie 1902, 54, S. 41—48', { ini: 'F.' });
w('PREUSS', ['Biblisch-talmudische Medizin', 'Bibl.-talm. Medizin'], 'J. PREUSS, Biblisch-talmudische Medizin, Berlin 1911');
w('PREUSS', ['Die Organe der Bauchhöhle', 'Bauchhöhle'], 'J. PREUSS, Die Organe der Bauchhöhle nach Bibel und Talmud (SA aus Allg. Med. Zentral-Ztg. 1898 No. 39 ff.)');
w('PREUSS', ['Schwangerschaft, Geburt und Wochenbett'], 'J. PREUSS, Schwangerschaft, Geburt und Wochenbett nach Bibel und Talmud (SA aus „Zschr. für Geburtshülfe und Gynäkologie“ Bd. LIII Heft 3)', { abs: [[110, 112]] }); // Krauss: „Wenn nichts folgt, ist die erste Schrift gemeint“
w('PREUSS', ['Die Pathologie der Geburt', 'Pathologie der Geburt'], 'J. PREUSS, Die Pathologie der Geburt nach Bibel und Talmud (SA aus „Zschr. für Geburtshülfe und Gynäkologie“ Bd. LIV, Heft 3)');
w('PREUSS', ['Die Mundhöhle', 'Mundhöhle'], 'J. PREUSS, Die Mundhöhle und ihre Organe nach Bibel und Talmud', { e: 1 });
w('PREUSS', ['Bibl.-talm. Pathologie und Therapie', 'Pathol. und Therapie'], 'J. PREUSS, Biblisch-talmudische Pathologie und Therapie', { e: 1 });
w('PREUSS', ['Materialien zur Gesch. der bibl.-talm.'], 'J. PREUSS, Materialien zur Geschichte der biblisch-talmudischen Medizin', { e: 1 });
w('PREUSS', ['Der Tote und seine Bestattung'], 'J. PREUSS, Der Tote und seine Bestattung (SA aus „Allgem. Mediz. Zentral-Ztg.“)');
w('PREUSS', ['Die männlichen Genitalien'], 'J. PREUSS, Die männlichen Genitalien und ihre Krankheiten nach Bibel und Talmud (SA aus „Wiener Mediz. Wochenschrift“ 1898)');
w('PREUSS', ['Die weiblichen Genitalien', 'Die weibl. Genitalien'], 'J. PREUSS, Die weiblichen Genitalien und ihre Krankheiten nach Bibel und Talmud', { e: 1 });
w('PREUSS', ['Prostitution und sexuelle Perversitäten'], 'J. PREUSS, Prostitution und sexuelle Perversitäten nach Bibel und Talmud, SA aus „Monatshefte für Prakt. Dermatologie“, Bd. 43, 1906');
w('PREUSS', ['Medizin der Juden'], 'J. PREUSS, Medizin der Juden, in Puschmann, Neuburger und Pagel, Handbuch der Gesch. der Medizin I, Jena 1902');
w('PREUSS', ['Sexuelles in Bibel und Talmud'], 'J. PREUSS, Sexuelles in Bibel und Talmud (SA aus „Allgem. Mediz. Zentral-Ztg.“ 1906 No. 30 ff.)');
w('PREUSS', ['Waschungen und Bäder', 'Waschungen'], 'J. PREUSS, Waschungen und Bäder nach Bibel und Talmud', { e: 1 });
w('PREUSS', ['Das Auge'], 'J. PREUSS, Das Auge usw., in Wiener mediz. Wochenschrift 1897');
w('PREUSS', ['Zur Gesch. des Aderlasses'], 'J. PREUSS, Zur Gesch. des Aderlasses (SA aus „Wiener klin. Wochenschr.“ 1895 No. 34. 35)');
w('PREUSS', ['Chirurgisches in Bibel und Talmud'], 'J. PREUSS, Chirurgisches in Bibel und Talmud, Deutsche Zschr. für Chir., Bd. 59, 1901');
w('PREUSS', ['Die Beschneidung'], 'J. PREUSS, Die Beschneidung nach Bibel und Talmud (SA aus „Wiener klin. Rundschau“ 1897, No. 43. 44)');
w('PREUSS', ['Das Versehen der Schwangeren'], 'J. PREUSS, Das Versehen der Schwangeren, in Berliner Klinik, 1892, Heft 51');
w('WUNDERBAR', ['Biblisch-talmudische Medizin', 'Biblisch-talm. Medizin', 'Bibl. Talm. Medizin', 'Bibl.-talm. Medizin', 'Bibl. talm. Medizin'], 'R. J. WUNDERBAR, Biblisch-talmudische Medizin, Riga und Leipzig 1850, 1853, 1857, 1859 etc.', { std: 1 });
w('EBSTEIN', ['Die Medizin im Alten Test.'], 'W. EBSTEIN, Die Medizin im Alten Test., Stuttg. 1901');
w('EBSTEIN', ['Die Medizin im NT und im Talmud', 'Medizin im Talm. u. N. T.'], 'W. EBSTEIN, Die Medizin im Neuen Test. und im Talmud, Stuttg. 1903', { std: 1 }); // Krauss: „wenn nichts folgt, ist dieses gemeint“
w('BERGEL', ['Die Medizin der Talmudisten', 'Medizin der Talmudisten', 'Medizin'], 'J. BERGEL, Die Medizin der Talmudisten, Leipz. u. Berl. 1885');
w('BERGEL', ['Die Eheverhältnisse'], 'J. BERGEL, Die Eheverhältnisse der alten Juden, Leipzig 1881');
w('STERN', ['Die Medizin im Talmud'], 'A. STERN, Die Medizin im Talmud, Frankfurt a. M. 1909', { std: 1 });
w('STERN', ['Über Gesetz und Gesch. der Leichenbest'], 'B. A. STERN, Über Gesetz und Gesch. der Leichenbestattung, Budapest 1874');
w('KOTELMANN', ['Die Ophthalmologie', 'Ophthalmologie'], 'L. KOTELMANN, Die Ophthalmologie bei den alt. Hebräern, Hamb. und Lpz. 1910');
w('KOTELMANN', ['Die Geburtshilfe'], 'L. KOTELMANN, Die Geburtshilfe der alten Hebräer, Marburg 1876');
w('PLOSS', ['Das Weib', 'D. Weib'], 'H. PLOSS, Das Weib in der Natur- und Völkerkunde, 6. Aufl., bearbeitet von M. Bartels, Leipzig 1899');
w('PLOSS', ['Das Kind'], 'H. PLOSS, Das Kind in Brauch und Sitte der Völker, 2. Aufl., Stuttg. 1882');
w('PLOSS', ['Gesch. u. Ethnologisches über Knabenbeschneidung'], 'H. PLOSS, Gesch. u. Ethnologisches über Knabenbeschneidung, Lpz. 1885');
w('KLEIN', ['Tod und Begräbnis'], 'S. KLEIN, Tod und Begräbnis in Palästina zur Zeit der Tannaiten, Berlin 1908', { ini: 'S.', nb: 1 });
w('KLEIN', ['Beitr. zur Geogr. u. Gesch. Gal.', 'Beitr. zur Geogr. u. Gesch. Pal.'], 'S. KLEIN, Beiträge zur Geographie und Geschichte Galiläas, Leipzig 1909', { e: 1, ini: 'S.', nb: 1 });
w('FUNK', ['Die Juden in Babylonien', 'Babyl.'], 'S. FUNK, Die Juden in Babylonien, Berlin 1902—1908', { std: 1 });
w('FUNK', ['Beitr. zur Kulturgesch. Babyloniens'], 'S. FUNK, Beitr. zur Kulturgesch. Babyloniens (SA aus Jahrb. der j. lit. Gesellsch.), Frankf. a. M. 1910');
w('BERLINER', ['Beitr. zur Geogr. u. Ethnogr. Bab.', 'Beitr. zur Geogr. Babyloniens', 'Beitr. zur Geogr. Babyl.', 'Beitr. z. Geogr. Babyl.', 'Geogr. Babyl.'], 'A. BERLINER, Beitr. zur Geogr. u. Ethnogr. Babyloniens im Talm. und Midr. (Jahresbericht des Rabbinerseminars Berlin 1882—1883)', { std: 1 });
w('BERLINER', ['Aus dem inneren Leben'], 'A. BERLINER, Aus dem inneren Leben der deutsch. Juden im Mittelalter, 1871');
w('BERLINER', ['Randbemerkungen'], 'A. BERLINER, Randbemerkungen zum täglichen Gebetbuche, 1909');
w('BERLINER', ['Raši'], 'A. BERLINER, Raši (Raschi) zum Pentateuch, 2. Aufl., Frankfurt a. M. 1905', { e: 1 });
w('ZUNZ', ['Gottesd. Vortr.', 'G. V.', 'GV'], 'L. ZUNZ, Die gottesdienstlichen Vorträge der Juden, 2. Aufl., Frankfurt a. M. 1892', { e: 1 });
w('ZUNZ', ['Synag. Poesie'], 'L. ZUNZ, Die synagogale Poesie des Mittelalters, Berlin 1855', { e: 1 });
w('ZUNZ', ['Ritus'], 'L. ZUNZ, Die Ritus des synagogalen Gottesdienstes, Berlin 1859', { e: 1 });
w('ZUNZ', ['Literaturg. der syn. Poesie', 'Ltg. d. syn. Poesie'], 'L. ZUNZ, Literaturgeschichte der synagogalen Poesie, Berlin 1865', { e: 1 });
w('ZUNZ', ['Zur Gesch. u. Lit.'], 'L. ZUNZ, Zur Geschichte und Literatur, Berlin 1845', { e: 1 });
w('ZUNZ', ['Ges. Schriften', 'Namen der Juden'], 'L. ZUNZ, Gesammelte Schriften, Berlin 1875—1876', { e: 1 });
w('GRAETZ', ['Gesch.'], 'H. GRAETZ, Geschichte der Juden von den ältesten Zeiten bis auf die Gegenwart (Bd., hochgestellt die Auflage)', { std: 1, e: 1 });
w('GRAETZ', ['Kohel.', 'Ḳoh.'], 'H. GRAETZ, Kohélet oder der salomonische Prediger, Leipzig 1871', { e: 1 });
w('GRAETZ', ['Psalmen'], 'H. GRAETZ, Kritischer Commentar zu den Psalmen, Breslau 1882—1883', { e: 1 });
w('JOST', ['Gesch. d. Jts u. s. Sekten', 'Gesch.'], 'I. M. JOST, Geschichte des Judenthums und seiner Secten, Leipzig 1857—1859', { std: 1, e: 1 });
w('WEISS', ['Dor Dor we-Doršav', 'Dor Dor We-Doršav', 'Dōr Dōr wĕ-Dōršāv'], 'I. H. WEISS, Dor dor we-dorschaw (Zur Geschichte der jüdischen Tradition), Wien 1871—1891', { e: 1 });
w('FRANKEL', ['Grundlinien des mos.-talmud. Eherechts', 'Grundl. des mos.-talm. Eherechts', 'Grundlin. des mos. Eherechts'], 'Z. FRANKEL, Grundlinien des mos.-talmud. Eherechts, Breslau 1860');
w('FRANKEL', ['Darke ha-Mišna'], 'Z. FRANKEL, Darkhe ha-Mischna (Hodegetica in Mischnam), Leipzig 1859', { e: 1 });
w('FRANKEL', ['Mebo'], 'Z. FRANKEL, Mebo ha-Jeruschalmi (Einleitung in den Jerusalemischen Talmud), Breslau 1870', { e: 1 });
w('FRANKEL', ['Der gerichtl. Beweis'], 'Z. FRANKEL, Der gerichtliche Beweis nach mosaisch-talmudischem Rechte, Berlin 1846', { e: 1 });
w('FRANKEL', ['Vorstudien zu der Septuaginta'], 'Z. FRANKEL, Vorstudien zu der Septuaginta, Leipzig 1841', { e: 1 });
w('SCHWARZ', ['Der Mischneh Thorah', 'Mischneh Thorah'], 'A. SCHWARZ, Der Mischneh Thorah, Wien 1905', { ini: 'A.' });
w('SCHWARZ', ['Tosifta Ordo Seraim', 'Tos. Zeraim', 'Tos. Seraim'], 'A. SCHWARZ, Tosifta juxta Mischnarum ordinem recomposita, Ordo Seraim, Wilna 1890', { e: 1, ini: 'A.' });
w('SCHWARZ', ['Die herm. Induktion'], 'A. SCHWARZ, Die hermeneutische Induktion in der Talmudischen Literatur, Wien 1909', { e: 1, ini: 'A.' });
w('SCHWARZ', ['Über d. j. Kalenderwesen', 'Der j. Kal.'], 'A. SCHWARZ, Über d. j. Kalenderwesen, Breslau 1872', { ini: 'A.' });
w('SCHWARZ', ['Der Bar-Cochbasche Aufstand'], 'J. H. SCHWARZ, Der Bar-Cochbasche Aufstand unter Hadrian, Brünn 1885', { ini: 'J. H.' });
w('ZIEGLER', ['Königsgleichnisse'], 'I. ZIEGLER, Die Königsgleichnisse des Midrasch beleuchtet durch die römische Kaiserzeit, Breslau 1903', { std: 1, e: 1 });
w('THEODOR', [], 'J. THEODOR, Bereschit Rabba mit kritischem Apparat und Kommentar, Berlin 1903 ff.', { std: 1, e: 1 });
w('WIESNER', ['Scholien'], 'J. WIESNER, Scholien zum babylonischen Talmud, Prag 1859—1867', { std: 1, e: 1 });
w('WIESNER', ['Der Bann'], 'J. WIESNER, Der Bann … auf dem Boden des Judentums, Lpz. 1864');
w('TAYLOR', ['Sayings'], 'C. TAYLOR, Sayings of the Jewish Fathers, 2. Aufl., Cambridge 1897', { std: 1, e: 1 });
w('GINZBERG', ['Geonica'], 'L. GINZBERG, Geonica, New York 1909', { std: 1, e: 1 });
w('KOHUT', ['Über die j. Angelologie'], 'A. KOHUT, Über die j. Angelologie und Daemonologie in ihrer Abhängigkeit vom Parsismus, Lpz. 1866');
w('KOHUT', ['ʿArukh'], 'A. KOHUT, Aruch completum, Wien 1878—1892', { e: 1 });
w(['RAPOPORT', 'RAPAPORT'], ['E. M.', 'ʿErekh Millin'], 'S. L. RAPOPORT, ʿErekh Millin (ערך מלין), Prag 1852', { std: 1, e: 1 });
w('RAPOPORT', ['דברי שלום ואמת'], 'RAPOPORT, דברי שלום ואמת, Prag 1861');
w('FÜRST', ['Glossar.', 'Gloss.'], 'J. FÜRST, Glossarium Graeco-Hebraeum, Straßburg 1890', { e: 1 });
w('JELLINEK', ['Der j. Stamm'], 'A. JELLINEK, Der j. Stamm, Wien 1869', { std: 1 });
w('JUDELEWITZ', ['חיי היהודים בזמן התלמוד', 'Nahardea', 'נהרדעא'], 'JUDELEWITZ, חיי היהודים בזמן התלמוד, 1. Naardea, Wilna 1906', { std: 1 });
w('PINELES', ['דרכה של תורה'], 'H. M. PINELES, דרכה של תורה, Wien 1861', { std: 1, e: 1 });
w('KLOTZ', ['Ebel Rabbathi'], 'KLOTZ, Ebel Rabbathi, Berlin 1890', { std: 1 });
w('STEINSCHNEIDER', ['Vorlesungen'], 'M. STEINSCHNEIDER, Vorlesungen über die Kunde hebr. Handschriften, deren Sammlungen und Verzeichnisse, Lpz. 1897', { std: 1 });
w('ELBOGEN', ['Stud. z. Gesch. d. j. Gottesdienstes'], 'J. ELBOGEN, Stud. z. Gesch. d. j. Gottesdienstes, Berlin 1907', { std: 1 });
w('SEGAL', ['Mišnaic Hebrew', 'Mishnaic Hebrew'], 'M. H. SEGAL, Mišnaic Hebrew (SA aus JQR 1908)', { std: 1 });
w('HERFORD', ['The Christianity in Talmud', 'The Christianity in the Talm.', 'The Christianity in the Talmud'], 'R. T. HERFORD, Christianity in Talmud and Midrash, London 1903', { std: 1, e: 1 });
w('SCHECHTER', ['Studies in Judaism'], 'S. SCHECHTER, Studies in Judaism, London 1896', { std: 1 });
w('MONTGOMERY', ['The Samaritans'], 'J. A. MONTGOMERY, The Samaritans, Philadelphia 1907', { std: 1 });
w('WÜNSCHE', ['Aus Israels Lehrhallen'], 'A. WÜNSCHE, Aus Israels Lehrhallen, Leipzig 1907—1910', { e: 1 });
w('WÜNSCHE', ['Der Kuß'], 'A. WÜNSCHE, Der Kuß in Talmud und Midrasch, in Lewy-Festschrift, Breslau 1911');
w('WÜNSCHE', ['Der Midraš Kohelet'], 'A. WÜNSCHE, Der Midrasch Kohelet (Bibliotheca Rabbinica), Leipzig 1880', { e: 1 });
w('WINTER-WÜNSCHE', ['Jüd. Lit.'], 'J. WINTER — A. WÜNSCHE, Die jüdische Litteratur seit Abschluss des Kanons, Trier 1894—1896', { std: 1, e: 1 });
w('ACKERMANN', ['Der synag. Gesang'], 'A. ACKERMANN, Der synagogale Gesang (in WINTER-WÜNSCHE, Die jüdische Litteratur, Bd. 3)', { std: 1, e: 1 });
w('STRACK', ['Pesaḥim'], 'H. L. STRACK, Pesaḥim. Der Mišnatraktat Passafest, Leipzig 1911', { e: 1, nb: 1 });
w('STRACK', ['Der Blutaberglaube'], 'H. L. STRACK, Der Blutaberglaube in der Menschheit, München 1900', { e: 1, nb: 1 });
w('STRACK', ['Lehrb. der nh. Sprache'], 'H. L. STRACK — C. SIEGFRIED, Lehrbuch der neuhebräischen Sprache und Literatur, Karlsruhe und Leipzig 1884', { e: 1, nb: 1 });
w('STRACK', ['Einl. in das A. T.'], 'H. L. STRACK, Einleitung in das Alte Testament', { e: 1, nb: 1 });
w('LEWY', ['Die sem. Fremdwörter', 'Sem. Frwrtr. im Gr.', 'Sem. Fremdwr. im Gr.', 'Sem. Fremdw. im Gr.', 'Sem. Frdwr. im Gr.', 'Sem. Frwr. im Gr.', 'Sem. Fwr. im Gr.', 'Sem. Frwr im Gr.', 'Sem. Fr. im Gr.'], 'H. LEWY, Die sem. Fremdwörter im Griechischen, Berlin 1895', { std: 1, e: 1, ini: 'H.' });
w('LEWY', ['Ritual des Pesach-Abends'], 'J. LEWY, Ein Vortrag über das Ritual des Pesach-Abends, Breslau 1904', { e: 1, ini: 'J.' });
w('GRÜNBAUM', ['Gesamm. Aufsätze', 'Gesamm. Aufs.', 'Ges. Aufsätze', 'Ges. Aufs.'], 'M. GRÜNBAUM, Gesammelte Aufsätze zur Sprach- und Sagenkunde, hrsg. von F. Perles, Berlin 1901', { std: 1, e: 1 });
w('GRÜNBAUM', ['Neue Beitr.'], 'M. GRÜNBAUM, Neue Beiträge zur semitischen Sagenkunde, Leiden 1893', { e: 1 });
w('GRÜNBAUM', ['Jüd.-deutsche Chrestom.'], 'M. GRÜNBAUM, Jüdischdeutsche Chrestomathie, Leipzig 1882', { e: 1 });
w('FRIEDMANN', ['Der Blinde'], 'M. FRIEDMANN, Der Blinde im biblischen und rabbinischen Schrifttum, Wien 1873', { ini: 'M.' });
w('FRIEDMANN', ['סדר והגדה של לילי פסח'], 'M. FRIEDMANN, סדר והגדה של לילי פסח, Wien 1895', { ini: 'M.' });
w('FRIEDMANN', ['Palesztina földmivelése'], 'D. FRIEDMANN, Palesztina földmivelése (ungarisch)', { e: 1, ini: 'D.' });
w('FARBSTEIN', ['Das Recht der unfreien und der freien Arbeiter', 'Das Recht der freien und unfreien Arbeiter'], 'D. FARBSTEIN, Das Recht der unfreien und der freien Arbeiter nach j.-talmud. Recht, Frankf. a. M. 1896', { std: 1 });
w('KAHN', ['Die Sklaverei', 'L’esclavage', 'L\'esclavage'], 'ZADOC KAHN, L’esclavage selon la Bible et le Talmud, Paris 1867, deutsch von J. SINGER, Die Sklaverei nach Bibel und Talmud, Prag 1888', { std: 1 });
w('WINTER', ['Die Stellung der Sklaven'], 'J. WINTER, Die Stellung der Sklaven bei den Juden, Halle 1886', { ini: 'J.' });
w('WINTER', ['Die Koch- und Tafelgeräte', 'Koch- und Tafelgeräte', 'Koch- u. Tafelgeräte'], 'M. WINTER, Die Koch- und Tafelgeräte in Palästina zur Zeit der Mischnah, Berlin 1910', { ini: 'M.' });
w('MIELZINER', ['The Jewish Law of Marriage'], 'M. MIELZINER, The Jewish Law of Marriage and Divorce, Cincinnati 1901');
w('MIELZINER', ['Die Verhältnisse der Sklaven'], 'M. MIELZINER, Die Verhältnisse der Sklaven bei den alten Hebräern, Kopenhagen 1859');
w('MIELZ.', [], 'M. MIELZINER, The Jewish Law of Marriage and Divorce, Cincinnati 1901; oder: M. MIELZINER, Die Verhältnisse der Sklaven bei den alten Hebräern, Kopenhagen 1859', { std: 1 });
w('BLOCH', ['Die Vormundschaft'], 'M. BLOCH, Die Vormundschaft nach mosaisch-talm. Recht, Budapest 1904', { ini: 'M.' });
w('BLOCH', ['Das mosaisch-talm. Erbrecht'], 'M. BLOCH, Das mosaisch-talm. Erbrecht, Budapest 1889', { ini: 'M.' });
w('BLOCH', ['Teḳanoth', 'Tĕḳānōth'], 'M. BLOCH, שערי תורת התקנות (Die Institutionen des Judentums), Wien und Budapest 1879 ff.', { e: 1, ini: 'M.' });
w('BLOCH', ['Der Arbeiterstand'], 'J. S. BLOCH, Der Arbeiterstand bei den Palästinensern, Griechen und Römern, Wien 1882', { ini: 'J. S.' });
w('BLOCH', ['Armenpflege und Heimatsrecht'], 'J. S. BLOCH, Armenpflege und Heimatsrecht, Wien 1884', { ini: 'J. S.' });
w('ENGERT', ['Ehe- und Familienrecht', 'Eherecht'], 'TH. ENGERT, Ehe- und Familienrecht der Hebräer, München 1905', { std: 1 });
w('BUCHHOLZ', ['Die Familie'], 'P. BUCHHOLZ, Die Familie in rechtlicher und moralischer Beziehung nach mos.-talmud. Lehre, Breslau 1867', { std: 1 });
w('ROBERTS', ['Das Familien-, Sklaven- und Erbrecht'], 'R. ROBERTS, Das Familien-, Sklaven- und Erbrecht im Qorân, Leipzig 1908', { std: 1 });
w('SMITH', ['Kinship and Marriage', 'Kinship'], 'W. R. SMITH, Kinship and Marriage in early Arabia, Cambridge 1885');
w('SMITH', ['Religion der Semiten', 'Semit.'], 'W. R. SMITH, Die Religion der Semiten, deutsche Ausgabe, Freiburg i. Br. 1899', { e: 1 });
w('FREUND', ['Zur Gesch. des Ehegüterrechtes', 'Zur Gesch. d. Ehegüterrechts'], 'L. FREUND, Zur Gesch. des Ehegüterrechtes bei den Semiten, Wien 1909', { std: 1 });
w('FREY', ['Altisraelitische Totentrauer'], 'J. FREY, Altisraelitische Totentrauer, Dorpat 1898', { std: 1 });
w('FREY', ['Tod u. Seelenglaube'], 'J. FREY, Tod, Seelenglaube und Seelenkult im alten Israel, Leipzig 1898', { e: 1 });
w('RABBINOWICZ', ['Der Totenkultus'], 'J. RABBINOWICZ, Der Totenkultus bei den Juden, Frankfurt a. M. 1889', { std: 1 });
w('GRÜNEISEN', ['Der Ahnenkultus'], 'C. GRÜNEISEN, Der Ahnenkultus und die Urreligion Israels, Halle 1900', { std: 1 });
w('MATTHES', ['Die isr. Trauergebräuche'], 'J. C. MATTHES, Die isr. Trauergebräuche (SA aus M. Altschülers „Vierteljahresschrift für Bibel, Talmud und Patristik“ 2), Lpz. 1906', { std: 1 });
w('FRANKFURTER', ['Das altjüd. Erziehungs- und Unterrichtswesen'], 'S. FRANKFURTER, Das altjüd. Erziehungs- und Unterrichtswesen im Lichte moderner Bestrebungen, Wien 1910', { std: 1 });
w('ROSENBERG', ['Die jüd. Volksschule'], 'E. ROSENBERG, Die jüd. Volksschule im Zeitalter der Tradition, Budapest 1890 (ungarisch)', { std: 1, nb: 1 });
w('GRÜNEBAUM', ['Die Sklaven nach rabbinischen Gesetzen'], 'GRÜNEBAUM, Die Sklaven nach rabbinischen Gesetzen, in Geigers j. Z. 1872, X, 26—45', { std: 1 });
w('NÜCHTERLEIN', ['De tunicis pelliceis'], 'M. J. NÜCHTERLEIN, De tunicis pelliceis Protoplastorum, Altdorff 1675', { std: 1 });
w('HARTMANN', ['Die Hebräerin am Putztische', 'Hebräerin am Putztische', 'Die Hebr. am Putztische'], 'H. HARTMANN, Die Hebräerin am Putztische und als Braut, Amsterdam 1809', { ini: 'H.' });
w('HARTMANN', ['Der islam. Orient', 'Der isl. Orient'], 'M. HARTMANN, Der islam. Orient, Lpz. 1909', { ini: 'M.' });
w('LAZARUS', ['Die Ethik des Judentums', 'Ethik des Judent.', 'Ethik'], 'M. LAZARUS, Die Ethik des Judentums, 1898', { ini: 'M.' });
w('SEIPEL', ['Die wirtschaftlichen Lehren', 'Die wirtschaftseth. Lehren', 'Die wirtschaftsethischen Lehren', 'Die wirtsch. Lehren'], 'I. SEIPEL, Die wirtschaftsethischen Lehren der Kirchenväter, Wien 1907', { std: 1 });
w('WEINBERG', ['Die Organisation der j. Ortsgemeinden'], 'M. WEINBERG, Die Organisation der j. Ortsgemeinden in der talmudischen Zeit, in MGWJ 1897, 41', { std: 1, nb: 1 });
w('MEYER', ['Arbeit und Handwerk'], 'S. MEYER, Arbeit und Handwerk im Talmud, Berlin 1878', { ini: 'S.', nb: 1 });
w('MEYER', ['History of the City of Gaza'], 'M. A. MEYER, History of the City of Gaza, New York 1907', { nb: 1 });
w('MEYER', ['Die Sklaverei im Altertum'], 'E. MEYER, Die Sklaverei im Altertum, Dresden 1898', { e: 1, nb: 1 });
w('MEYER', ['Entstehung d. Judent.', 'Entst d. Judent.'], 'E. MEYER, Die Entstehung des Judenthums, Halle 1896', { e: 1, nb: 1 });
w('MEYER', ['Gesch. des Altertums'], 'E. MEYER, Geschichte des Altertums', { e: 1, nb: 1 });
w('FRIEDLÄNDER', ['Die Arbeit nach der Bibel'], 'M. H. FRIEDLÄNDER, Die Arbeit nach der Bibel, dem Talmud und den Aussprüchen der Weisen in Israel, Pisek 1890', { ini: 'M. H.' });
w(['FRIEDLÄNDER', 'FRIEDLAENDER', 'FRIEDL.'], ['Sittengeschichte', 'Sittengesch.', 'Sitteng.'], 'L. FRIEDLÄNDER, Darstellungen aus der Sittengeschichte Roms in der Zeit von August bis zum Ausgang der Antonine (⁵ = 5. Aufl., ⁷ = 7. Aufl. 1901 usw.)', { std: 1, e: 1 });

// ---------- Geschichte, Kulturgeschichte ----------
w('SCHÜRER', ['Gesch. d. j. Volkes im Zeitalter J. Chr.', 'Gesch. d. j. V. im Zeitalter J. Chr.', 'Gesch. d. j. Volkes', 'Gesch.'], 'E. SCHÜRER, Geschichte des jüdischen Volkes im Zeitalter Jesu Christi, 3.—4. Aufl., Leipzig 1898—1909', { std: 1, e: 1 });
w('SCHÜRER', ['Die siebentägige Woche'], 'E. SCHÜRER, Die siebentägige Woche im Gebrauche der christlichen Kirche der ersten Jahrhunderte, in ZNTW 6 (1905)', { e: 1 });
w('MOVERS', ['Die Phönizier', 'Phönizier', 'Phön.', 'Phön'], 'F. C. MOVERS, Die Phönizier I, Bonn 1841, namentlich III. Teil, Berlin 1856, Handel und Schiffahrt', { std: 1 });
w('PIETSCHMANN', ['Gesch. d. Phön.', 'Phönizier', 'Phön.'], 'R. PIETSCHMANN, Geschichte der Phönizier, Berlin 1889', { std: 1, e: 1 });
w(['SPECK'], ['Handelsgeschichte', 'Handelsgesch.', 'Handelsg.', 'Hg.', 'Hg'], 'E. SPECK, Handelsgesch. des Altertums I—V, Lpz. 1900 ff.', { std: 1 });
w('STARK', ['Gaza'], 'K. B. STARK, Gaza und die philistäische Küste, Jena 1852', { std: 1, e: 1 });
w('STARK', ['Der Wein'], 'M. STARK, Der Wein im jüdischen Schrifttum und Kultus, Wien 1902');
w('STARK', ['Das biblisch-rabbinische Handelsgesetz'], 'M. STARK, Das biblisch-rabbinische Handelsgesetz (aus Prager Tagblatt)');
w('HEHN', ['Kulturpflanzen und Haustiere', 'Kulturpfl.'], 'V. HEHN, Kulturpflanzen und Haustiere in ihrem Übergang aus Asien … in Europa, 7. Aufl., Berlin 1902', { std: 1 });
w('HEHN', ['Das Salz'], 'V. HEHN, Das Salz, 1. Aufl. Berlin 1873, 2. Aufl. 1901');
w('LIEBENAM', ['Städteverwaltung', 'Verwaltung'], 'W. LIEBENAM, Städteverwaltung im römischen Kaiserreiche, Leipzig 1900', { std: 1, e: 1 });
w('SEECK', ['Gesch. des Unterg. d. alt. Welt', 'Untergang der antiken Welt', 'Unterg. d. ant. Welt', 'Untergang des röm. Altert.', 'Untergang'], 'O. SEECK, Geschichte des Untergangs der antiken Welt, Berlin 1895 ff.', { std: 1, e: 1 });
w('SCHILLER', ['Gesch. der röm. Kaiserzeit', 'Gesch. d. röm. Kaiserzeit'], 'H. SCHILLER, Geschichte der römischen Kaiserzeit, Gotha 1883—1887', { std: 1, e: 1 });
w('MADWIG', [], 'J. N. MADVIG, Die Verfassung und Verwaltung des römischen Staates, Leipzig 1881—1882', { std: 1, e: 1 });
w('MOMMSEN', ['RG'], 'TH. MOMMSEN, Römische Geschichte', { e: 1 });
w('MITTEIS', ['Reichsrecht und Volksrecht', 'Volksrecht und Reichsrecht', 'Volksrecht u. Reichsr.'], 'L. MITTEIS, Reichsrecht und Volksrecht in den östlichen Provinzen des römischen Kaiserreichs, Leipzig 1891', { std: 1, e: 1 });
w('GUMMERUS', ['Der römische Gutsbetrieb', 'Der röm. Gutsbetrieb', 'Gutsbetrieb'], 'H. GUMMERUS, Der römische Gutsbetrieb als wirtschaftlicher Organismus nach den Werken des Cato, Varro und Columella (V. Beiheft zur Zschr. „Klio“), 1906', { std: 1 });
w('BÜCHSENSCHÜTZ', ['Besitz u. Erwerb'], 'B. BÜCHSENSCHÜTZ, Besitz u. Erwerb im gr. Altertume, Halle 1869', { std: 1 });
w('KREMER', ['Kulturgesch.', 'Kulturg.'], 'A. v. KREMER, Culturgeschichte des Orients unter den Chalifen, Wien 1875—1877', { e: 1 });
w('KREMER', ['Beitr.'], 'A. v. KREMER, Beiträge zur arabischen Lexikographie, Wien 1883—1884', { e: 1 });
w('SITTL', ['Die Geberden', 'Die Gebärden'], 'K. SITTL, Die Gebärden der Griechen und Römer, Lpz. 1890');
w('SITTL', ['Arch. d. Kunst', 'Arch. der Kunst'], 'K. SITTL, Archäologie der Kunst, München 1895 (I. Müllers Handbuch VI)', { e: 1 });
w('OPITZ', ['Das h. Leben'], 'R. OPITZ, Das häusliche Leben der Griechen und Römer, Leipzig', { std: 1, e: 1 });
w('WEBER', ['Gastronomische Bilder', 'Gastronom. Bilder'], 'F. WEBER, Gastronomische Bilder, 2. Aufl., Leipzig 1891', { std: 1 });
w('BÜCHMANN', ['Geflüg. Worte', 'Gefl. Worte'], 'G. BÜCHMANN, Geflügelte Worte, 21. Aufl., Berlin', { std: 1, e: 1 });
w('ROHDE', ['Psyche'], 'E. ROHDE, Psyche, 4. Aufl., Tübingen 1907', { std: 1 });
w('REITZENSTEIN', ['Hellen. Wundererzählungen', 'Hellenist. Wundererzählungen'], 'R. REITZENSTEIN, Hellen. Wundererzählungen, Lpz. 1906');
w('REITZENSTEIN', ['Liebe und Ehe', 'Liebe u. Ehe'], 'REITZENSTEIN, Liebe und Ehe im Alten Orient, Stuttgart 1909');
w('SPITZER', ['Über Baden und Bäder'], 'S. SPITZER, Über Baden und Bäder bei den alten Völkern, nam. bei den Hebr., Gr. u. Römern, Belovar 1883');
w('SPITZER', ['Die Uhr'], 'SPITZER, Die Uhr bei den Alten, 1885');
w('SPITZER', ['Über Sitte und Sitten'], 'S. SPITZER, Über Sitte und Sitten der alten Völker, namentlich der Hebräer, Griechen und Römer, Budapest 1886');
w('SPITZER', ['Das Mahl'], 'S. SPITZER, Das Mahl bei den Hebräern, Preßburg 1877');
w('WELLHAUSEN', ['Reste des arab. Heidentums', 'Reste d. arab. Heident.', 'Reste arab. Heidentums', 'Reste arab. Heident.', 'Reste'], 'J. WELLHAUSEN, Reste arabischen Heidentums, 2. Aufl., Berlin 1897', { e: 1 });
w('WELLHAUSEN', ['Skizzen'], 'J. WELLHAUSEN, Skizzen und Vorarbeiten, Berlin 1884—1899', { e: 1 });
w('WELLHAUSEN', ['Prolegom.'], 'J. WELLHAUSEN, Prolegomena zur Geschichte Israels', { e: 1 });
w('WELLHAUSEN', ['Die Ehe bei den Arabern'], 'J. WELLHAUSEN, Die Ehe bei den Arabern, in Gött. Gelehrt. Nachrichten, 1893');
w('WELLHAUSEN', ['De gentibus et familiis Judaeis'], 'J. WELLHAUSEN, De gentibus et familiis Judaeis, Göttingen 1870');
w('JACOB', ['Altarab. Beduinenleben', 'Altarab. Beduinenl.', 'Beduinenleben'], 'G. JACOB, Altarabisches Beduinenleben, 2. Aufl., Berlin 1897', { std: 1, e: 1 });
w('JACOB', ['Das Leben der vorisl. Beduinen'], 'G. JACOB, Das Leben der vorisl. Beduinen, Berlin 1895');
w('JACOB', ['Im Namen Gottes'], 'B. JACOB, Im Namen Gottes, Berlin 1903');
w('JACOB', ['Das Hohelied'], 'G. JACOB, Das Hohelied, Berlin 1902');
w('GOLDZIHER', ['Moham. Studien', 'Moham. Stud.'], 'I. GOLDZIHER, Muhammedanische Studien, Halle 1888—1890', { e: 1 });
w('NÖLDEKE', ['Mand. Gramm.'], 'TH. NÖLDEKE, Mandäische Grammatik, Halle 1875', { e: 1, nb: 1 });
w('NÖLDEKE', ['Syr. Gramm.'], 'TH. NÖLDEKE, Kurzgefasste syrische Grammatik, 2. Aufl., Leipzig 1898', { e: 1, nb: 1 });
w('NÖLDEKE', ['Gesch. d. Perser u. Araber', 'Sassaniden', 'Tabari'], 'TH. NÖLDEKE, Geschichte der Perser und Araber zur Zeit der Sasaniden, aus der arabischen Chronik des Tabari übersetzt, Leiden 1879', { e: 1, nb: 1 });
w('NÖLDEKE', ['Beitr. zur sem. Sprachw.'], 'TH. NÖLDEKE, Beitr. zur sem. Sprachwissenschaft, Straßb. 1904', { nb: 1 });
w('BARTH', ['Etym. Stud.', 'Et. Stud.', 'Et. St.'], 'J. BARTH, Etymologische Studien zum semitischen, insbesondere zum hebräischen Lexicon, Leipzig 1893', { e: 1 });
w('BARTH', ['Nominalbildung', 'Nominalbild.'], 'J. BARTH, Die Nominalbildung in den semitischen Sprachen, 2. Aufl., Leipzig 1894', { e: 1 });
w('BARTH', ['Wurzeluntersuchungen'], 'J. BARTH, Wurzeluntersuchungen (zum hebräischen und aramäischen Lexicon), Berlin 1902');
w('LAGARDE', ['Semitica'], 'P. DE LAGARDE, Semitica, Göttingen 1878—1879', { e: 1, nb: 1 });
w('LAGARDE', ['Symmicta', 'Symm.'], 'P. DE LAGARDE, Symmicta, Göttingen 1877—1880', { e: 1, nb: 1 });
w('LAGARDE', ['Orientalia', 'Orient.'], 'P. DE LAGARDE, Orientalia, Göttingen 1879—1880', { e: 1, nb: 1 });
w('LAGARDE', ['Armen. Studien', 'Arm. Stud.', 'Arm. St.'], 'P. DE LAGARDE, Armenische Studien, Göttingen 1877', { e: 1, nb: 1 });
w('LAGARDE', ['Gesamm. Abhandlungen', 'Ges. Abh.'], 'P. DE LAGARDE, Gesammelte Abhandlungen, Leipzig 1866', { e: 1, nb: 1 });
w('LAGARDE', ['Mitteilungen', 'Mitt.'], 'P. DE LAGARDE, Mittheilungen, Göttingen 1884—1891', { e: 1, nb: 1 });
w('LAGARDE', ['Übers.'], 'P. DE LAGARDE, Übersicht über die im Aramäischen, Arabischen und Hebräischen übliche Bildung der Nomina, Göttingen 1889', { e: 1, nb: 1 });
w('BERNAYS', ['Gesamm. Abhandlungen', 'Ges. Abh.'], 'J. BERNAYS, Gesammelte Abhandlungen, Berlin 1885', { std: 1, e: 1 });
w('DELITZSCH', ['Jüdisches Handwerkerleben', 'Handwerkerleben'], 'FRANZ DELITZSCH, Jüdisches Handwerkerleben zur Zeit Jesu, 2. Aufl., Erlangen 1875', { std: 1 });
w('DELITZSCH', ['Handel und Wandel'], 'FR. DELITZSCH, Handel und Wandel in Altbabylonien, Stuttg. 1910');
w('DELITZSCH', ['Assyr. Wb.'], 'FR. DELITZSCH, Assyrisches Handwörterbuch, Leipzig 1896', { e: 1 });
w('DALMAN', ['Aram. Dialektproben'], 'G. DALMAN, Aramäische Dialektproben, Leipzig 1896', { e: 1, nb: 1 });
w('DALMAN', ['Petra und seine Felsheiligtümer'], 'G. DALMAN, Petra und seine Felsheiligtümer, Leipzig 1908', { e: 1, nb: 1 });
w('DALMAN', ['Gramm. des pal. Aram.'], 'G. DALMAN, Grammatik des jüdisch-palästinischen Aramäisch, Leipzig 1894 (2. Aufl. 1905)', { e: 1, nb: 1 });
w('DALMAN', ['WB.'], 'G. DALMAN, Aramäisch-neuhebräisches Wörterbuch zu Targum, Talmud und Midrasch, Frankfurt a. M. 1901', { e: 1, nb: 1 });
w('DERENBOURG', ['Essai'], 'J. DERENBOURG, Essai sur l’histoire et la géographie de la Palestine, Paris 1867', { e: 1 });
w('WESSELY', ['Karanis und Soknopaiou Nesos', 'Karanis und Soknopaiou-Nesos', 'Karanis und Soknop.-Nesos', 'Karanis und Soknopaiu Nesos', 'Karanis u. Soknopaiou Nesos', 'Karanis und SN', 'Karanis'], 'C. WESSELY, Karanis und Soknopaiu Nesos, Denkschr. der k. Akad., Wien 1902, ph.-hist. Kl., Bd. XLVII', { std: 1 });
w('WESSELY', ['Zur Palaeogr. u. Papyruskunde'], 'C. WESSELY, Zur Palaeogr. u. Papyruskunde I, Lpz. 1901');
w('WILCKEN', ['Ostraka', 'Ostr.'], 'U. WILCKEN, Griechische Ostraka aus Aegypten und Nubien, Leipzig und Berlin 1899', { std: 1, e: 1 });
w('WILCKEN', ['Grundzüge u. Chrestomathie'], 'U. WILCKEN, Grundzüge u. Chrestomathie der Papyruskunde, Lpz. 1911');
w('WILCKEN', ['Haaropfer'], 'G. A. WILCKEN, Haaropfer und andere Trauergebräuche bei den Völkern Indonesiens, Amsterdam 1886');
w('SUDHOFF', ['Ärztliches'], 'K. SUDHOFF, Ärztliches aus gr. Papyrus-Urkunden, Lpz. 1909', { std: 1 });
w('KISA', ['Das Glas'], 'A. KISA, Das Glas im Altertume, I—III, Lpz. 1908', { std: 1 });
w('BIRT', ['Das antike Buchwesen'], 'TH. BIRT, Das antike Buchwesen, Berlin 1882');
w('BIRT', ['Die Buchrolle in der Kunst', 'Buchrolle in der Kunst', 'Buchrolle'], 'TH. BIRT, Die Buchrolle in der Kunst, Leipzig 1907');
w('SCHUBART', ['Das Buch bei den Griechen und Römern'], 'W. SCHUBART, Das Buch bei den Griechen und Römern, Berlin 1907', { std: 1 });
w('KARABACEK', ['Das arabische Papier', 'Das arab. Papier'], 'J. KARABACEK, Das arabische Papier, Wien 1887');
w('KARABACEK', ['Neue Quellen'], 'J. KARABACEK, Neue Quellen zur Papiergeschichte, Wien 1888');
w('GRESSMANN', ['Musik und Musikinstrumente', 'Musik'], 'H. GRESSMANN, Musik und Musikinstrumente im Alten Testament, Gießen 1903', { std: 1 });
w('SCHIAPARELLI', ['Die Astronomie im A. T.'], 'SCHIAPARELLI, Die Astronomie im A. T., übers. von W. Lüdke, Gießen 1904', { std: 1 });
w('KRAFFT', ['Lehrb. d. Landwirtsch.', 'Tierzuchtlehre'], 'KRAFFT, Lehrb. d. Landwirtsch., III. Bd., Tierzuchtlehre, 8. Aufl., Berlin 1906', { std: 1 });
w('WIMMER', ['Palästinas Boden'], 'WIMMER, Palästinas Boden, Köln 1902', { std: 1 });
w('ZAPLETAL', ['Das Buch Ḳohelet', 'Ḳoheleth'], 'ZAPLETAL, Das Buch Ḳohelet, Freib. (Schweiz) 1905', { std: 1 });
w('HAUPT', ['Biblische Liebeslieder', 'Bibl. Liebeslieder'], 'P. HAUPT, Biblische Liebeslieder, Leipzig 1907');
w('RIX', ['Tent and Testament', 'Text and Testament'], 'H. RIX, Tent and Testament, London 1907', { std: 1, e: 1 });
w('SELDEN', ['Uxor Ebraica'], 'SELDEN, Uxor Ebraica, Francof. 1673');
w('YATES', ['Textrinum antiquorum'], 'J. YATES, Textrinum antiquorum. An account of the Art of weaving among the Ancients. I. London 1843', { std: 1 });
w('BOCHART', ['Hierozoicon', 'Hieroz.', 'Hieroz'], 'S. BOCHART, Hierozoicon, s. … de animalibus Scripturae Sacrae, London 1663', { std: 1 });
w('ROSENMÜLLER', ['Altes und neues Morgenland', 'Das alte und neue Morgenland', 'Das a. und das n. Morgenland', 'Morgenland'], 'E. F. K. ROSENMÜLLER, Das alte und neue Morgenland, Leipzig 1818—1820', { std: 1, e: 1 });
w('CHAJES', ['Beitr. zur nordsem. Onomatologie'], 'H. P. CHAJES, Beitr. zur nordsem. Onomatologie (Sitzungsberichte Wien, Bd. 143), 1900', { std: 1 });
w('CHAJES', ['Markusstudien'], 'H. P. CHAJES, Markus-Studien, Berlin 1899', { e: 1 });
w('MÜLLER', ['Das Gesetz Hammurabis', 'Hammurabi'], 'D. H. MÜLLER, Das Gesetz Hammurabis und die mos. Gesetzgebung, Wien 1903', { ini: 'D. H.', nb: 1 });
w('MÜLLER', ['Ezechiel-Studien'], 'D. H. MÜLLER, Ezechiel-Studien, Wien 1894', { ini: 'D. H.', nb: 1 });
w('MÜLLER', ['Das sexuelle Leben der Naturvölker'], 'I. MÜLLER, Das sexuelle Leben der Naturvölker, [Augsburg] 1909', { ini: 'I.', nb: 1 });
w('SCHMIDT', ['Geburtstag im Altertum'], 'W. SCHMIDT, Geburtstag im Altertum, Gießen 1908', { nb: 1 });
w('APTOWITZER', ['Das Schriftwort'], 'V. APTOWITZER, Das Schriftwort in der rabbinischen Literatur, im 18. Jahresber. der Isr. Theol. Lehranstalt in Wien 1911');
w('ANDRÉ', ['L\'esclavage chez les anciens Hébreux', 'L’esclavage'], 'TONY ANDRÉ, L’esclavage chez les anciens Hébreux, Paris 1892', { std: 1 });
w('ANDRÉE', ['Volksk. der Juden'], 'R. ANDREE, Zur Volkskunde der Juden, Bielefeld und Leipzig 1881', { std: 1, e: 1 });
w(['DELLA TORRE', 'LELIO DELLA TORRE'], ['Scritti Sparsi'], 'LELIO DELLA TORRE, Scritti Sparsi, Padova 1908', { std: 1 });
w('SCHWAB', ['Vocabulaire de l’Angélologie', 'Angélologie'], 'M. SCHWAB, Vocabulaire de l’Angélologie, Paris 1897', { std: 1 });
w('ILBERG', ['A. Cornelius Celsus'], 'J. ILBERG, A. Cornelius Celsus und die Medizin in Rom (SA aus N. Jahrb. für das klass. Altertum)');
w('ILBERG', ['Zur gynäkologischen Ethik'], 'I. ILBERG, Zur gynäkologischen Ethik der Griechen, in Archiv für Religionswissenschaft, Lpz. 1910, 13,1—9');
w('WENDLAND', ['Philos Schrift über die Vorsehung'], 'P. WENDLAND, Philos Schrift über die Vorsehung, Berlin 1892');
w('BLAUFUSS', ['Römische Feste und Feiertage', 'Röm. Feste und Feiertage', 'Röm. Feste u. Feiertage'], 'H. BLAUFUSS, Römische Feste und Feiertage nach den Traktaten über fremden Dienst (Aboda zara), Beil. zum Jahresber. des kön. Neuen Gymn. in Nürnberg 1908/1909', { abs: [[256, 259]] });
w('BLAUFUSS', ['Götter, Bilder und Symbole', 'Götter und Symbole'], 'H. BLAUFUSS, Götter, Bilder und Symbole nach den Traktaten über fremden Dienst (Beil. zum Jahresber. des Kön. Neuen Gymn. in Nürnberg 1909/10)');
w('EWALD-DUKES', ['Beitr.'], 'EWALD-DUKES, Beitr. zur Gesch. der ältesten Auslegung und Spracherklärung des ATs, Stuttg. 1844', { std: 1 });
w('JASTROW', ['Dictionary'], 'M. JASTROW, A Dictionary of the Targumim, the Talmud Babli and Yerushalmi, and the Midrashic Literature, London und New York 1886—1903', { std: 1, e: 1 });
w('STADE', ['Gesch. d. V. Isr.'], 'B. STADE, Geschichte des Volkes Israel, Berlin 1887—1888', { e: 1, nb: 1 });
w('STADE', ['Wb.', 'Wb'], 'C. SIEGFRIED — B. STADE, Hebräisches Wörterbuch zum Alten Testamente, Leipzig 1893', { e: 1, nb: 1 });
w('EPSTEIN', ['מקדמוניות היהודים', 'מקדמוניות'], 'A. EPSTEIN, מקדמוניות היהודים (Aus den Altertümern der Juden), Wien 1887', { e: 1, nb: 1 });
w('CHWOLSON', ['Ssabier'], 'D. CHWOLSOHN, Die Ssabier und der Ssabismus, St. Petersburg 1856', { e: 1, nb: 1 });
w('FRAENKEL', ['Die aram. Fremdwörter im Arabischen', 'Fremdwörter'], 'S. FRAENKEL, Die aramäischen Fremdwörter im Arabischen, Leiden 1886', { std: 1, ini: 'S.' });
w('GEIGER', ['Urschrift'], 'A. GEIGER, Urschrift und Uebersetzungen der Bibel, Breslau 1857', { e: 1, nb: 1 });
w('GEIGER', ['Nachg. Schr.'], 'A. GEIGER, Nachgelassene Schriften, Berlin 1875—1878', { e: 1, nb: 1 });
w('CASSEL', ['Die Armenverwaltung'], 'D. CASSEL, Die Armenverwaltung im alten Israel, Berlin 1887', { nb: 1 });
w('SCHICK', ['Landwirtschaftliches aus Palästina'], 'C. SCHICK, Landwirtschaftliches aus Palästina, in Österr. Monatsschrift für den Orient, 1879 No. 3', { nb: 1 });
w('ANDERLIND', ['Die Fruchtbäume in Syrien'], 'L. ANDERLIND, Die Fruchtbäume in Syrien, in ZDPV', { nb: 1 });
w('KRAUSS', ['Leben Jesu nach j. Quellen', 'Leben J. nach j. Quellen', 'Leben Jesu'], 'S. KRAUSS, Das Leben Jesu nach jüdischen Quellen, Berlin 1902', { e: 1, nb: 1 });
w('KRAUSS', ['Anton. u. Rabbi'], 'S. KRAUSS, Antoninus und Rabbi, Wien 1910', { e: 1, nb: 1 });
w('KRAUSS', ['Parallelen im Handwerke'], 'S. KRAUSS, Parallelen im Handwerke (SA aus Vierteljahresschrift für Bibelkunde, talmud. und patr. Studien 1907, 3,67—77)', { nb: 1 });
w('ZIMMERN', ['KAT'], 'E. SCHRADER, Die Keilinschriften und das Alte Testament, 3. Aufl. von H. Zimmern und H. Winckler, Berlin 1903', { e: 1, nb: 1 });
w('SCHRADER', ['KAT'], 'E. SCHRADER, Die Keilinschriften und das Alte Testament, 3. Aufl. von H. Zimmern und H. Winckler, Berlin 1903', { e: 1, nb: 1 });
w('SCHRADER', ['Handelsgesch. und Warenkunde'], 'O. SCHRADER, Linguistisch-historische Forschungen zur Handelsgeschichte und Warenkunde, Jena 1886', { e: 1, nb: 1 });

// ---------- Zeitschriften, Sammelwerke und Sigel (ohne Autor) ----------
const SIGEL = {
  'ZDPV': 'Zeitschrift des Deutschen Palästina-Vereins',
  'ZDPN': 'ZDPV = Zeitschrift des Deutschen Palästina-Vereins',
  'ZDPd': 'ZDPV = Zeitschrift des Deutschen Palästina-Vereins',
  'ZDTV': 'ZDPV = Zeitschrift des Deutschen Palästina-Vereins',
  'MuNDPV': 'Mitteilungen und Nachrichten des Deutschen Palästina-Vereins',
  'MuNdDPV': 'Mitteilungen und Nachrichten des Deutschen Palästina-Vereins',
  'MuNddPV': 'Mitteilungen und Nachrichten des Deutschen Palästina-Vereins',
  'Mu.NDPV': 'Mitteilungen und Nachrichten des Deutschen Palästina-Vereins',
  'REJ': 'Revue des études juives',
  'ZDMG': 'Zeitschrift der Deutschen Morgenländischen Gesellschaft',
  'MGWJ': 'Monatsschrift für Geschichte und Wissenschaft des Judentums',
  'ZATW': 'Zeitschrift für die alttestamentliche Wissenschaft',
  'JQR': 'The Jewish Quarterly Review',
  'WZKM': 'Wiener Zeitschrift für die Kunde des Morgenlandes',
  'OLZ': 'Orientalistische Literaturzeitung',
  'ZNTW': 'Zeitschrift für die neutestamentliche Wissenschaft',
  'ZA': 'Zeitschrift für Assyriologie',
  'ZfhB': 'Zeitschrift für hebräische Bibliographie',
  'Z f H B': 'Zeitschrift für hebräische Bibliographie',
  'DLZ': 'Deutsche Literaturzeitung',
  'GGA': 'Göttingische Gelehrte Anzeigen',
  'PEF Quart. Statem.': 'Palestine Exploration Fund, Quarterly Statement',
  'PEF Quat. Statem.': 'Palestine Exploration Fund, Quarterly Statement',
  'PEF Qu. Statem.': 'Palestine Exploration Fund, Quarterly Statement',
  'PEF Qu. Stat.': 'Palestine Exploration Fund, Quarterly Statement',
  'PEF Qu. St.': 'Palestine Exploration Fund, Quarterly Statement',
  'PEF': 'Palestine Exploration Fund, Quarterly Statement',
  'M. Zs. Szemle': 'Magyar Zsidó Szemle (Budapest)',
  'MZs Szemle': 'Magyar Zsidó Szemle (Budapest)',
  'Magyar Zsidó Szemle': 'Magyar Zsidó Szemle (Budapest)',
  'Prot. RE': 'Realencyklopädie für protestantische Theologie und Kirche, 3. Aufl. (Hauck), Leipzig 1896—1913',
  'Haḳedem': 'Haḳedem (הקדם), Zeitschrift für die Wissenschaft des Judentums, hrsg. von M. Lewin und A. Weiß, St. Petersburg 1907 ff.',
  'Rivista Isr.': 'Rivista Israelitica (Florenz)',
  'Riv. Isr.': 'Rivista Israelitica (Florenz)',
  'Byz. Zschr.': 'Byzantinische Zeitschrift',
  'Keleti Szemle': 'Keleti Szemle (Revue orientale, Budapest)',
  'jZ': 'A. GEIGER, Jüdische Zeitschrift für Wissenschaft und Leben, Breslau 1862—1875',
  'j Z': 'A. GEIGER, Jüdische Zeitschrift für Wissenschaft und Leben, Breslau 1862—1875',
  'JE': 'The Jewish Encyclopedia, New York 1901—1906',
  'CIS': 'Corpus Inscriptionum Semiticarum, Paris 1881 ff.',
  'CIL': 'Corpus Inscriptionum Latinarum',
  'CIGr': 'Corpus Inscriptionum Graecarum',
  'CJGr': 'Corpus Inscriptionum Graecarum',
  'KAT': 'E. SCHRADER, Die Keilinschriften und das Alte Testament, 3. Aufl. von H. Zimmern und H. Winckler, Berlin 1903',
  // Sigel für Wörterbücher (Krauss’ Abkürzungen)
  'Lwr': 'S. KRAUSS, Griechische und lateinische Lehnwörter im Talmud, Midrasch und Targum, 2 Teile, Berlin 1898—1899',
  'PSm': 'R. PAYNE SMITH, Thesaurus Syriacus, Oxford 1879—1901',
  'L Trg Wb': 'J. LEVY, Chaldäisches Wörterbuch über die Targumim, Leipzig 1867—1868',
  'L Trg': 'J. LEVY, Chaldäisches Wörterbuch über die Targumim, Leipzig 1867—1868',
  'L': 'J. LEVY, Neuhebräisches und chaldäisches Wörterbuch über die Talmudim und Midraschim, Leipzig 1876—1889',
  'K': 'A. KOHUT, Aruch completum, Wien 1878—1892',
  'J': 'M. JASTROW, A Dictionary of the Targumim, the Talmud Babli and Yerushalmi, and the Midrashic Literature, London und New York 1886—1903',
};
// Diese Sigel nur vor einer Fundstelle (Ziffer, „ib.“, „a. a. O.“), sonst wären es Buchstaben im Text
const SIGEL_NUR_VOR_STELLE = ['L', 'K', 'J', 'PEF', 'JE', 'CIS', 'CIL', 'CIGr', 'CJGr', 'KAT', 'ZA', 'jZ', 'j Z', 'DLZ', 'GGA'];

module.exports = { werke: W.filter(x => !x.skip), SIGEL, SIGEL_NUR_VOR_STELLE };
