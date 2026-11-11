// Kleine Bilder neben den Versionen (Versionsliste) und Wörterbüchern – nicht im Lesetext.
// match = Teil des Versions- bzw. Wörterbuchtitels (Groß/klein egal; der erste passende Eintrag gilt, daher Genaueres zuerst),
// img = Datei in diesem Ordner (jpg, png, gif, webp), name = Text beim Darüberfahren.
window.PORTRAITS = [
  // Personen mit gleichem Nachnamen: über den Vornamen bzw. das Werk unterscheiden
  { match: 'Samson Raphael Hirsch', img: 'samson_raphael_hirsch.jpg', name: 'Samson Raphael Hirsch (1808–1888)' },
  { match: 'Mendel Hirsch', img: 'mendel_hirsch.jpg', name: 'Mendel Hirsch (1833–1900)' },
  { match: 'Julius Hirsch', img: 'julius_hirsch.jpg', name: 'Julius Hirsch' },
  { match: 'Joseph Breuer', img: 'joseph_breuer.jpg', name: 'Joseph Breuer (1882–1980)' },
  { match: 'Raphael Breuer', img: 'raphael_breuer.jpg', name: 'Raphael Breuer' },
  { match: 'Breuer, Arba Megillot', img: 'raphael_breuer.jpg', name: 'Raphael Breuer' },
  { match: 'Wolf, Das Buch Samuel', img: 'wolf.jpg', name: 'Benedikt Pinchas Wolf' },
  { match: 'Die vier und zwanzig Bücher der Bibel im ebräischen Texte', img: 'herxheimer.jpg', name: 'Salomon Herxheimer (1801–1884)' },
  { match: 'Herxheimer', img: 'herxheimer.jpg', name: 'Salomon Herxheimer (1801–1884)' },
  { match: 'Goldschmidt', img: 'goldschmidt.jpg', name: 'Lazarus Goldschmidt (1871–1950)' },
  { match: 'Mendelssohn', img: 'mendelssohn.jpg', name: 'Moses Mendelssohn (1729–1786)' },
  { match: 'משה מדעסויא', img: 'mendelssohn.jpg', name: 'Moses Mendelssohn (1729–1786)' },
  { match: 'Philippson', img: 'philippson.jpg', name: 'Ludwig Philippson (1811–1889)' },
  { match: 'Zunz', img: 'zunz.jpg', name: 'Leopold Zunz (1794–1886)' },
  { match: 'Wünsche', img: 'wuensche.jpg', name: 'August Wünsche (1838–1912)' },
  { match: 'Rawicz', img: 'rawicz.jpg', name: 'Victor Meyer Rawicz (1846–1915)' },
  { match: 'Hildesheimer', img: 'hildesheimer.jpg', name: 'Esriel Hildesheimer (1820–1899)' },
  { match: 'Bamberger', img: 'bamberger.jpg', name: 'Selig Pinchas Bamberger' },
  { match: 'Bernfeld', img: 'bernfeld.jpg', name: 'Simon Bernfeld (1860–1940)' },
  { match: 'Mandelstamm', img: 'mandelstamm.jpg', name: 'Leon Mandelstamm (1819–1889)' },
  // Handschriften
  { match: 'Aleppo', img: 'aleppo.jpg', name: 'Aleppo-Kodex (10. Jh.)' },
  { match: 'Leningrad', img: 'leningrad.jpg', name: 'Leningrader Kodex (1008/09), Teppichseite' },
  { match: 'Qumran', img: 'qumran.jpg', name: 'Schriftrolle vom Toten Meer (Qumran)' },
  // Wörterbücher
  { match: 'Levy', img: 'levy.jpg', name: 'Jacob Levy (1819–1892)' },
  { match: 'Krauss', img: 'krauss.jpg', name: 'Samuel Krauss (1866–1948)' },
  { match: 'Hamburger', img: 'hamburger.jpg', name: 'Jacob Hamburger (1826–1911)' },
  { match: 'Gesenius', img: 'gesenius.jpg', name: 'Wilhelm Gesenius (1786–1842)' },
  { match: 'Jastrow', img: 'jastrow.jpg', name: 'Marcus Jastrow (1829–1903)' },
];
