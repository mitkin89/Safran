# Prüfung der Zeugenangaben in den Lesarten-Notizen

Die Notizen der LXX-Lesarten (`tools/lxx/readings`) und der Peschitta-Lesarten (`tools/peshitta/readings`) nannten weitere Zeugen („so auch LXX/SMR/4QSamᵃ/Targum …“) aus dem Gedächtnis der Bearbeiter. Jede solche Angabe (1 270 Notizen) wurde gegen die Daten geprüft, die Safran selbst enthält:

- LXX: CATSS-Wortgruppen und bewertete LXX-Lesarten; SMR: Tal–Florentin; Qumran: ETCBC/Abegg; hebräische Handschriften: Digital Kennicott; Peschitta: Wortzuordnung und Lesarten; Targum Onkelos, Pseudo-Jonathan, Neofiti (nur Tora).
- `evidence.js` stellt je Notiz die Belege zusammen, `supp.js` den Nachtrag (Targume der Tora, „Sam“); Regeln: `PRUEFREGELN.md`. Die Bewertung erfolgte durch Claude (2026) Notiz für Notiz.
- Ergebnis je Angabe in `status.json` (Schlüssel `Werk|Buch|Vers|Eintrag`): **bestätigt** (Angabe bleibt, einheitlich „so auch …“), **widerlegt** bzw. **nicht belegt** (Angabe gestrichen), **ungeprüft** (Zeuge ohne Daten in Safran, z. B. Targum außerhalb der Tora, Vulgata, NT-Zitate; in der Notiz als „ungeprüft“ gekennzeichnet).

Stand: 1 227 bestätigt, 36 widerlegt, 13 nicht belegt, 70 ungeprüft.
