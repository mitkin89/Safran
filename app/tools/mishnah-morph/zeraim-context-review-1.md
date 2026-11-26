# Seraim: Kontextprüfung häufiger offener Formen – Durchgang 1

Stand: 26. November 2026. **40 zuvor unbestimmte Formgruppen, sämtliche 262 zugehörigen Belegpositionen geprüft.** Ausgangspunkt ist der Wörterbuchdurchgang in `zeraim-dictionary-review.md`.

Die unmittelbaren Satzkontexte wurden für jede Position gelesen und mit den konkreten Jastrow-Artikeln sowie den bereits dokumentierten Flexionsregeln abgeglichen. Bei fachsprachlichen und homographen Formen wurden die einschlägigen Artikelabschnitte gelesen, nicht nur die Stichwortzeile.

Die Entscheidungen in `zeraim-context-review-1.json` tragen Traktat, Kapitel/Mischna, Wortnummer, exakt vokalisierte Quellform und SHA-256 des Quelltextes. Der Generator bricht bei geändertem Quellfingerprint, nicht passender Wortform, doppelter oder unerreichbarer Position ab. Kein Kontextentscheid wird allein wegen gleicher Schreibweise auf weitere Vorkommen übertragen. Der bestehende Berakhot-Prüfstand bleibt unberührt.

## Geprüfte Formen

| Form | Positionen |
|---|---:|
| הָאֵלּוּ | 10 |
| וּשְׁכֵחוֹ | 9 |
| שֶׁיְּעַשֵּׂר | 8 |
| מַעֲלוֹת | 8 |
| וּפָטוּר | 7 |
| עֲבוֹדָתוֹ | 7 |
| חַלָּתָהּ | 7 |
| מַשְׁמִיט | 7 |
| תְּרוּמָתָן | 7 |
| נִגְמְרָה | 7 |
| הַיָּפֶה | 7 |
| מְשַׁלֶּמֶת | 7 |
| כָלֶה | 7 |
| בְּטַהֲרָה | 7 |
| צֵרֵף | 7 |
| וְהֶחָרוּבִין | 6 |
| שֶׁיְּמָרַח | 6 |
| כּוֹתֵשׁ | 6 |
| בְּצָלִים | 6 |
| שֶׁבְּשָׁעַת | 6 |
| פְטוּרָה | 6 |
| הַמְקַבֵּל | 6 |
| הַשּׁוּם | 6 |
| בָאֶמְצַע | 6 |
| וְנִמְלַךְ | 6 |
| וּמְחֻלָּל | 6 |
| שְׂדֵה | 6 |
| כִלְאַיִם | 6 |
| מֻתָּרוֹת | 6 |
| קִדֵּשׁ | 6 |
| מֻתָּרִים | 6 |
| סָכִים | 6 |
| אָמָרוּ | 6 |
| מְדַמַּעַת | 6 |
| שֶׁנִּטַּמָּא | 6 |
| עוֹלָה | 6 |
| עֲרַי | 6 |
| שֶׁלְּכִלְאֵי | 6 |
| נִפְדֶּה | 6 |
| קִבְּלוּ | 6 |

## Wesentliche Unterscheidungen

- **עוֹלָה:** Terumot 3:8 zweimal Brandopfer, feminin singular (Jastrow 20478); die vier anderen Positionen sind das feminine Qal-Partizip zu עלה im Sinn der Aufhebung einer Teruma-Beimischung (19826). Es wird kein einheitliches Lemma aus der bloßen Schreibgleichheit erzwungen.
- **עֲבוֹדָתוֹ:** sechs Kilayim-Belege betreffen den Bearbeitungsraum einer Rebe, Terumot 8:1 den Priesterdienst (22481). Wortform und Morphologie sind gleich, die kontextuellen Kurzglossen unterscheiden sich.
- **מַעֲלוֹת:** acht feminine Hifil-Partizipien zu עלה; Jastrow 19826 nennt Terumot 4:8 ausdrücklich. Keine Stufen-/Grad-Nomen in diesen Kontexten.
- **בְּצָלִים:** sechs Pluralnomina zu בצל „Zwiebel“ (26813). Das ב wird nicht als Präposition abgespalten.
- **כּוֹתֵשׁ:** Jastrow 28285 unterscheidet das Ineinandergreifen der Zweige in Peah 2:3 / Kilayim 5:3 vom Zerstampfen in den vier anderen Positionen. Die Kurzglossen bilden diese Unterscheidung ab.
- **קִדֵּשׁ:** Piel-Perfekt im Mischsaatrecht, „machte durch Mischsaat unzulässig“, nicht unterschiedslos „heiligte“ (16136 mit ausdrücklichem Bezug auf Kilayim 4:5).
- **מְדַמַּעַת:** feminines Piel-Partizip im Teruma-Mischungsrecht, nicht „weint“ (29280, dort ausdrücklich Terumot 3:1 und 5:6).
- **שֶׁנִּטַּמָּא:** die vokalisierte RH-Form wird als Nitpael-Perfekt zu טמא geführt, nicht allein wegen des נ als Nifal. Jastrow 24277 behandelt die Bedeutung und die verwandten Nifal-/Hitpael-Formen; die spezifische RH-Stammbildung folgt Segal §§132–134, gedruckte S.64–65. Der vorhandene technische Code VD benennt Nitpael ausdrücklich.
- **תְּרוּמָתָן:** feminines Singularnomen mit pluralischem Possessivsuffix; die maskulinen Handelnden werden aus dem jeweiligen Kontext bestimmt. Finales ־ן wird nicht ohne Kontext zu einer weiblichen Referenz gemacht.
- **כָלֶה:** sieben prädikative Belege zu זרע. Qal-Partizip und stativische Adjektivauffassung bleiben als Alternativen sichtbar; diese begriffliche Grenze wird nicht künstlich aufgelöst.

Kurzglossen werden als redaktionelle, belegbezogene Angaben in der jeweiligen Wortkarte angezeigt. Eine globale Wörterbuchglosse für das Lemma wird dadurch nicht umgeschrieben. Die Artikelnummern sind nullbasierte Indizes von Safrans Jastrow-Paket `d895bc1c727b`; die Fingerprints sind im Wörterbuchbericht dokumentiert.

## Ergebnis

Von 4.264 zuvor offenen Wortpositionen bleiben **4.002** ohne Bestimmung (deutsche Zahlenschreibweise: 4.002). 255 der 262 Positionen erhielten einen Kandidaten; bei sieben bleiben die genannten zwei Alternativen. Gesamtbestand: **12.396** Positionen mit einem Kandidaten, **7.049** mit mehreren und **4.002** ohne Bestimmung. Keine Position erhält automatisch den Status einer vollständig extern geprüften Annotation.

Die aktuelle Wörterbuch-Prüfliste enthält 3774 offene oder mehrdeutige Formgruppen an 11051 Positionen. Der Wörterbuchbericht wurde nach den Änderungen neu erzeugt. Sein Stichwortabgleich ersetzt weiterhin nicht die inhaltliche Einzelprüfung der verbleibenden Treffer.

## Validierung und Grenzen

29 Node-Tests prüfen alle Quelltextbindungen, sämtliche 262 Entscheidungen, die Wortarten-/Genus-/Stammunterschiede, die Belegglossen und die Wörterbuchverweise. Der Electron-Durchlauf prüft die Darstellung aller 23.447 Wörter in allen 75 Kapiteln und öffnet zusätzlich die Brandopfer-/Beimischungs- sowie Bearbeitungsraum-/Priesterdienst-Karten an den konkreten Stellen.

Für diesen Kontextdurchgang wurde kein neuer Ma’agarim- oder Accordance-Prüfstatus vergeben. Die vorangegangenen gezielten Ma’agarim-Ergebnisse bleiben gesondert dokumentiert. Die 4.002 noch offenen Positionen und die verbleibenden Alternativen benötigen weitere Durchgänge; der ganze Seder ist damit nicht abschließend sprachlich validiert.
