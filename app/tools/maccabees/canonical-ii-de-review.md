# Kanonische Rahlfs-Verse: Makkabäer II, Kautzsch

`canonical-ii-de.json` ersetzt sämtliche **56** deutschen Gruppen mit mehreren
griechischen Versen durch Zuordnungen zu **123 einzelnen Rahlfs-Versen**.
Der bisherige vollständige Vergleich aller 15 Kapitel bildet die Grundlage;
die Binnenstellen wurden erneut nach dem deutschen und griechischen Inhalt
getrennt. Es sind keine außergewöhnlichen Gruppen unversorgt geblieben.

Jeder Datensatz enthält `chapter`, den inklusiven griechischen Bereich `greek`
und für jeden griechischen Vers eine `parts`-Liste. `[slot,start,end]` ist ein
Bereich im **unveränderten rohen HTML** des nativen deutschen Eintrags. `slot`
ist einsbasiert, die JavaScript-Zeichenoffsets beginnen bei null, `end` ist
exklusiv. Schnitte liegen außerhalb von HTML-Tags und außerhalb verschachtelter
Fußnoten. Alle Fußnoten und Satzzeichen bleiben erhalten; es wurde nichts neu
übersetzt, ausgelassen oder doppelt verwendet.

## In der Quelle umgestellte Bestandteile

- **II 6,19–20:** Der deutsche native Eintrag 23 zieht „spie er's aus“ vor.
  Die Wörter stehen in Rahlfs 6,20, die umgebenden deutschen Aussagen über
  Lebenswahl und Gang zur Marterbank in Rahlfs 6,19. Die Provenienzintervalle
  legen deshalb zwei nicht zusammenhängende Teile von Eintrag 23 zu Vers 19
  und das dazwischen liegende Stück zu Vers 20.
- **II 8,14–20:** Der native deutsche Eintrag 26 setzt das Gebet aus Eintrag 16
  fort. Er gehört zu Rahlfs 8,15 und steht in der kanonischen Darstellung dort.
  Die Ansprache und Rückschau aus Einträgen 17–25 stehen in Rahlfs 8,16–20.
- **II 9,20–21:** Die deutsche zusätzliche kurze Krankheitsfeststellung aus
  Eintrag 27 bleibt beim Krankheit und Rückkehr behandelnden Vers 21 erhalten.
  Der Wortlaut der Ausgaben wird nicht angeglichen.

Längere Sätze können an den kanonischen Versgrenzen weiterlaufen; ihre
ursprünglichen Satzanschlüsse bleiben bestehen. Das ist eine andere
Versaufteilung desselben vorhandenen deutschen Textes, keine neue Übersetzung.

## Prüfung

Für jede der 56 außergewöhnlichen Gruppen wurden alle nativen Quellintervalle
pro Eintrag sortiert und auf die lückenlose Folge von `0` bis `html.length`
geprüft. Kein Zeichen ist überlappend oder unberücksichtigt; die Anzahl der
Ziele entspricht überall der Zahl griechischer Verse. Ganze native Einträge
in Gruppen mit nur einem griechischen Vers können unverändert vom allgemeinen
Erzeuger übernommen werden.
