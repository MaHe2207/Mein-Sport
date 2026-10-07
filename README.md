# Mein Sport – GitHub Pages

## Veröffentlichen
1. Den **Inhalt dieses Ordners** in die oberste Ebene eines GitHub-Repositories hochladen (`index.html` muss im Repository-Root liegen).
2. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Branch `main`, Ordner `/(root)` auswählen und speichern.
4. Die von GitHub angezeigte HTTPS-Adresse öffnen. Die PWA kann dort über die Browserfunktion „Installieren“ / „Zum Home-Bildschirm“ installiert werden.

Die App verwendet ausschließlich relative URLs. Daher funktioniert sie sowohl unter `https://BENUTZER.github.io/REPOSITORY/` als auch mit einer eigenen Domain, ohne dass der Repository-Name in den Dateien eingetragen werden muss.

## Updates
Der Service-Worker-Cache heißt aktuell `mein-sport-v2`. Bei späteren Änderungen an statischen Dateien sollte die Versionsnummer in `sw.js` erhöht werden, damit bestehende Installationen den neuen Cache sicher übernehmen.

## Daten
Sportdaten, eigene Datenfelder und Diagramm-Favoriten liegen lokal im Browser. GitHub erhält diese Daten nicht. Vor Browser-/Gerätewechsel oder dem Löschen von Websitedaten deshalb den vollständigen JSON-Export der App verwenden.
