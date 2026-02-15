export interface ProblemTemplate {
  id: string;
  text: string;
  answerPrompt: string;
  formula: (vars: Record<string, number>) => number;
  ranges: Record<string, [number, number]>;
}

export type Difficulty = 'normal' | 'advanced' | 'profi';

export const templates: Record<Difficulty, ProblemTemplate[]> = {
  normal: [
    // --- Einkaufen & Kosten (Multiplikation) ---
    { id: 'n1', text: '{n} Freunde kaufen sich jeder ein Eis für {a} Fr. Wie viel bezahlen sie zusammen?', answerPrompt: 'Preis:', formula: (v) => v.n * v.a, ranges: { n: [3, 8], a: [2, 5] } },
    { id: 'n2', text: 'Du kaufst {n} Hefte für die Schule. Ein Heft kostet {a} Fr. Was kosten alle zusammen?', answerPrompt: 'Preis:', formula: (v) => v.n * v.a, ranges: { n: [2, 6], a: [2, 5] } },
    { id: 'n3', text: 'Eine Packung Kaugummi kostet {a} Fr. Tim kauft {n} Packungen. Wie viel muss er bezahlen?', answerPrompt: 'Preis:', formula: (v) => v.n * v.a, ranges: { n: [3, 9], a: [1, 3] } },
    { id: 'n4', text: 'Im Sportunterricht werden {n} Teams gebildet. In jedem Team sind {a} Kinder. Wie viele Kinder sind es?', answerPrompt: 'Anzahl:', formula: (v) => v.n * v.a, ranges: { n: [2, 5], a: [4, 8] } },
    { id: 'n5', text: 'Ein Bauer hat {n} Kühe. Jede Kuh gibt {a} Liter Milch. Wie viel Liter sind das?', answerPrompt: 'Liter:', formula: (v) => v.n * v.a, ranges: { n: [5, 10], a: [10, 20] } },
    { id: 'n6', text: 'Das Riesenrad hat {n} Gondeln. In jede passen {a} Personen. Wie viele können mitfahren?', answerPrompt: 'Personen:', formula: (v) => v.n * v.a, ranges: { n: [10, 20], a: [4, 6] } },
    { id: 'n7', text: 'Oma strickt {n} Paar Socken. Für jedes Paar braucht sie {a} Knäuel Wolle. Wie viele Knäuel braucht sie?', answerPrompt: 'Knäuel:', formula: (v) => v.n * v.a, ranges: { n: [3, 6], a: [2, 3] } },
    { id: 'n8', text: 'Ein Regal hat {n} Fächer. In jedem Fach stehen {a} Bücher. Wie viele Bücher sind es?', answerPrompt: 'Bücher:', formula: (v) => v.n * v.a, ranges: { n: [4, 8], a: [5, 10] } },
    { id: 'n9', text: 'Für ein Spiel braucht jeder Spieler {a} Karten. Es spielen {n} Kinder mit. Wie viele Karten werden verteilt?', answerPrompt: 'Karten:', formula: (v) => v.n * v.a, ranges: { n: [3, 6], a: [5, 7] } },
    { id: 'n10', text: 'Ein Auto hat {a} Reifen. Auf dem Parkplatz stehen {n} Autos. Wie viele Reifen sind das?', answerPrompt: 'Reifen:', formula: (v) => v.n * v.a, ranges: { n: [5, 12], a: [4, 4] } },

    // --- Restgeld & Unterschiede (Subtraktion) ---
    { id: 'n11', text: 'Lukas hat {a} Fr. Taschengeld. Er kauft ein Buch für {b} Fr. Wie viel Geld hat er noch?', answerPrompt: 'Rest:', formula: (v) => v.a - v.b, ranges: { a: [20, 50], b: [5, 15] } },
    { id: 'n12', text: 'In einer Klasse sind {a} Kinder. Heute sind {b} krank. Wie viele sind in der Schule?', answerPrompt: 'Anzahl:', formula: (v) => v.a - v.b, ranges: { a: [18, 28], b: [1, 5] } },
    { id: 'n13', text: 'Ein Bus hat {a} Sitzplätze. {b} Plätze sind schon besetzt. Wie viele sind noch frei?', answerPrompt: 'Freie Plätze:', formula: (v) => v.a - v.b, ranges: { a: [40, 60], b: [10, 30] } },
    { id: 'n14', text: 'Das Buch hat {a} Seiten. Tom hat schon {b} Seiten gelesen. Wie viele fehlen noch?', answerPrompt: 'Seiten:', formula: (v) => v.a - v.b, ranges: { a: [100, 200], b: [20, 80] } },
    { id: 'n15', text: 'Beim Fußballspiel sind {a} Zuschauer. {b} davon sind Fans der Gastmannschaft. Wie viele Heimfans sind da?', answerPrompt: 'Heimfans:', formula: (v) => v.a - v.b, ranges: { a: [500, 1000], b: [100, 300] } },
    { id: 'n16', text: 'Der Turm ist {a} Meter hoch. Der Baum daneben ist {b} Meter niedriger. Wie hoch ist der Baum?', answerPrompt: 'Höhe:', formula: (v) => v.a - v.b, ranges: { a: [20, 50], b: [5, 15] } },
    { id: 'n17', text: 'In der Kiste sind {a} Äpfel. {b} davon sind grün, der Rest ist rot. Wie viele rote Äpfel sind es?', answerPrompt: 'Rote Äpfel:', formula: (v) => v.a - v.b, ranges: { a: [20, 40], b: [5, 15] } },
    { id: 'n18', text: 'Papa ist {a} Jahre alt. Sein Sohn ist {b} Jahre jünger. Wie alt ist der Sohn?', answerPrompt: 'Alter:', formula: (v) => v.a - v.b, ranges: { a: [30, 50], b: [20, 30] } },
    { id: 'n19', text: 'Die Wanderung ist {a} km lang. Wir sind schon {b} km gelaufen. Wie weit müssen wir noch?', answerPrompt: 'Kilometer:', formula: (v) => v.a - v.b, ranges: { a: [10, 20], b: [2, 8] } },
    { id: 'n20', text: 'Du hast {a} Punkte im Spiel gesammelt. Für einen Fehler werden {b} Punkte abgezogen. Wie viele hast du noch?', answerPrompt: 'Punkte:', formula: (v) => v.a - v.b, ranges: { a: [50, 100], b: [5, 20] } },

    // --- Addition (Summen) ---
    { id: 'n21', text: 'Auf der Weide stehen {a} Kühe, {b} Pferde und {c} Schafe. Wie viele Tiere sind es?', answerPrompt: 'Tiere:', formula: (v) => v.a + v.b + v.c, ranges: { a: [5, 15], b: [2, 8], c: [10, 20] } },
    { id: 'n22', text: 'Lisa spart Geld. Sie hat {a} Fr. von Oma, {b} Fr. von Opa und {c} Fr. gefunden. Wie viel hat sie?', answerPrompt: 'Summe:', formula: (v) => v.a + v.b + v.c, ranges: { a: [10, 50], b: [10, 50], c: [2, 10] } },
    { id: 'n23', text: 'Für den Salat brauchst du {a} Tomaten, {b} Gurken und {c} Paprika. Wie viel Gemüse ist das?', answerPrompt: 'Stück:', formula: (v) => v.a + v.b + v.c, ranges: { a: [2, 6], b: [1, 3], c: [1, 4] } },
    { id: 'n24', text: 'In der 4a sind {a} Kinder, in der 4b sind {b} Kinder und in der 4c sind {c} Kinder. Wie viele Viertklässler gibt es?', answerPrompt: 'Kinder:', formula: (v) => v.a + v.b + v.c, ranges: { a: [18, 25], b: [18, 25], c: [18, 25] } },
    { id: 'n25', text: 'Der LKW lädt {a} Kisten Bananen, {b} Kisten Äpfel und {c} Kisten Orangen. Wie viele Kisten insgesamt?', answerPrompt: 'Kisten:', formula: (v) => v.a + v.b + v.c, ranges: { a: [20, 50], b: [20, 50], c: [20, 50] } },
    { id: 'n26', text: 'Am Montag lief Lea {a} km, am Dienstag {b} km und am Mittwoch {c} km. Wie weit lief sie insgesamt?', answerPrompt: 'Gesamtstrecke:', formula: (v) => v.a + v.b + v.c, ranges: { a: [2, 8], b: [2, 8], c: [2, 8] } },
    { id: 'n27', text: 'Im Mäppchen sind {a} Buntstifte, {b} Filzstifte und {c} Bleistifte. Wie viele Stifte sind das?', answerPrompt: 'Stifte:', formula: (v) => v.a + v.b + v.c, ranges: { a: [5, 12], b: [5, 10], c: [2, 5] } },
    { id: 'n28', text: 'Papa kauft ein Hemd für {a} Fr., eine Hose für {b} Fr. und Socken für {c} Fr. Was kostet alles?', answerPrompt: 'Preis:', formula: (v) => v.a + v.b + v.c, ranges: { a: [30, 60], b: [40, 80], c: [5, 15] } },
    { id: 'n29', text: 'Auf dem Parkplatz stehen {a} rote, {b} blaue und {c} schwarze Autos. Wie viele Autos?', answerPrompt: 'Autos:', formula: (v) => v.a + v.b + v.c, ranges: { a: [10, 30], b: [10, 30], c: [10, 30] } },
    { id: 'n30', text: 'Für die Party werden {a} Flaschen Cola, {b} Flaschen Limo und {c} Flaschen Wasser gekauft. Wie viele Flaschen?', answerPrompt: 'Flaschen:', formula: (v) => v.a + v.b + v.c, ranges: { a: [5, 10], b: [5, 10], c: [5, 10] } },

    // --- Gemischte einfache Aufgaben (Punkt vor Strich Ansätze) ---
    { id: 'n31', text: 'Ein Taxi kostet {a} Fr. Startgebühr und dann {b} Fr. pro km. Die Fahrt ist {n} km lang.', answerPrompt: 'Kosten:', formula: (v) => v.a + v.b * v.n, ranges: { a: [5, 10], b: [2, 4], n: [3, 10] } },
    { id: 'n32', text: 'Du hast {a} Fr. und sparst jede Woche {b} Fr. dazu. Wie viel hast du nach {n} Wochen?', answerPrompt: 'Geld:', formula: (v) => v.a + v.b * v.n, ranges: { a: [20, 50], b: [5, 10], n: [4, 12] } },
    { id: 'n33', text: 'Ein Abo kostet {a} Fr. pro Monat. Dazu kommt eine einmalige Gebühr von {b} Fr. Was kosten {n} Monate?', answerPrompt: 'Gesamtkosten:', formula: (v) => v.b + v.a * v.n, ranges: { a: [10, 20], b: [20, 40], n: [6, 12] } },
    { id: 'n34', text: 'Die Pflanze ist {a} cm hoch. Sie wächst jede Woche {b} cm. Wie hoch ist sie nach {n} Wochen?', answerPrompt: 'Höhe:', formula: (v) => v.a + v.b * v.n, ranges: { a: [10, 30], b: [2, 5], n: [4, 8] } },
    { id: 'n35', text: 'Ein Handwerker nimmt {a} Fr. für die Anfahrt und {b} Fr. pro Stunde. Er arbeitet {n} Stunden.', answerPrompt: 'Rechnung:', formula: (v) => v.a + v.b * v.n, ranges: { a: [30, 50], b: [40, 60], n: [2, 5] } },
    { id: 'n36', text: 'In der Dose sind {a} Kekse. Du legst {n} Tage lang jeden Tag {b} neue Kekse dazu. Wie viele sind es dann?', answerPrompt: 'Kekse:', formula: (v) => v.a + v.b * v.n, ranges: { a: [5, 10], b: [2, 4], n: [3, 7] } },
    { id: 'n37', text: 'Der Tank enthält {a} Liter. Das Auto verbraucht {b} Liter pro 100km. Es fährt {n} mal 100km. Rest?', answerPrompt: 'Liter:', formula: (v) => v.a - v.b * v.n, ranges: { a: [50, 80], b: [5, 8], n: [2, 5] } },
    { id: 'n38', text: 'Du hast {a} Sticker. Du verschenkst an {n} Freunde je {b} Sticker. Wie viele bleiben dir?', answerPrompt: 'Rest:', formula: (v) => v.a - v.n * v.b, ranges: { a: [20, 50], n: [2, 5], b: [2, 4] } },
    { id: 'n39', text: 'Auf dem Konto sind {a} Fr. Jeden Monat werden {b} Fr. für das Handy abgebucht. Stand nach {n} Monaten?', answerPrompt: 'Kontostand:', formula: (v) => v.a - v.b * v.n, ranges: { a: [100, 200], b: [10, 20], n: [3, 6] } },
    { id: 'n40', text: 'Eine Rolle hat {a} Meter Stoff. Für ein Kleid braucht man {b} Meter. Es werden {n} Kleider genäht. Rest?', answerPrompt: 'Reststoff:', formula: (v) => v.a - v.b * v.n, ranges: { a: [20, 50], b: [2, 4], n: [3, 5] } },

    // --- Division (Teilen) ---
    { id: 'n41', text: '{a} Bonbons werden gerecht an {n} Kinder verteilt. Wie viele bekommt jedes Kind?', answerPrompt: 'Bonbons:', formula: (v) => v.a / v.n, ranges: { a: [12, 48], n: [2, 6] } }, // Ranges so wählen dass teilbar? Generator prüft Integer!
    { id: 'n42', text: 'Ein Gewinn von {a} Fr. wird auf {n} Spieler aufgeteilt. Gewinn pro Spieler?', answerPrompt: 'Gewinn:', formula: (v) => v.a / v.n, ranges: { a: [100, 1000], n: [2, 5] } },
    { id: 'n43', text: 'Du hast {a} Fotos gemacht. Auf jede Seite im Album passen {n} Fotos. Wie viele Seiten brauchst du?', answerPrompt: 'Seiten:', formula: (v) => v.a / v.n, ranges: { a: [20, 60], n: [4, 6] } },
    { id: 'n44', text: '{a} Liter Saft werden in {n} Flaschen abgefüllt. Wie viel Liter sind in einer Flasche?', answerPrompt: 'Liter:', formula: (v) => v.a / v.n, ranges: { a: [10, 50], n: [2, 10] } },
    { id: 'n45', text: 'Eine Strecke von {a} km wird in {n} Tagen gewandert. Wie viel km pro Tag?', answerPrompt: 'Km pro Tag:', formula: (v) => v.a / v.n, ranges: { a: [40, 100], n: [4, 10] } },
    { id: 'n46', text: '{a} Eier werden in Kartons zu je {n} Stück verpackt. Wie viele Kartons?', answerPrompt: 'Kartons:', formula: (v) => v.a / v.n, ranges: { a: [24, 60], n: [6, 12] } },
    { id: 'n47', text: 'Für ein Spiel werden {a} Karten an {n} Spieler verteilt. Wie viele Karten pro Spieler?', answerPrompt: 'Karten:', formula: (v) => v.a / v.n, ranges: { a: [32, 52], n: [4, 4] } },
    { id: 'n48', text: '{a} Schüler werden in {n} Gruppen eingeteilt. Wie viele Schüler pro Gruppe?', answerPrompt: 'Schüler:', formula: (v) => v.a / v.n, ranges: { a: [18, 30], n: [2, 6] } },
    { id: 'n49', text: 'Ein Seil von {a} Metern wird in {n} gleich lange Stücke geschnitten. Länge eines Stücks?', answerPrompt: 'Länge:', formula: (v) => v.a / v.n, ranges: { a: [10, 50], n: [2, 5] } },
    { id: 'n50', text: 'Opa verteilt {a} Fr. an seine {n} Enkel. Wie viel bekommt jeder?', answerPrompt: 'Geld:', formula: (v) => v.a / v.n, ranges: { a: [50, 200], n: [2, 5] } },
  ],

  advanced: [
    // --- Distributivgesetz (Klammern: n * (a+b)) ---
    { id: 'a1', text: '{n} Freunde gehen ins Kino. Ticket kostet {a} Fr., Popcorn {b} Fr. Wie viel zahlen sie zusammen?', answerPrompt: 'Summe:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [3, 6], a: [12, 18], b: [5, 8] } },
    { id: 'a2', text: 'Eine Familie mit {n} Personen geht essen. Jeder bestellt Pizza für {a} Fr. und ein Getränk für {b} Fr.', answerPrompt: 'Rechnung:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [3, 6], a: [15, 25], b: [4, 6] } },
    { id: 'a3', text: '{n} Schüler kaufen Hefte. Ein Schreibheft kostet {a} Fr., ein Rechenheft {b} Fr. Jeder kauft beides.', answerPrompt: 'Kosten:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [10, 25], a: [2, 4], b: [2, 4] } },
    { id: 'a4', text: 'Du packst {n} Geschenktüten. In jede kommen {a} Schokoriegel und {b} Lollis. Wie viele Süßigkeiten insgesamt?', answerPrompt: 'Anzahl:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [4, 10], a: [2, 5], b: [2, 5] } },
    { id: 'a5', text: 'Ein Bauer pflanzt {n} Reihen Bäume. Pro Reihe sind es {a} Apfelbäume und {b} Birnbäume.', answerPrompt: 'Bäume:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [5, 10], a: [5, 10], b: [5, 10] } },
    { id: 'a6', text: 'In {n} Klassenzimmern werden je {a} Tische und {b} Stühle ausgetauscht. Wie viele Möbelstücke sind das?', answerPrompt: 'Möbel:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [3, 8], a: [10, 15], b: [20, 30] } },
    { id: 'a7', text: '{n} Kinder basteln Laternen. Jedes Kind braucht {a} Blatt Papier und {b} Klebestreifen.', answerPrompt: 'Material:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [15, 25], a: [2, 4], b: [4, 8] } },
    { id: 'a8', text: 'Für den Ausflug zahlen {n} Teilnehmer je {a} Fr. Fahrtkosten und {b} Fr. Eintritt.', answerPrompt: 'Gesamtkosten:', formula: (v) => v.n * (v.a + v.b), ranges: { n: [10, 40], a: [10, 20], b: [5, 15] } },
    { id: 'a9', text: 'Ein Set besteht aus {a} großen und {b} kleinen Tellern. Wir kaufen {n} Sets.', answerPrompt: 'Teller:', formula: (v) => v.n * (v.a + v.b), ranges: { a: [6, 12], b: [6, 12], n: [2, 5] } },
    { id: 'a10', text: 'Jeden Tag läufst du {a} km hin und {b} km zurück. Wie viele km in {n} Tagen?', answerPrompt: 'Strecke:', formula: (v) => v.n * (v.a + v.b), ranges: { a: [2, 5], b: [2, 5], n: [5, 7] } },

    // --- Lineare Kombination (n*a + m*b) ---
    { id: 'a11', text: 'Im Korb sind {n} Packungen Nudeln à {a} Fr. und {m} Gläser Soße à {b} Fr. Preis?', answerPrompt: 'Summe:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [2, 5], a: [2, 4], m: [2, 5], b: [3, 6] } },
    { id: 'a12', text: 'Eintritt: {n} Erwachsene zahlen {a} Fr., {m} Kinder zahlen {b} Fr.', answerPrompt: 'Einnahmen:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [2, 4], a: [15, 20], m: [2, 5], b: [8, 12] } },
    { id: 'a13', text: 'Wir kaufen {n} Kisten Wasser ({a} Fr.) und {m} Kisten Saft ({b} Fr.).', answerPrompt: 'Rechnung:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [3, 6], a: [5, 8], m: [2, 4], b: [10, 15] } },
    { id: 'a14', text: '{n} Stunden Arbeit kosten {a} Fr./Std. Dazu kommen {m} km Anfahrt für {b} Fr./km.', answerPrompt: 'Kosten:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [2, 5], a: [50, 80], m: [10, 30], b: [1, 2] } },
    { id: 'a15', text: 'Im Stall stehen {n} Pferde ({a} Beine) und {m} Hühner ({b} Beine). Wie viele Beine?', answerPrompt: 'Beine:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [3, 8], a: [4, 4], m: [5, 10], b: [2, 2] } },
    { id: 'a16', text: '{n} Tische mit {a} Plätzen und {m} Tische mit {b} Plätzen. Wie viele Plätze total?', answerPrompt: 'Plätze:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [5, 10], a: [4, 4], m: [2, 5], b: [6, 8] } },
    { id: 'a17', text: 'Du kaufst {n} Äpfel für {a} Rappen und {m} Birnen für {b} Rappen.', answerPrompt: 'Preis (Rp):', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [3, 6], a: [50, 80], m: [3, 6], b: [60, 90] } },
    { id: 'a18', text: 'Der LKW wiegt leer {a} kg. Er lädt {n} Kisten zu je {b} kg. Gesamtgewicht?', answerPrompt: 'Gewicht:', formula: (v) => v.a + v.n * v.b, ranges: { a: [2000, 3000], n: [10, 50], b: [20, 50] } }, // a ist hier Startwert
    { id: 'a19', text: 'Du sparst {n} Monate lang {a} Fr. und {m} Monate lang {b} Fr.', answerPrompt: 'Gespartes:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [3, 6], a: [10, 20], m: [3, 6], b: [20, 30] } },
    { id: 'a20', text: 'Sportfest: {n} Goldmedaillen ({a} Punkte) und {m} Silbermedaillen ({b} Punkte).', answerPrompt: 'Punkte:', formula: (v) => v.n * v.a + v.m * v.b, ranges: { n: [2, 5], a: [10, 10], m: [3, 6], b: [5, 5] } },

    // --- Schrittweise Änderungen (n - a + b) ---
    { id: 'a21', text: 'Im Bus sind {n} Leute. {a} steigen aus, {b} steigen ein. Wie viele jetzt?', answerPrompt: 'Personen:', formula: (v) => v.n - v.a + v.b, ranges: { n: [20, 40], a: [5, 10], b: [2, 8] } },
    { id: 'a22', text: 'Auf dem Konto sind {n} Fr. Du hebst {a} Fr. ab und zahlst später {b} Fr. ein.', answerPrompt: 'Kontostand:', formula: (v) => v.n - v.a + v.b, ranges: { n: [100, 500], a: [50, 100], b: [20, 80] } },
    { id: 'a23', text: 'Im Lager sind {n} Kisten. {a} werden verkauft, {b} neue werden geliefert.', answerPrompt: 'Bestand:', formula: (v) => v.n - v.a + v.b, ranges: { n: [50, 100], a: [10, 30], b: [20, 40] } },
    { id: 'a24', text: 'Die Temperatur war {n} Grad. Sie fiel um {a} Grad und stieg dann um {b} Grad.', answerPrompt: 'Temperatur:', formula: (v) => v.n - v.a + v.b, ranges: { n: [10, 25], a: [2, 8], b: [1, 5] } },
    { id: 'a25', text: 'Du hast {n} Sticker. Du tauschst {a} weg und bekommst {b} neue dafür.', answerPrompt: 'Sticker:', formula: (v) => v.n - v.a + v.b, ranges: { n: [30, 60], a: [5, 15], b: [5, 15] } },
    { id: 'a26', text: 'Tankinhalt {n} Liter. Fahrt verbraucht {a} Liter. Dann tankst du {b} Liter nach.', answerPrompt: 'Inhalt:', formula: (v) => v.n - v.a + v.b, ranges: { n: [20, 40], a: [10, 15], b: [20, 30] } },
    { id: 'a27', text: 'Ein Spielstand von {n} Punkten. Du verlierst {a}, gewinnst dann {b}.', answerPrompt: 'Punkte:', formula: (v) => v.n - v.a + v.b, ranges: { n: [50, 100], a: [10, 30], b: [20, 50] } },
    { id: 'a28', text: 'Im Teich sind {n} Fische. Der Reiher frisst {a}, dafür werden {b} neue eingesetzt.', answerPrompt: 'Fische:', formula: (v) => v.n - v.a + v.b, ranges: { n: [20, 50], a: [2, 5], b: [10, 20] } },
    { id: 'a29', text: 'Auf dem Parkplatz: {n} Autos. {a} fahren weg, {b} kommen dazu.', answerPrompt: 'Autos:', formula: (v) => v.n - v.a + v.b, ranges: { n: [50, 100], a: [10, 20], b: [5, 15] } },
    { id: 'a30', text: 'Geldbeutel: {n} Fr. Du kaufst Eis für {a} Fr. und findest dann {b} Fr.', answerPrompt: 'Geld:', formula: (v) => v.n - v.a + v.b, ranges: { n: [10, 20], a: [2, 5], b: [1, 2] } },

    // --- Rückgeld mit Mengen (a - n*b) ---
    { id: 'a31', text: 'Du bezahlst mit {a} Fr. Du kaufst {n} Hefte für je {b} Fr. Rückgeld?', answerPrompt: 'Rückgeld:', formula: (v) => v.a - v.n * v.b, ranges: { a: [20, 50], n: [3, 6], b: [2, 5] } },
    { id: 'a32', text: 'Ein Gutschein über {a} Fr. Wir kaufen {n} Tickets zu {b} Fr. Restwert?', answerPrompt: 'Restwert:', formula: (v) => v.a - v.n * v.b, ranges: { a: [50, 100], n: [2, 4], b: [10, 20] } },
    { id: 'a33', text: 'Der Tank fasst {a} Liter. Es sind noch {n} Kanister à {b} Liter Platz. Wie viel ist drin?', answerPrompt: 'Aktuell drin:', formula: (v) => v.a - v.n * v.b, ranges: { a: [60, 80], n: [2, 4], b: [5, 10] } }, // etwas tricky formuliert
    { id: 'a34', text: 'Du hast {a} Minuten Zeit. Du brauchst für {n} Aufgaben je {b} Minuten. Restzeit?', answerPrompt: 'Zeit:', formula: (v) => v.a - v.n * v.b, ranges: { a: [45, 60], n: [3, 6], b: [3, 6] } },
    { id: 'a35', text: 'Stoffrolle mit {a} Metern. Es werden {n} Tischdecken à {b} Meter abgeschnitten.', answerPrompt: 'Rest:', formula: (v) => v.a - v.n * v.b, ranges: { a: [20, 50], n: [2, 5], b: [2, 4] } },
    { id: 'a36', text: 'Budget {a} Fr. Die Klasse kauft {n} Bücher für je {b} Fr. Rest?', answerPrompt: 'Rest:', formula: (v) => v.a - v.n * v.b, ranges: { a: [100, 200], n: [5, 10], b: [8, 15] } },
    { id: 'a37', text: '{a} kg Mehl im Sack. Der Bäcker bäckt {n} Brote mit je {b} kg Mehl. Rest?', answerPrompt: 'Mehl:', formula: (v) => v.a - v.n * v.b, ranges: { a: [25, 50], n: [10, 20], b: [1, 1] } },
    { id: 'a38', text: '{a} Plätze im Kino. {n} Reihen mit je {b} Plätzen sind gesperrt. Verfügbar?', answerPrompt: 'Plätze:', formula: (v) => v.a - v.n * v.b, ranges: { a: [200, 300], n: [2, 5], b: [10, 20] } },
    { id: 'a39', text: 'Handyakku hat {a} Prozent. Jede Stunde Video verbraucht {b} Prozent. Nach {n} Stunden?', answerPrompt: 'Akku:', formula: (v) => v.a - v.n * v.b, ranges: { a: [80, 100], n: [2, 4], b: [10, 15] } },
    { id: 'a40', text: '{a} Blatt Papier. {n} Schüler nehmen sich je {b} Blatt. Wie viele bleiben?', answerPrompt: 'Blätter:', formula: (v) => v.a - v.n * v.b, ranges: { a: [100, 200], n: [15, 25], b: [2, 4] } },

    // --- Gemischte Advanced ---
    { id: 'a41', text: '{n} Packungen mit je {a} Keksen. Wir essen {b} Kekse auf. Rest?', answerPrompt: 'Kekse:', formula: (v) => v.n * v.a - v.b, ranges: { n: [2, 5], a: [10, 20], b: [5, 15] } },
    { id: 'a42', text: 'Ein Hochhaus hat {n} Etagen mit je {a} Fenstern. {b} Fenster sind offen.', answerPrompt: 'Offene Fenster:', formula: (v) => v.b, ranges: { n: [5, 10], a: [10, 20], b: [5, 30] } }, // Trickfrage? Nein, Formel ist nur b? Warte, Text sagt nicht "wie viele geschlossen". Text fragt "wie viele offen". Antwort b. Zu einfach. Ändern wir auf "Wie viele zu?"
    { id: 'a43', text: 'Ein Hochhaus hat {n} Etagen mit je {a} Fenstern. {b} Fenster sind offen. Wie viele sind zu?', answerPrompt: 'Geschlossene:', formula: (v) => v.n * v.a - v.b, ranges: { n: [5, 10], a: [10, 20], b: [10, 40] } },
    { id: 'a44', text: '{n} Kisten mit {a} kg Äpfeln. {b} kg sind faul und werden weggeworfen.', answerPrompt: 'Gute Äpfel:', formula: (v) => v.n * v.a - v.b, ranges: { n: [5, 10], a: [10, 20], b: [5, 15] } },
    { id: 'a45', text: 'Du arbeitest {n} Tage für {a} Fr. pro Tag. Davon kaufst du ein Spiel für {b} Fr.', answerPrompt: 'Restgeld:', formula: (v) => v.n * v.a - v.b, ranges: { n: [3, 5], a: [10, 20], b: [20, 40] } },
    { id: 'a46', text: 'Eintritt kostet {a} Fr. Es gibt einen Gruppenrabatt von {b} Fr. pro Person. {n} Leute.', answerPrompt: 'Gesamtpreis:', formula: (v) => v.n * (v.a - v.b), ranges: { a: [15, 25], b: [2, 5], n: [5, 10] } },
    { id: 'a47', text: 'Ein Abo kostet normalerweise {a} Fr. Heute ist es {b} Fr. billiger. Wir kaufen {n} Abos.', answerPrompt: 'Preis:', formula: (v) => v.n * (v.a - v.b), ranges: { a: [20, 40], b: [5, 10], n: [2, 4] } },
    { id: 'a48', text: '{n} Kinder sammeln je {a} Kastanien. Sie werfen {b} schlechte weg.', answerPrompt: 'Gute Kastanien:', formula: (v) => v.n * v.a - v.b, ranges: { n: [3, 6], a: [10, 20], b: [5, 15] } },
    { id: 'a49', text: 'Der Zug hat {n} Waggons mit je {a} Plätzen. {b} Plätze sind reserviert. Freie Plätze?', answerPrompt: 'Frei:', formula: (v) => v.n * v.a - v.b, ranges: { n: [4, 8], a: [40, 60], b: [50, 100] } },
    { id: 'a50', text: '{n} Blumensträuße mit je {a} Rosen. {b} Rosen welken und kommen weg.', answerPrompt: 'Frische Rosen:', formula: (v) => v.n * v.a - v.b, ranges: { n: [5, 10], a: [5, 10], b: [3, 8] } },
  ],

  profi: [
    // --- Komplexe Distributiv / Punkt-vor-Strich ---
    { id: 'p1', text: '{n} Schüler kaufen je ein Heft ({a} Fr.) und einen Stift ({b} Fr.). Der Lehrer kauft Kreide ({c} Fr.).', answerPrompt: 'Rechnung:', formula: (v) => v.n * (v.a + v.b) + v.c, ranges: { n: [10, 20], a: [2, 4], b: [1, 3], c: [5, 10] } },
    { id: 'p2', text: 'Eintritt: {n} Erwachsene ({a} Fr.) und {m} Kinder. Kinder zahlen {b} Fr. weniger als Erwachsene.', answerPrompt: 'Summe:', formula: (v) => v.n * v.a + v.m * (v.a - v.b), ranges: { n: [2, 4], a: [15, 25], m: [2, 5], b: [5, 10] } },
    { id: 'p3', text: 'Ein Bauer erntet {n} Kisten Äpfel à {a} Stück. {b} sind faul. Der Rest wird in {m} Säcke verteilt.', answerPrompt: 'Äpfel pro Sack:', formula: (v) => (v.n * v.a - v.b) / v.m, ranges: { n: [5, 10], a: [20, 40], b: [10, 30], m: [2, 5] } },
    { id: 'p4', text: 'Gewinn {a} Fr. Davon gehen {b} Fr. für Kosten weg. Der Rest wird an {n} Mitarbeiter verteilt.', answerPrompt: 'Pro Person:', formula: (v) => (v.a - v.b) / v.n, ranges: { a: [500, 1000], b: [100, 200], n: [4, 8] } },
    { id: 'p5', text: '{n} Freunde essen Pizza. Rechnung {a} Fr. Sie geben {b} Fr. Trinkgeld und teilen durch {n}.', answerPrompt: 'Jeder zahlt:', formula: (v) => (v.a + v.b) / v.n, ranges: { n: [3, 5], a: [40, 80], b: [2, 5] } }, // a+b muss durch n teilbar sein? Generator prüft das!
    { id: 'p6', text: 'Klassenfahrt: {n} Schüler. Bus kostet {a} Fr., Eintritt {b} Fr. (insgesamt). Preis pro Schüler?', answerPrompt: 'Preis:', formula: (v) => (v.a + v.b) / v.n, ranges: { n: [20, 30], a: [200, 400], b: [100, 200] } },
    { id: 'p7', text: 'Du kaufst {n} Shirts für {a} Fr. und {m} Hosen für {b} Fr. Du zahlst mit {c} Fr.', answerPrompt: 'Rückgeld:', formula: (v) => v.c - (v.n * v.a + v.m * v.b), ranges: { n: [1, 3], a: [10, 20], m: [1, 2], b: [20, 30], c: [100, 200] } },
    { id: 'p8', text: 'Lagerbestand {a}. Zugang {b}, Abgang {c}. Das Ganze passiert {n} mal.', answerPrompt: 'Bestand:', formula: (v) => v.a + v.n * (v.b - v.c), ranges: { a: [100, 200], b: [20, 30], c: [10, 15], n: [2, 5] } },
    { id: 'p9', text: '{n} Kisten Wasser ({a} Fr.) und {m} Kisten Saft ({b} Fr.). Pfand pro Kiste ist {c} Fr.', answerPrompt: 'Gesamtpreis:', formula: (v) => v.n * (v.a + v.c) + v.m * (v.b + v.c), ranges: { n: [2, 5], a: [4, 6], m: [2, 5], b: [8, 12], c: [3, 3] } },
    { id: 'p10', text: 'Rechteckiger Garten: Länge {a} m, Breite {b} m. Zaun drumherum kostet {c} Fr. pro Meter.', answerPrompt: 'Kosten:', formula: (v) => 2 * (v.a + v.b) * v.c, ranges: { a: [10, 20], b: [5, 15], c: [5, 10] } }, // 2*(a+b)*c

    // --- Weitere Profi Variationen ---
    { id: 'p11', text: '3 Tage Arbeit. Tag 1: {a} Std., Tag 2: {b} Std., Tag 3: {c} Std. Lohn ist {d} Fr./Std.', answerPrompt: 'Gesamtlohn:', formula: (v) => (v.a + v.b + v.c) * v.d, ranges: { a: [4, 8], b: [4, 8], c: [4, 8], d: [15, 25] } },
    { id: 'p12', text: 'Durchschnitt: Peter {a} Punkte, Paul {b}, Marie {c}. Wie viele Punkte im Schnitt?', answerPrompt: 'Durchschnitt:', formula: (v) => (v.a + v.b + v.c) / 3, ranges: { a: [8, 12], b: [8, 12], c: [8, 12] } }, // muss durch 3 teilbar sein
    { id: 'p13', text: 'Sparziel {a} Fr. Du hast schon {b} Fr. Du sparst jede Woche {c} Fr. Wie viele Wochen noch?', answerPrompt: 'Wochen:', formula: (v) => (v.a - v.b) / v.c, ranges: { a: [100, 200], b: [20, 50], c: [5, 10] } },
    { id: 'p14', text: '{n} Packungen Mehl ({a} kg) und {m} Packungen Zucker ({b} kg). Alles in {k} Kisten verteilt.', answerPrompt: 'Kg pro Kiste:', formula: (v) => (v.n * v.a + v.m * v.b) / v.k, ranges: { n: [4, 8], a: [1, 2], m: [4, 8], b: [1, 1], k: [2, 4] } },
    { id: 'p15', text: 'Alter: Opa ist {a}. Enkel ist {b}. In wie vielen Jahren ist Opa doppelt so alt?', answerPrompt: 'Jahre:', formula: (v) => v.a - 2 * v.b, ranges: { a: [60, 70], b: [10, 15] } }, // Formel stimmt mathematisch für "x = a - 2b" wenn a+x = 2(b+x) -> a+x=2b+2x -> a-2b=x. Muss positiv sein.
    { id: 'p16', text: 'Der Pool fasst {a} Liter. Zufluss {b} l/min, Abfluss {c} l/min. Wie lange bis voll (start leer)?', answerPrompt: 'Minuten:', formula: (v) => v.a / (v.b - v.c), ranges: { a: [500, 1000], b: [50, 100], c: [10, 30] } },
    { id: 'p17', text: 'Handyrechnung: Grundgebühr {a} Fr. {n} Minuten telefoniert für {b} Rp/Min. (Achtung Rappen!)', answerPrompt: 'Summe (Fr):', formula: (v) => v.a + (v.n * v.b) / 100, ranges: { a: [10, 20], n: [20, 100], b: [5, 10] } }, // float gefahr
    { id: 'p18', text: '{n} LKW fahren. Jeder lädt {a} Kisten. In jeder Kiste sind {b} Flaschen.', answerPrompt: 'Flaschen:', formula: (v) => v.n * v.a * v.b, ranges: { n: [2, 5], a: [10, 20], b: [6, 12] } },
    { id: 'p19', text: '{n} Bretter der Länge {a} cm werden aneinandergelegt. {m} cm Überlappung je Verbindung.', answerPrompt: 'Gesamtlänge:', formula: (v) => v.n * v.a - (v.n - 1) * v.m, ranges: { n: [3, 6], a: [100, 200], m: [5, 10] } },
    { id: 'p20', text: 'Startkapital {a}. Jahr 1: +{b}, Jahr 2: -{c}, Jahr 3: verdoppelt.', answerPrompt: 'Endstand:', formula: (v) => (v.a + v.b - v.c) * 2, ranges: { a: [50, 100], b: [20, 50], c: [10, 30] } },

    // --- Mehr Variationen für 50 ---
    { id: 'p21', text: 'Kinosaal: {n} Reihen à {a} Plätze. {m} Plätze sind defekt. Vorstellung ist ausverkauft.', answerPrompt: 'Zuschauer:', formula: (v) => v.n * v.a - v.m, ranges: { n: [10, 20], a: [10, 20], m: [5, 15] } },
    { id: 'p22', text: 'Buch mit {a} Seiten. Du liest {n} Tage lang je {b} Seiten. Wie viele noch übrig?', answerPrompt: 'Seiten:', formula: (v) => v.a - v.n * v.b, ranges: { a: [200, 300], n: [5, 10], b: [10, 20] } },
    { id: 'p23', text: '{n} Netze Orangen. In jedem Netz {a} Stück. {b} Orangen sind schlecht.', answerPrompt: 'Gute Orangen:', formula: (v) => v.n * v.a - v.b, ranges: { n: [5, 10], a: [5, 8], b: [2, 5] } },
    { id: 'p24', text: 'Wandertag: {n} Schüler zahlen {a} Fr. Lehrer zahlt {b} Fr. Gesamt?', answerPrompt: 'Kosten:', formula: (v) => v.n * v.a + v.b, ranges: { n: [15, 25], a: [5, 10], b: [10, 20] } },
    { id: 'p25', text: '{a} Liter Suppe. {n} Teller werden mit je {b} ml gefüllt (Achtung Liter/ml).', answerPrompt: 'Rest (ml):', formula: (v) => v.a * 1000 - v.n * v.b, ranges: { a: [5, 10], n: [10, 20], b: [200, 300] } },
    { id: 'p26', text: 'Ein Baum ist {a} m hoch. Er wächst im Jahr {b} cm. Höhe nach {n} Jahren (in cm)?', answerPrompt: 'Höhe (cm):', formula: (v) => v.a * 100 + v.b * v.n, ranges: { a: [2, 5], b: [10, 30], n: [3, 8] } },
    { id: 'p27', text: 'Geschwindigkeit {a} km/h. Fahrtdauer {n} Stunden. Pause {b} km vor Ziel. Gesamtstrecke?', answerPrompt: 'Strecke:', formula: (v) => v.a * v.n + v.b, ranges: { a: [80, 120], n: [2, 5], b: [10, 50] } }, // Textlogik: Gefahren + Rest = Gesamt? Ja.
    { id: 'p28', text: '{n} Kisten à {a} kg. LKW darf max {b} kg laden. Wie viel kg zu viel?', answerPrompt: 'Übergewicht:', formula: (v) => v.n * v.a - v.b, ranges: { n: [10, 20], a: [50, 80], b: [500, 1000] } }, // Muss pos sein
    { id: 'p29', text: 'Du hast {a} Fr. Kaufst {n} Spiele à {b} Fr. und {m} Hefte à {c} Fr. Rest?', answerPrompt: 'Rest:', formula: (v) => v.a - (v.n * v.b + v.m * v.c), ranges: { a: [100, 200], n: [1, 3], b: [20, 30], m: [2, 5], c: [2, 5] } },
    { id: 'p30', text: 'Gewinnspiel: {n} Lose gekauft à {a} Fr. Ein Gewinn von {b} Fr. Bilanz?', answerPrompt: 'Gewinn/Verlust:', formula: (v) => v.b - v.n * v.a, ranges: { n: [5, 10], a: [2, 5], b: [50, 100] } }, // Positiv = Gewinn
    { id: 'p31', text: 'Rezept für {n} Personen: {a} g Mehl. Wie viel Mehl für {m} Personen?', answerPrompt: 'Mehl:', formula: (v) => (v.a / v.n) * v.m, ranges: { n: [2, 4], a: [200, 500], m: [6, 10] } }, // Dreisatz
    { id: 'p32', text: '{n} Arbeiter brauchen {a} Stunden für eine Mauer. Wie lange brauchen {m} Arbeiter?', answerPrompt: 'Stunden:', formula: (v) => (v.n * v.a) / v.m, ranges: { n: [2, 4], a: [10, 20], m: [4, 8] } }, // Antiproportional
    { id: 'p33', text: 'Umfang Quadrat: Seite {a} cm. Umfang Rechteck: Länge {b}, Breite {c}. Summe beider Umfänge?', answerPrompt: 'Summe:', formula: (v) => 4 * v.a + 2 * (v.b + v.c), ranges: { a: [5, 10], b: [5, 10], c: [2, 5] } },
    { id: 'p34', text: 'Fläche: Zimmer {a} m mal {b} m. Teppich kostet {c} Fr. pro m². Preis?', answerPrompt: 'Preis:', formula: (v) => v.a * v.b * v.c, ranges: { a: [3, 6], b: [3, 5], c: [10, 20] } },
    { id: 'p35', text: '{n} Paletten. Auf jeder {a} Kartons. In jedem Karton {b} Dosen. Total?', answerPrompt: 'Dosen:', formula: (v) => v.n * v.a * v.b, ranges: { n: [2, 5], a: [4, 8], b: [6, 12] } },
    { id: 'p36', text: 'Kino: Reihe 1-5 kosten {a} Fr., Reihe 6-10 kosten {b} Fr. In jeder Reihe {n} Plätze. Volles Haus Einnahmen?', answerPrompt: 'Einnahmen:', formula: (v) => 5 * v.n * v.a + 5 * v.n * v.b, ranges: { a: [10, 15], b: [15, 20], n: [10, 20] } },
    { id: 'p37', text: 'Ein Zug fährt {a} km in {n} Stunden. Wie weit kommt er in {m} Stunden?', answerPrompt: 'Strecke:', formula: (v) => (v.a / v.n) * v.m, ranges: { a: [200, 400], n: [2, 4], m: [3, 6] } },
    { id: 'p38', text: '{n} Flaschen Pfand à {a} Rp. Du kaufst dafür Lolli für {b} Rp. Rest (Rp)?', answerPrompt: 'Rest:', formula: (v) => v.n * v.a - v.b, ranges: { n: [5, 10], a: [25, 25], b: [10, 50] } },
    { id: 'p39', text: 'Taschengeld: {a} Fr. pro Monat. Opa gibt {b} Fr. dazu. Ausgaben {c} Fr. Sparbetrag in {n} Monaten?', answerPrompt: 'Gespart:', formula: (v) => v.n * (v.a + v.b - v.c), ranges: { a: [20, 30], b: [10, 20], c: [15, 25], n: [6, 12] } },
    { id: 'p40', text: 'Batterie hält {a} Stunden. Du nutzt das Gerät {n} Tage lang je {b} Stunden. Restlaufzeit?', answerPrompt: 'Stunden:', formula: (v) => v.a - v.n * v.b, ranges: { a: [50, 100], n: [3, 7], b: [2, 5] } },
    { id: 'p41', text: '{n} Packungen Papier à 500 Blatt. Die Schule verbraucht {a} Blatt pro Tag. Wie lange reicht es (Tage)?', answerPrompt: 'Tage:', formula: (v) => (v.n * 500) / v.a, ranges: { n: [2, 5], a: [50, 100] } },
    { id: 'p42', text: 'Ein Video dauert {a} Minuten. Du schaust es {n} mal, aber spulst jedes Mal {b} Minuten vor (überspringen). Zeit?', answerPrompt: 'Zeit:', formula: (v) => v.n * (v.a - v.b), ranges: { a: [10, 20], n: [2, 4], b: [2, 5] } },
    { id: 'p43', text: 'Treppe mit {n} Stufen. Jede Stufe {a} cm hoch. Du steigst sie {m} mal hoch. Höhenmeter (m)?', answerPrompt: 'Meter:', formula: (v) => (v.n * v.a * v.m) / 100, ranges: { n: [10, 20], a: [15, 20], m: [5, 10] } },
    { id: 'p44', text: 'Fahrradtour {a} km. Tag 1: {b} km. Tag 2: {c} km. Rest für Tag 3?', answerPrompt: 'Tag 3:', formula: (v) => v.a - (v.b + v.c), ranges: { a: [100, 200], b: [30, 50], c: [30, 50] } },
    { id: 'p45', text: 'Limo Rezept: {a} ml Saft + {b} ml Wasser. Wir wollen {n} Gläser à {c} ml füllen. Wie oft Rezept mischen?', answerPrompt: 'Mischungen:', formula: (v) => (v.n * v.c) / (v.a + v.b), ranges: { a: [200, 200], b: [300, 300], n: [5, 10], c: [250, 500] } }, // muss aufgehen
    { id: 'p46', text: '{n} Freunde. Jeder hat {a} Fr. Sie legen zusammen und kaufen Spiel für {b} Fr. Rest wird geteilt. Wie viel für jeden?', answerPrompt: 'Rückgeld p.P.:', formula: (v) => (v.n * v.a - v.b) / v.n, ranges: { n: [2, 5], a: [20, 50], b: [30, 80] } }, // (n*a - b) / n = a - b/n
    { id: 'p47', text: 'Temperatur Montag {a} Grad. Dienstag {b} Grad wärmer. Mittwoch {c} Grad kälter als Dienstag. Mittwoch?', answerPrompt: 'Grad:', formula: (v) => v.a + v.b - v.c, ranges: { a: [10, 20], b: [2, 8], c: [2, 8] } },
    { id: 'p48', text: 'Buch {n} Seiten. Tag 1: Seite {a} bis {b} gelesen. Tag 2: {c} Seiten gelesen. Rest?', answerPrompt: 'Seiten:', formula: (v) => v.n - ((v.b - v.a + 1) + v.c), ranges: { n: [200, 300], a: [10, 20], b: [40, 60], c: [30, 50] } },
    { id: 'p49', text: 'Parkhaus: Stunde 1 kostet {a} Fr. Jede weitere Stunde {b} Fr. Du parkst {n} Stunden.', answerPrompt: 'Kosten:', formula: (v) => v.a + (v.n - 1) * v.b, ranges: { a: [2, 5], b: [1, 3], n: [2, 6] } },
    { id: 'p50', text: 'Stromzähler: Alt {a} kWh, Neu {b} kWh. Preis {c} Rp pro kWh. Kosten in Fr?', answerPrompt: 'Kosten (Fr):', formula: (v) => ((v.b - v.a) * v.c) / 100, ranges: { a: [1000, 2000], b: [2100, 2500], c: [20, 30] } }
  ]
};