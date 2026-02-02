# Anleitung für Trio - Das Mathespiel

Willkommen bei **Trio**, dem ultimativen Mathe-Battle! Hier geht es um Kopfrechnen, Schnelligkeit und strategisches Denken. Diese Anleitung erklärt dir alle Funktionen, Einstellungen und Regeln der App.

---

## 1. Das Spielprinzip

**Kurzfassung:** Finde 3 Zahlen im Gitter, die du zu einer vorgegebenen Zielzahl verrechnen kannst!

Hier ist der genaue Ablauf einer Spielrunde Schritt für Schritt erklärt:

### Schritt 1: Das Ziel erkennen 🎯
Oben in der Mitte steht groß die **Zielzahl** (z.B. **24**).
Deine Aufgabe ist es, drei Zahlen im Gitter zu finden, mit denen du genau dieses Ergebnis errechnen kannst.

### Schritt 2: Ein "Trio" finden (Das Muster) 🔍
Du darfst nicht irgendwelche Zahlen wählen! Die drei Zahlen müssen ein **geometrisches Muster** bilden.
Das ist die wichtigste Regel im Spiel. Ein gültiges Trio liegt immer auf einer **geraden Linie**.

**Die 3 Regeln für die Auswahl:**
1.  **Linie:** Horizontal (waagerecht), Vertikal (senkrecht) oder Diagonal.
2.  **Abstand:** Die Abstände zwischen den Zahlen müssen **gleichmäßig** sein (Äquidistanz).
3.  **Anzahl:** Es müssen genau 3 Zahlen sein.

#### Visualisierung der gültigen Muster:

**(A) Direkt nebeneinander (Abstand 0)**
Die einfachste Variante. 3 Zahlen direkt nebeneinander.
```text
✅ GÜLTIG: Waagerecht
+---+---+---+
| 3 | 5 | 2 |
+---+---+---+
```

**(B) Mit Lücken (Abstand 1 oder mehr)**
Du kannst Zahlen überspringen, solange du *immer gleich viele* überspringst.
```text
✅ GÜLTIG: Senkrecht
+---+
| 7 |
+---+
| 4 |
+---+
| 9 |
+---+
```

**(C) Diagonal**
Auch quer über das Feld ist erlaubt, solange die Abstände stimmen.
```text
✅ GÜLTIG: Diagonal
+---+---+---+
| 1 | . | . |
+---+---+---+
| . | 5 | . |
+---+---+---+
| . | . | 8 |
+---+---+---+
```

❌ **UNGÜLTIG - Das geht NICHT:**
*   **Keine Linie:** "L-Formen", "Dreiecke" oder krumme Linien, Abstand zwischen den Zahlen sind verboten.
*   **Ungleiche Abstände:** Z.B. erst direkt daneben, dann eine Lücke (`[2][4]...[8]`) -> Verboten!

---

### Schritt 3: Buzzern! 🚨
Sobald du ein Trio im Kopf hast, drücke sofort den roten **"TRIO!"-Buzzer**.
*   Das Spiel stoppt für alle anderen.
*   Du hast jetzt **10 Sekunden Zeit**, deine Zahlen auf dem Feld anzutippen.
*   *Tipp:* Buzzer erst, wenn du dir sicher bist! Ein falscher Buzzer gibt eine Zeitsperre.

### Schritt 4: Auswählen 👆
Tippe die drei gefundenen Zahlen auf dem Spielfeld an.
*   Die Reihenfolge, in der du sie antippst, ist egal.
*   Das Spiel prüft automatisch, ob sie geometrisch korrekt (Linie & Abstand) liegen.
*   Gültige Zahlen werden **grün** markiert.

### Schritt 5: Rechnen 🧮
Ein Taschenrechner öffnet sich.
*   Du siehst deine 3 ausgewählten Zahlen als große Buttons.
*   **Aufgabe:** Baue eine Rechnung, die exakt die Zielzahl ergibt.
*   **Regel:** Du musst **alle drei** Zahlen verwenden! Jede Zahl genau einmal.

**Beispiel:**
*   Zielzahl: **10**
*   Gewählte Zahlen: **2, 3, 4**
*   Mögliche Rechnung: `3 · 4 - 2 = 10` ✅

Sobald du `=` drückst, wird geprüft:
*   Ergebnis richtig? -> **Punkt für dich!** 🎉 Du bekommst den Punkt und eine neue Runde startet.
*   Ergebnis falsch? -> **Fehler!** ⛔ Du wirst für kurze Zeit gesperrt, die anderen dürfen weitersuchen.

---

## 2. Einstellungen & Konfiguration
Bevor ein Spiel startet, kann der Host (der "Spiel-Ersteller") verschiedene Einstellungen vornehmen:

### Haupt-Einstellungen
*   **Schwierigkeit:** Bestimmt, welche Rechenoperationen erlaubt sind (siehe Abschnitt "Schwierigkeitsstufen").
*   **Zahlenraum:**
    *   **1-9 (Ziel bis 50):** Im Gitter kommen nur die Ziffern 1 bis 9 vor. Die Zielzahl ist maximal 50. Ideal für Einsteiger und Grundschule.
    *   **1-20 (Ziel bis 100):** Im Gitter stehen Zahlen bis 20. Die Zielzahl kann bis zu 100 betragen. Für Fortgeschrittene.
*   **Gittergröße:**
    *   **5x5 (Klein):** Weniger Zahlen, übersichtlicher.
    *   **7x7 (Standard):** Die normale Größe.
    *   **9x9 (Groß):** Sehr viele Möglichkeiten, für Profis.
*   **Siegpunkte:** Wie viele Runden muss man gewinnen? (Standard: 10).
*   **Hardcore Modus 🔥:**
    *   Ist dieser Modus aktiv, wird dir bei einer **falschen Antwort ein Punkt abgezogen**!
    *   Ohne Hardcore-Modus passiert nichts (außer einer Zeitsperre).

### Lehrer / Host Funktionen
*   **Beobachten erlauben (Live-Übertragung):**
    *   Wenn aktiviert, können alle anderen Spieler auf ihren Bildschirmen live sehen, was der aktive Spieler gerade in den Taschenrechner eingibt.
    *   Ideal für den Unterricht ("Lösung zeigen").

---

## 3. Schwierigkeitsstufen & Regeln
Hier sind die genauen Regeln für die Formeln. Du darfst immer **nur** die drei ausgewählten Zahlen verwenden.

> **Wichtig:** In allen Modi darfst du keine negativen Zwischenergebnisse als Startzahl haben (z.B. `-5 + ...` ist verboten).

### 🟢 Normal (Einsteiger)
*   **Erlaubte Zeichen:** Plus (`+`), Minus (`-`), Mal (`·`).
*   **Regel:** Es muss **genau eine Mal-Rechnung** (`·`) und **genau eine Strich-Rechnung** (`+` oder `-`) vorkommen.
*   **Beispiele (Zahlen: 3, 4, 5 | Ziel: 17):**
    *   `3 · 4 + 5 = 17` ✅ (Richtig: Ein Mal, ein Plus)
    *   `5 · 4 - 3 = 17` ✅ (Richtig: Ein Mal, ein Minus)
    *   `3 + 4 + 5` ❌ (Falsch: Keine Mal-Rechnung)
    *   `3 · 4 · 5` ❌ (Falsch: Keine Strich-Rechnung)

### 🟡 Fortgeschritten
*   **Erlaubte Zeichen:** Plus (`+`), Minus (`-`), Geteilt (`:`).
*   **Regel:** Es muss **genau eine Geteilt-Rechnung** (`:`) und **genau eine Strich-Rechnung** (`+` oder `-`) vorkommen.
*   **Beispiele (Zahlen: 8, 4, 2 | Ziel: 4):**
    *   `8 : 4 + 2 = 4` ✅
    *   `8 : 2 - 4 = 0` ✅ (Gültige Formel, auch wenn Ziel 0 wäre)
    *   `8 - 4 : 2 = 6` ✅ (Punkt vor Strich wird automatisch beachtet!)

### 🔴 Profi (Experten)
*   **Erlaubte Zeichen:** Alle (`+`, `-`, `·`, `:`, `(`, `)`).
*   **Regel:**
    1.  Du **MUSST Klammern** `( )` verwenden.
    2.  Du musst eine Punktrechnung (`·` oder `:`) und eine Strichrechnung (`+` oder `-`) kombinieren.
    3.  **WICHTIG:** Die Punktrechnung darf **NICHT** in der Klammer stehen! Die Klammer muss eine Summe oder Differenz schützen, die dann mal- oder geteilt-gerechnet wird.
*   **Struktur:** `(Strichrechnung) · Zahl` oder `Zahl · (Strichrechnung)`.
*   **Beispiele (Zahlen: 3, 4, 5 | Ziel: 35):**
    *   `( 3 + 4 ) · 5 = 35` ✅ (Klammer um Plus, dann Mal)
    *   `5 · ( 4 + 3 ) = 35` ✅
    *   `( 3 · 4 ) + 5` ❌ (Falsch: Punktrechnung in der Klammer ist verboten!)
    *   `3 · 4 + 5` ❌ (Falsch: Keine Klammern)

### 🟣 Verrückt (Crazy Mode)
*   Hier ist **alles erlaubt**.
*   **Punktesystem:**
    *   Baust du eine **Profi-Formel**: 3 Punkte.
    *   Baust du eine **Fortgeschrittenen-Formel**: 2 Punkte.
    *   Baust du eine **Normale Formel**: 1 Punkt.

---

## 4. Strafen & Fehlversuche
*   **Falsche Rechnung:** Wenn dein Ergebnis nicht stimmt oder die Formel-Regeln verletzt wurden (z.B. Klammer vergessen im Profi-Modus).
    *   Die Runde endet sofort.
    *   Du bekommst eine **30-Sekunden-Sperre** (Buzzer ist gesperrt).
    *   Im **Hardcore-Modus**: Du verlierst zusätzlich 1 Punkt!
*   **Zu langsam:** Wenn du nach dem Buzzern nicht innerhalb von 10 Sekunden deine 3 Zahlen wählst.
    *   20-Sekunden-Sperre.

---

## 5. Tipps zur App (Funktionen)
*   **Installation (PWA):** Du kannst die App auf deinem Handy oder PC installieren ("Zum Home-Bildschirm hinzufügen"). Das ermöglicht Vollbild und ist schneller.
*   **QR-Code:** Im Lobby-Bereich gibt es einen QR-Code. Freunde können diesen direkt mit ihrer Handy-Kamera scannen, um deinem Spiel beizutreten.
*   **Querformat:** Die App ist für das Querformat (Landscape) optimiert. Bitte drehe dein Gerät.
