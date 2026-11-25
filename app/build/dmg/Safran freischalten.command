#!/bin/bash
# Entfernt die Download-Markierung von Safran, damit macOS die App öffnet
APP="/Applications/Safran.app"
if [ ! -d "$APP" ]; then
  osascript -e 'display dialog "Bitte zuerst Safran in den Ordner Programme ziehen und dann dieses Skript noch einmal starten.\n\nPlease drag Safran into the Applications folder first, then run this script again." buttons {"OK"} with icon caution' >/dev/null
  exit 1
fi
xattr -cr "$APP" && osascript -e 'display dialog "Fertig! Safran kann jetzt ganz normal geöffnet werden.\n\nDone! You can now open Safran as usual." buttons {"OK"}' >/dev/null
