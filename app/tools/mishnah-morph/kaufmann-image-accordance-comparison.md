# Bildlesungen gegen Accordance: Berakhot

Verglichen wurden die tatsächlich gespeicherten KI-Bildablesungen mit dem vom
Benutzer kopierten, vokalisierten Accordance-Text. Die Be’eri-Vokalisation wurde
nicht als Ersatz für eine Bildlesung verwendet.

## Erstvergleich und Gegenprüfung

Von zunächst 252 als klar erfassten KI-Wortlesungen waren 217 in der Punktierung
gleich, 34 verschieden und eine nicht eindeutig zuzuordnen. 27 der 34
Unterschiede betrafen Abkürzungen, beispielsweise ר׳ gegenüber רֶ׳ oder אוֹמ׳
gegenüber אוֹמֵ׳. Solche Unterschiede können eine unvollständige Punktablesung
meinerseits darstellen und sind keine bestätigten Accordance-Fehler.

Die sieben übrigen Stellen wurden nochmals blind am Originalbild gelesen,
bevor die erwarteten Accordance-Punkte konsultiert wurden:

| Stelle | Erste KI-Lesung | Gegenprüfung am Bild |
|---|---|---|
| 3:1, Wortindex 14 | אֶת | Segol unter א gestützt; Tav-Dagesch offen. Accordance hat hier אֵת. |
| 5:3, Wortindex 6 | וְעַל | Nur Schwa unter ו sicher; Vokal unter ע nicht sicher aufgelöst. |
| 6:3, Wortindex 0 | עַל | Punkt im ל sichtbar; Patach/Qamatz unter ע unsicher. |
| 6:4, Wortindex 10 | יֵשׁ | Segol unter י sichtbar: יֶשׁ. Meine Zere-Lesung war falsch. |
| 6:6, Wortindex 36 | אֶלָּא | אֶלָא als Vokalfolge gestützt; mein gesetzter Dagesch nicht sicher. |
| 7:3, Wortindex 31 | בְּאֶלֶף | Qamatz unter ב sichtbar; meine Schwa-Lesung war falsch. Weitere Zeichen bleiben offen. |
| 7:5, Wortindex 5 | אַחַד | Segol unter א und Qamatz unter ח sichtbar; meine Patach-Lesung war falsch. |

Die Wortindizes sind die nullbasierten diplomatischen Positionen, nicht
lexikalische Kartenindizes. Alle sieben vollständigen Wortlesungen wurden
vorsichtig auf unsicher gesetzt; sichere Einzelzeichen werden gesondert
aufbewahrt. Erstlesungen, Gegenlesungen und die ursprüngliche Vergleichsbilanz
bleiben erhalten. Für den verbleibenden Vokalgegensatz in 3:1 wird damit weder
die gesamte Wortpunktierung noch ein Fehler in Accordance bewiesen.

## Aktueller Stand

Nach dieser Gegenprüfung bleiben 245 als klar erfasste KI-Wortlesungen:
217 gleiche Punktierungen, 27 Unterschiede bei Abkürzungen und eine offene
Zuordnung. Insgesamt sind nun 1.925 Bildlesungen unsicher oder nur teilweise.

Bei 13 ausdrücklich als sicher erfassten Einzelmerkmalen stehen 12
Übereinstimmungen und ein Unterschied (Segol/Zere unter א in 3:1) gegenüber.
Diese Merkmale bestätigen keine vollständigen Wörter.

Zusätzlich wurden bei unsicheren Teilablesungen nur die tatsächlich notierten
Punktkategorien mechanisch verglichen. Nicht erfasste Punkte gelten dabei nie
als sicher fehlend. 671 Teilablesungen sind mit den notierten Referenzpunkten
vereinbar, 139 unterscheiden sich; dies ist ausdrücklich kein Nachweis ihrer
Richtigkeit. Die übrigen Teilablesungen enthalten keine sicher vergleichbaren
Punkte, unbekannte Buchstaben, Quellenzeichen oder offene Zuordnungen.

## Nachvollziehbarkeit

- Aktuelle Aggregate: `kaufmann-image-accordance-comparison.json`.
- Unveränderte Erstbilanz: `kaufmann-image-accordance-before-countercheck.json`.
- Gegenlesungen: `../mishnah/kaufmann-image-accordance-countercheck.json` und die
  betroffenen Folio-Reviews. Die ursprünglichen Bildablesungen sind erhalten.
- Vollständige Referenzdetails und der eingefrorene Datensatz vor der
  Gegenprüfung bleiben außerhalb des Repositories.

Zuordnungen werden nach Stellenangabe und eindeutigen Konsonantenankern gewählt,
nicht nach passenden Vokalen. Annotierte oder fehlerhaft exportierte
Referenzzeichen bleiben offen. Die Berichte binden die unveränderte
Accordance-Abschrift und den jeweiligen Bildlesungsdatensatz über SHA-256.
Weder der Kaufmann-Konsonantentext noch die bestehende Lesefassung oder ihre
morphologischen Vorschläge wurden aus diesem Vergleich automatisch geändert.
