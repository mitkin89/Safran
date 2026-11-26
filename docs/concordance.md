# Werkübergreifende Konkordanz

Unter **Suche → Werkübergreifende Konkordanz** ein einzelnes Wort eingeben. In der **Wortkarte → Konkordanz** erscheinen bis zu zwölf Belege als Vorschau mit Kontext und zugeordneten Entsprechungen direkt neben dem Lesetext. Über den Knopf zur Suche stehen die Gesamthäufigkeit, der Werkfilter und der CSV-Export zur Verfügung.

- **Wortfamilie:** In hebräischen Wortkarten mit ausdrücklicher Zuordnung kannst du im Reiter Konkordanz zur Wortfamilie wechseln. Die Suche verwendet die Lexikon-ID und Sprache der Wurzel und zeigt Westminster-Belege mit ihrer jeweiligen Grundform. Die Option **Weitere Belege in der Suche** behält die Familie bei.
- **Wortform:** ganze Wörter, unabhängig von Großschreibung und hebräischen, griechischen beziehungsweise syrischen Vokal-/Akzentzeichen. Lateinische Umlaute bleiben unterschieden. Keine Teilwortsuche und kein automatisches Abschneiden von Vorsilben.
- **Grundform (wo belegt):** zusätzlich die eingegebene Grundform mit vorhandenen Wortanalysen vergleichen. Unterstützt Westminster/OSHB, passende Septuaginta-Fassungen, eingebettete OGA-Analysen bei Josephus/Philo und ETCBC-Peschitta-Analysen. Stellen ohne passende Analyse bleiben über die Wortform auffindbar. Die Eingabe ist keine automatische Auflösung einer beliebigen flektierten Form in alle möglichen Lemmata.
- Jedes Vorkommen erhält eine eigene Zeile mit Originalschreibweise, bis zu sieben Kontextwörtern auf jeder Seite, Werk, Fassung und ursprünglicher Stellenzählung. Anklicken öffnet die Fundstelle im Leser.
- Häufigkeiten zählen alle durchsuchten Belege, auch bei begrenzter Anzeige. Verschiedene Fassungen zählen getrennt; Zahlen sind keine sprachübergreifenden Äquivalenzzählungen. Abbruch und unlesbare Dateien werden angezeigt.
- Die Übersicht zeigt zunächst höchstens 25 Vorkommen je Quelldatei und insgesamt 1.000. Ein Werkfilter erhöht die Anzeige auf bis zu 500 je Datei. Es findet keine Hochrechnung statt.
- Kategorien und Werkauswahl grenzen die lokalen Texte ein. Nicht heruntergeladene Werke sind nicht enthalten. Fußnoten und als `small` ausgezeichnete Zählungshinweise sind ausgeschlossen.
- CSV exportiert die **angezeigten** Belege mit Wortposition und Analysequelle. Suchverlauf und Favoriten bewahren den Konkordanzmodus.

In der Grundformsuche zeigt die Lemma-Abdeckung, an wie vielen Wortstellen eine nutzbare Grundform hinterlegt ist. Die Aufschlüsselung nach Werk und Fassung enthält auch Fassungen mit null Treffern. Eine Wortstelle mit mehreren analysierten Bestandteilen zählt einmal. In der Wortkarten-Vorschau bezieht sich die Abdeckung auf die vollständig geprüften Fassungen und gibt an, wie viele Fassungen für die Vorschau durchsucht wurden.

Griechische und syrische eingebettete Analysen werden nur bei passendem Quelltext-Hash und passenden Wortfolgen verwendet. OGA ist als Quelle gekennzeichnet und kann automatische Analysen enthalten. Eine gemeinsame Schreibweise kann verschiedene lexikalische Einträge vertreten; die Konkordanz behauptet keine Bedeutungsidentität und setzt eine Wortzuordnung nicht mit allgemeiner Bedeutungsidentität gleich.

In Ruth hat Codex alle 1.392 Quellpositionen bis zum Kolophon geprüft. Der Pilot ergänzt 1.344 Lemma-Belege. 229 davon tragen den Quellenhinweis **Safran (KI-Kontextprüfung mit SEDRA)** und die SEDRA-Eintragsnummer. Die übrigen Zuordnungen sind als **Safran (KI-Kontextprüfung)** gekennzeichnet. Bei Wörterbuchzuordnungen und aus dem Kontext identifizierten Namen ist jeweils das Lemma erfasst. Im Pilot bleiben 19 inhaltlich offene Stellen. Weitere 29 Quellpositionen wurden bewusst ausgeschlossen: Satzzeichen, isolierte Vokalzeichen, Paratext oder einzelne Bestandteile des zweiteiligen Namens Bethlehem. Die heutige lexikalische Abdeckung zählt 36 Stellen ohne Lemma: die 19 offenen Stellen sowie 17 ausgeschlossene Stellen mit Buchstaben. Die zwölf ausgeschlossenen Nichtwörter gehören nicht zu dieser lexikalischen Zählung. Der Datensatz `peshitta-ruth-lemma-review.json` hält die Entscheidungen und konkurrierenden Analysen fest. Wörter ohne passende Analyse bleiben über die Wortform auffindbar.

Für Jesaja enthält `peshitta-isaiah-lemma-review.json` einzeln bestätigte Stellen, Übernahmen aus Paralleltexten und Zuordnungen aus einem automatischen Kontextabgleich. Bei letzterem müssen dieselben syrischen Nachbarwörter in mindestens zwei annotierten Büchern stehen und die hebräische Wortzuordnung sowie die Belege derselben syrischen Form übereinstimmen. Die Suche zeigt die jeweilige Methode und die Stellen im annotierten Vergleichstext. Schwächer belegte Vorschläge bleiben außerhalb der Lemmasuche.

Neben Paralleltexten und Kontextabgleichen enthalten die Jesaja-Ergänzungen und `peshitta-lemma-assignments.json` Zuordnungen aus einem **automatischen Übersetzungsabgleich**. Dafür müssen mindestens zwölf Belege aus mindestens vier annotierten Büchern dieselbe syrische Form mit derselben hebräischen Grundform verbinden. Die Analyse muss mit allen Korpusbelegen derselben syrischen Form übereinstimmen. In der Suche stehen zwei der Quellenstellen beim jeweiligen Treffer. Ergänzungen für teilweise annotierte Bücher greifen an Wortstellen ohne eingebettete Analyse.


## Sprachübergreifende Entsprechungen

Die aktivierte Option **Sprachübergreifende Entsprechungen** ergänzt zu angezeigten Bibelbelegen die zugeordneten Wörter des Westminster-MT, der Septuaginta (CATSS) und der ETCBC-Peschitta. Der Einstieg funktioniert aus allen drei Sprachen. Ein Klick auf die Entsprechung öffnet ihre eigene Quelle und Zählung. CSV enthält diese Verknüpfungen in einer zusätzlichen Spalte.

Die Verbindung erfolgt über dieselbe MT-Wortposition, nicht über ähnliche Wörterbuchglossen. CATSS-Gruppen werden nur verwendet, wenn beide Fassungen dem gebündelten Stand entsprechen und die angegebenen hebräischen Wortanker in einer vollständigen, geordneten Zuordnung zum MT stehen können. Ausgelassene MT-Wörter und griechische Gruppen ohne hebräischen Anker sperren andere, eindeutige Gruppen nicht. Bei mehreren möglichen MT-Positionen bleibt die betreffende Gruppe unverbunden; nicht passende explizite Anker oder ungruppierter griechischer Text werden abgewiesen. So bleibt in Genesis 28,11 die eindeutige Zuordnung von מראשתיו zu πρὸς κεφαλῆς αὐτοῦ erhalten, während das ankerlose γὰρ keinem hebräischen Wort zugeschrieben wird. Peschitta-Zuordnungen verlangen passende Quelltext-Hashes, Wortfolgen und originale syrische Wort-IDs; die eigene Peschitta-Zählung bleibt erhalten. Automatische und von Claude geprüfte Peschitta-Zuordnungen sind entsprechend gekennzeichnet.

Entsprechungen sind zusätzliche Hinweise bei **angezeigten** Belegen und werden nicht zu den Vorkommenszahlen addiert. Fehlende oder unpassende Zuordnungen werden nicht geraten. Für Josephus, Philo oder andere Werke ohne solche Paralleltext-Zuordnungen funktioniert weiterhin die werkübergreifende Wortform-/Grundformsuche; aus einer Bibelübersetzung wird keine automatische Bedeutungszuordnung auf sämtliche anderen Werke übertragen.

## Abschluss des Peschitta-Datenabgleichs

Der aktuelle Datenabgleich ist **mit dokumentierten Restlücken abgeschlossen**. Der Stand umfasst 308.727 lexikalische Wortstellen in 39 Peschitta-Büchern: 237.767 haben eine nutzbare Lemma-Zuordnung, 70.960 bleiben ohne Zuordnung. Diese Zahlen bezeichnen die Hauptlemma-Abdeckung. Sie besagen weder, dass sämtliche Formen vollständig morphologisch analysiert sind, noch dass sämtliche Zuordnungen unabhängig fachlich geprüft wurden.

Die Konkordanz zeigt bei den passenden Peschitta-Fassungen einen sichtbaren Datenstand-Hinweis unterhalb der Lemma-Abdeckung. Unter **Herkunft und offene Stellen** stehen die Herkunft der Zuordnungen und die Ursachen der Lücken. Der Hinweis bezieht sich ausschließlich auf die tatsächlich vollständig durchsuchten, unveränderten Fassungen, auch in der Wortkarten-Vorschau. Bei anderen oder veränderten Ausgaben wird der gespeicherte Bericht nicht als deren Prüfstand ausgegeben. Eine fehlende Lemma-Zuordnung verhindert keine Wortformsuche.

| Ursache | Offene Wortstellen |
| --- | ---: |
| Keine vorhandene Wortverknüpfung | 9.149 |
| Wortgruppe nicht eindeutig auflösbar | 16.670 |
| Zu wenig passende Vergleichsbelege | 42.239 |
| Mehrere mögliche Lemmata | 637 |
| Widersprüchliche Quellenbelege | 2.178 |
| Bewusst zurückgestellte Einzelentscheidung | 87 |
| **Gesamt** | **70.960** |

Alle Wortstellen sind technisch mit den ursprünglichen Textpositionen abgeglichen. Für alle 60.423 ergänzten Stellen wurden passende Ausgabe, Wort-ID, Schreibweise, Versposition und das tatsächlich von der Suche gelieferte Lemma geprüft. Dabei wurden keine Doppelbelegungen, Überschreibungen eingebetteter Quellenanalysen oder Abweichungen zwischen gespeicherter Zuordnung und Suchergebnis festgestellt. Die übrigen 177.344 zugeordneten Stellen verwenden die eingebetteten ETCBC-Quellenanalysen. Jede offene lexikalische Stelle ist im vollständigen Lückenverzeichnis einer der obigen Ursachen zugeordnet; bewusst zurückgestellte Entscheidungen bleiben geschützt.

Die sprachliche Bewertung bleibt nach Herkunft unterscheidbar: Quellenanalysen, Übernahmen aus Paralleltexten, automatische Abgleiche und KI-Kontextentscheidungen. Die vorhandenen Kontrollen an ausgelassenen Originalbüchern bleiben mit ihren tatsächlichen Abweichungen dokumentiert. Sie überschneiden sich und dürfen nicht zu einer gemeinsamen Fehlerquote oder einer unabhängigen Richtigkeitsgarantie zusammengezählt werden. Der Abschluss macht diese Grenzen sichtbar; er erklärt die offenen Stellen nicht für gelöst und die automatischen Entscheidungen nicht für einzeln fachlich bestätigt.

Die Zahlen und die Aufschlüsselung nach Buch und Herkunft liegen in `peshitta-concordance-status.json`. `tools/peshitta/closure-summary.json` dokumentiert Eingabe-Hashes, technische Prüfungen und die vorhandenen Kontrollbefunde. `tools/peshitta/documented-gaps.jsonl.gz` enthält alle 70.960 offenen Positionen mit Original-ID, Kontext, Ausgabe-Hash, Ursache und genauerem Grund. Künftige Verbesserungen benötigen neue Evidenz oder gezielte sprachliche Prüfung; weitere pauschale Durchläufe sind kein Bestandteil dieses abgeschlossenen Arbeitsschritts.

## Geschwindigkeit der Wortformsuche

Die Wortformsuche legt nach vollständig durchsuchten Dateien einen lokalen Wortschatz-Cache unter `.searchcache/concordance-surface-v1/` an. Weitere Wortformsuchen können Dateien ohne das gesuchte Wort überspringen; tatsächliche Treffer, Originalpositionen und vollständige Häufigkeiten werden weiterhin aus dem Quelltext ermittelt. Auch beim ersten Durchlauf werden nur potenziell passende Textabschnitte vollständig in Wörter zerlegt. Der erstmalige Aufbau über eine große Bibliothek benötigt weiterhin Zeit.

Dateipfad, Größe und Änderungszeiten binden den Cache an den jeweiligen Quellstand. Veränderte Dateien werden neu geprüft. Abgebrochene Suchen und gekürzte Vorschauen speichern keinen unvollständigen Wortschatz; fehlende, beschädigte oder nicht beschreibbare Caches verhindern die Suche nicht. Die Beschleunigung gilt für **Wortform**, nicht für die Lemma- oder Wortfamiliensuche, und schränkt die gewählten Bücher und Kategorien nicht zusätzlich ein.
