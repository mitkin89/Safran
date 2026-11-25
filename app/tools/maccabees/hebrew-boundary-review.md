# Hebrew boundary review: Maccabees I–II

This review is a check of corresponding **passage boundaries**, not a claim that
Frankel, Kahana, Kautzsch and Rahlfs have identical wording or readings.

## Sources and coverage

- Sefaria API, `The_Book_of_Maccabees_I`, complete Frankel Hebrew, 16 chapters.
  Version: `כתובים אחרונים - יצחק זעקיל פרענקיל`; API license: Public Domain.
- Sefaria API, `The_Book_of_Maccabees_II`, complete Frankel Hebrew, 15 chapters,
  same version and API license. The API identifies the Da'at edition as source.
- Sefaria API, `The_Book_of_Maccabees_I_(Kahana_Translation)`, complete Kahana
  Hebrew, 16 chapters. The API identifies Hebrew Wikisource as source and labels
  its license `unknown`. This review redistributes no Kahana source text.
- The actual Kautzsch German and Rahlfs Greek chapters in `bundled/manifest.json`.

Every chapter was scanned using the actual Hebrew and corresponding German or
Greek verse beginnings and endings; crossings were checked in their full local
context. Equal chapter counts were not used as proof of matching boundaries.
Original textual differences, paraphrases and corruptions were not corrected.

The three JSON files store monotonic, inclusive source-number ranges. Every
native entry number appears exactly once on each axis. An empty native German
entry remains a real source gap; subsequent labels must not be renumbered.

## Kahana I ↔ Rahlfs

`kahana-i-groups.json` covers all 16 chapters. Most corresponding single entries
share numbers, but these regions must be grouped:

- 2:5–7 ↔ 5–7: Kahana separates Eleazar/Jonathan, while Rahlfs combines the
  names, then separates the introductory seeing-clause and lament.
- 2:34 ↔ 34–35: the Sabbath refusal and immediate attack are together in Kahana.
  Consequently Kahana 35–69 correspond to Rahlfs 36–70.
- 4:21–22 ↔ 21–22: the sight of Judas' prepared camp crosses the boundary.
- 4:57 ↔ 57–58: decoration/dedication and joy are combined in Kahana;
  Kahana 58–60 then correspond to Rahlfs 59–61.
- 8:1–2 and 8:11–12: strength/fame and friendship clauses cross boundaries.
- 9:11–12: Bacchides' position on the right wing crosses the boundary.
- 10:22–25: Demetrius' reaction, deliberation and letter greeting are regrouped.
- 13:52–53 ↔ 52: annual celebration and Temple-mount fortification are split;
  Kahana 54 corresponds to Rahlfs 53.
- 14:19–20: the letter-introduction crosses the boundary.
- 15:35–36: the envoy's failure to answer crosses the boundary.

Chapters 1, 3, 5, 6, 7, 11, 12 and 16 retain individual corresponding numbers
throughout after the content-boundary scan.

## Frankel I ↔ Kautzsch

`frankel-i-groups.json` covers all 16 chapters. Equal array lengths conceal
multiple real sentence/fragment crossings; these are grouped conservatively:

- 1:1–2: Alexander's identity versus Darius' defeat and accession.
- 1:7–8: illness, expectation of death and summoning/dividing among servants.
- 1:10–11: successors' diadems.
- 1:24–25: return home after taking the treasures.
- 1:37–38: ambush, shedding innocent blood and flight of residents.
- 1:39–41: lament over sanctuary, festivals, sabbaths, honor and disgrace.
- 1:47–48: sanctuary pollution, pagan shrines, sacrifice and abandonment of law.
- 2:5–6: seeing the sacrilege and introducing the lament.
- 3:54–55: trumpets and appointment of military leaders.
- 5:52–53: destruction of Ephron, Jordan crossing and gathering stragglers.
- 5:59–60: defeat/casualties and explanation of the disobedient expedition.
- 6:54–55: siege machinery, lack of supplies and sabbatical-year explanation.
- 8:14–15: friendship and fear/obedience of kingdoms have different clause order.
- 9:7–8 and 9:13–14: Judas' distress and Bacchides' right-wing position.
- 10:54–57: Alexander's accession, defeat of Demetrius and friendship request.
- 10:67–68: seating Jonathan beside the king.
- 10:88–89: shooting duration and Jonathan's order that his men stand firm.
- 11:15–16: repudiation of Alexander and publicly revealed enmity.
- 12:36–37: heightening Jerusalem's walls.
- 13:18–21: the native German entry **13:19 is empty**, whereas Frankel has
  Tryphon advancing via Adora and Simon opposing him. The adjacent passage is
  grouped, without manufacturing German text for the missing entry.
- 13:30–31: killing the young Antiochus and Tryphon's usurpation.
- 14:40–41: former garrison's sallies and pollution of the sanctuary.
- 15:16–17: prohibiting assistance to enemies and receipt of the golden shield.
- 15:34–35: ancestral-land claim, wrongful conquest and recovery.
- 16:14–15: date and Simon's visit to Jericho.

Chapters 4 and 7 keep individual corresponding native numbers after the scan.

## Frankel II ↔ Kautzsch

`frankel-ii-groups.json` covers all 15 chapters. The main native segmentation
matches, with conservative grouped exceptions:

- 4:23–25: German **4:24 is empty**, while Frankel has the introductory notice
  of Ptolemy Philometor's ceremonial occasion. The gap is not filled or erased.
- 10:11–13: conclusion of the old Antiochus narrative and introduction of
  Eupator; the closing/transition notice is worded and placed differently.
- 15:19–20: Frankel identifies Jeremiah already in 19; German 19 only introduces
  Onias' speech and gives both identification and intercession in 20.

The prayer continuation in native **8:26** is displaced after the battle-speech
illustrations in **both** Frankel and German. Native-axis identity here must
inherit the broader 8:16–26 ↔ Rahlfs 8:14–20 group from the German/Greek review;
it must not be 'corrected' by silently moving either source's entry.
