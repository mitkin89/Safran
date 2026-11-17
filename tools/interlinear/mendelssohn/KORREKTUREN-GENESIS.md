# Mendelssohn Genesis: Korrektur eindeutiger Versgrenzen

Ausschließlich vorhandene Satzteile wurden nach wortweisem Abgleich mit dem nummerierten Westminster-Hebräisch verschoben. Wortlaut, Großschreibung und Satzzeichen bleiben erhalten; keine OCR-Korrekturen oder Ergänzungen. Die ursprünglichen Prüflisten dokumentieren den Zustand vor diesen Änderungen.

| Von | Nach | Verschobener Originaltext | Neue Zuordnung im Zielvers |
|---|---|---|---|
| 1:23 | 1:22 | Und das Geflügel mehre sich auf der Erde. | `11:Und das Geflügel / 12:mehre sich / 13:auf der Erde.` |
| 13:7 | 13:6 | Daher konnten sie nicht beisammen wohnen. | `-:Daher / 12:konnten sie / 11:nicht / 14:beisammen / 13:wohnen.` |
| 18:23 | 18:24 | Vielleicht sind funfzig Gerechte in der Stadt. | `1:Vielleicht / 2:sind / 3:funfzig / 4:Gerechte / 5,6:in der Stadt.` |
| 19:12 | 19:13 | Denn wir verderben diese Gegend. | `1:Denn / 3:wir / 2:verderben / 6:diese / 4,5:Gegend.` |
| 19:34 | 19:35 | So gaben sie ihm auch diese Nacht Wein zu trinken. | `1:So gaben sie / 6:ihm / 2:auch / 3,4:diese Nacht / 7:Wein / 1:zu trinken.` |
| 23:9 | 23:10 | Ephron aber saß unter den Kindern Cheth. | `1:Ephron aber / 2:saß / 3:unter / 4:den Kindern / 5:Cheth.` |
| 27:2 | 27:1 | Mein Sohn! Dieser sprach: Hier bin ich! | `15:Mein Sohn! / 16:Dieser sprach: / 18:Hier bin ich!` |
| 32:4 | 32:5 | Und befahl ihnen, wie folget: | `1:Und befahl / 2:ihnen, / 3:wie folget:` |
| 32:21 | 32:20 | Nämlich, so sagt zu Esav, wenn ihr ihn findet. | `14:Nämlich, / 15,16:so / 17:sagt / 18:zu / 19:Esav, / 20:wenn ihr / 21:ihn / 20:findet.` |
| 32:23 | 32:22 | Er aber blieb die Nacht im Lager. | `5:Er aber / 6:blieb / 7,8:die Nacht / 9:im Lager.` |
| 35:9 | 35:10 | Sprach nämlich zu ihm: Dein Namen ist jetzt Jakob. | `1:Sprach / -:nämlich / 2:zu ihm: / 4:Dein Namen / -:ist jetzt / 5:Jakob.` |
| 38:27 | 38:26 | Er berührte sie hierauf nicht mehr. | `16:Er berührte sie / -:hierauf / 13:nicht / 14,15:mehr.` |
| 40:2 | 40:1 | An dem König von Mizrajim. | `11:An dem König / 12:von Mizrajim.` |
| 40:3 | 40:2 | Den Oberbackmeister, | `10,11:Den Oberbackmeister,` |
| 43:22 | 43:21 | Wir bringen es wieder mit. | `16:Wir bringen / 17:es / 16:wieder / 18:mit.` |
| 45:28 | 45:27 | Da ward der Geist ihres Vaters Jakobs wieder belebt. | `18:Da ward / 19:der Geist / 21:ihres Vaters / 20:Jakobs / 18:wieder belebt.` |
| 46:3 | 46:2 | Bin ich. | `10:Bin ich.` |
| 46:7 | 46:6 | Mit ihm. | `15:Mit ihm.` |
| 46:29 | 46:28 | Und sie kamen an im Lande Goschen. | `10:Und sie kamen an / 11:im Lande / 12:Goschen.` |
| 48:11 | 48:10 | Jisrael küßte sie und umarmte sie. | `-:Jisrael / 11,12:küßte sie / 13,14:und umarmte sie.` |

## Zusätzliche Prüfung der führenden Zusatzsegmente

Sämtliche 74 ursprünglich führenden `-:`-Segmente wurden auf weitere sichere Versüberhänge geprüft. Die übrigen sind erläuternde Subjekte, Zeitübergänge, Namensumschriften oder deutsche Ergänzungen im selben Vers; keine weiteren sicheren Verschiebungen. Auch die dokumentierten nachgestellten Überhänge sind berücksichtigt.

Die Wortmenge der gesamten deutschen Quelle einschließlich Großschreibung und Satzzeichen ist vor/nach identisch (Mehrmengenvergleich aller durch Leerraum getrennten Wörter). Bei 46:2 bleiben ausdrücklich „Hier Bin ich.“ und bei 46:6 „Mit ihm.“ unverändert großgeschrieben; eine Normalisierung wäre eine zusätzliche Textänderung.

## Validierung

- 20 Verschiebungen betreffen 39 Versfelder; Genesis 40:2 ist zugleich Quell- und Zielfeld.
- `python3 tools/interlinear/mendelssohn/check.py --partial tools/interlinear/mendelssohn/Genesis.txt`: 1533/1533, vollständig; Text/Nummern ok.
- Wortmenge der Quellenfassung gegenüber dem Originalbackup identisch; keine Wörter hinzugefügt, entfernt oder verändert.
