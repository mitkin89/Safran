# Deutsche Masora-Arbeitsübersetzungen: Nachprüfung 1

Diese Runde wählt die ersten 5.000 noch teilweise offenen Kontexte aus dem vorangegangenen Gesamtbestand von 26.969 transkribierten Notizen. Die Auswahl ist in `round-1-targets.json` mit UUID, ursprünglicher Reihenfolge und Quellhash eingefroren. Sie ist keine Liste von 5.000 bereits vollständig übersetzten Notizen.

Die drei Module übersetzen zusätzliche biblische Erkennungsstellen und masoretische Rubriken. Eigenübersetzungen tragen eine eigene Methodenkennung für die Nachprüfung; vorhandene Editionsangaben gelten nur für tatsächlich übernommene Übersetzungen. Kontextbedingungen begrenzen mehrdeutige Textfragmente auf die geprüften Quellen. Bereits vollständige Arbeitsübersetzungen bleiben erhalten. Textverlust, unsichere Lesungen und nicht übersetzte Reste bleiben ausdrücklich `partial`.

Die Nachprüfung sichtet lesbare Restkandidaten über alle drei Teilbereiche und ergänzt weitere Zitate und Rubriken. Sie ist keine vollständige philologische Einzelprüfung aller 21.167 zuvor offenen Lesungen dieser Auswahl. Ein Kontext kann mehrere, teils weiterhin unerschlossene Lesungen enthalten. „Vollständig“ im Bericht bedeutet deshalb ausschließlich, dass keine seiner Arbeitsübersetzungen mehr als `partial` markiert ist.

`node tools/masora/build-translations.js` erzeugt den Gesamtbestand einschließlich dieser Nachprüfung erneut. Der Builder prüft Quellenbindung, Lesungsreihenfolge, Unsicherheitsangaben und den Erhalt bereits abgeschlossener Arbeitsübersetzungen. `round-1-report.json` zählt geänderte, vollständig erschlossene, weiterhin teilweise offene und unveränderte Kontexte getrennt. „Unverändert“ bedeutet keine zusätzliche sichere Übersetzung; es wird nicht als Abschluss gezählt.

Die Quelltranskriptionen in `masora-data/` bleiben unverändert. Deutsche Fassungen sind Arbeitsübersetzungen, keine wissenschaftlich geprüfte Edition. Die Lizenz- und Quellenangaben des Gesamtbestands bleiben bestehen.
