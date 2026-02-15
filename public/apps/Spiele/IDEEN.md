# Ideen für neue Mathespiel-Apps 🎮

Dies ist eine Sammlung von Ideen für zukünftige Anwendungen innerhalb des Numo-MatheTrainers. Die Spiele können als Standalone-Apps im `public/apps/` Verzeichnis implementiert werden.

---

## 1. Singleplayer-Spiele (Fokus auf Highscore & Training)

### **Math-Runner (Endless Runner)**
*   **Konzept:** Eine Figur rennt automatisch nach rechts. Hindernisse tauchen auf, auf denen Rechenaufgaben stehen.
*   **Gameplay:** Der Spieler sieht zwei oder drei Wege mit unterschiedlichen Ergebnissen. Er muss den Weg wählen, der die richtige Lösung zur oben eingeblendeten Aufgabe zeigt.
*   **Progression:** Das Tempo wird schneller, die Aufgaben komplexer.

### **Zahlen-Sudoku (Variante)**
*   **Konzept:** Ein klassisches Sudoku, aber die "Hinweise" sind Rechenoperationen.
*   **Gameplay:** In einigen Feldern steht nicht die Zahl, sondern eine kleine Aufgabe (z.B. `√16`), deren Ergebnis eingetragen werden muss.

### **Primzahlen-Shooter**
*   **Konzept:** Zahlen fliegen wie Asteroiden auf den Spieler zu.
*   **Gameplay:** Der Spieler muss nur auf die Primzahlen schießen. Erwischt er eine zusammengesetzte Zahl, verliert er Energie – außer er hat das richtige "Zerlegungs-Projektil" gewählt.

---

## 2. Lokale Multiplayer (Ein Gerät, mehrere Spieler)

### **Mathe-Duell (Split-Screen)**
*   **Konzept:** Das Display ist in zwei Hälften geteilt. Zwei Spieler sitzen sich gegenüber.
*   **Gameplay:** In der Mitte erscheint eine Aufgabe. Wer zuerst auf das richtige Ergebnis in seiner Hälfte tippt, bekommt einen Punkt.
*   **Besonderheit:** Perfekt für Tablets geeignet.

### **Zahlen-Dart**
*   **Konzept:** Ein virtuelles Dartboard mit Zielzahlen.
*   **Gameplay:** Spieler müssen durch geschicktes Addieren/Subtrahieren/Multiplizieren ihrer "Würfe" exakt auf Null kommen (wie beim echten Dart). Mehrere Spieler wechseln sich ab.

---

## 3. Online Multiplayer (Firebase / Echtzeit)

### **Math-Bingo**
*   **Konzept:** Jeder Spieler bekommt ein zufälliges 5x5 Gitter mit Zahlen.
*   **Gameplay:** Der Host (oder Computer) ruft Aufgaben aus (z.B. "Was ist 12 mal 4?"). Wer die 48 auf seinem Feld hat, markiert sie. Wer zuerst eine Reihe voll hat, drückt den "Bingo"-Button.

### **Zahlen-Auktion**
*   **Konzept:** Spieler haben ein Budget an Punkten und müssen auf Zahlen "bieten", um eine Zielsumme zu erreichen.
*   **Gameplay:** Wer am Ende die beste Kombination aus ersteigerten Zahlen hat, um eine Zielvorgabe zu erreichen, gewinnt die Runde.

---

## 4. Strategie & Rätsel

### **Gleichungs-Brücke**
*   **Konzept:** Der Spieler muss eine Brücke über einen Abgrund bauen.
*   **Gameplay:** Jedes Brückenteil hat einen Wert. Die Brücke hält nur, wenn die Summe oder das Produkt der Teile einer bestimmten statischen Vorgabe entspricht.

### **Code-Breaker**
*   **Konzept:** Ein Escape-Room-Szenario.
*   **Gameplay:** Um Türen zu öffnen, müssen mathematische Rätsel gelöst werden (Zahlenfolgen logisch fortsetzen, magische Quadrate ausfüllen).
