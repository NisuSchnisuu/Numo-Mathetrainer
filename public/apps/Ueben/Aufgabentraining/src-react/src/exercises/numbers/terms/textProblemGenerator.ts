import { templates } from './textProblemData';
import type { Difficulty } from './textProblemData';

export interface ProblemInstance {
  templateId: string;
  difficulty: Difficulty;
  text: string;
  answerPrompt: string;
  target: number;
  variables: Record<string, number>;
  ingredients: number[];
}

export interface CheckResult {
  isCorrect: boolean;
  message: string;
}

export function generateProblem(difficulty: Difficulty | 'mixed', excludeId?: string): ProblemInstance {
  let attempts = 0;
  
  let selectedDiff: Difficulty;
  if (difficulty === 'mixed') {
    const rand = Math.random();
    if (rand < 0.50) {
      selectedDiff = 'normal';
    } else if (rand < 0.85) { // 0.50 + 0.35
      selectedDiff = 'advanced';
    } else {
      selectedDiff = 'profi';
    }
  } else {
    selectedDiff = difficulty;
  }

  const diffTemplates = templates[selectedDiff];

  while (attempts < 50) {
    attempts++;
    const template = diffTemplates[Math.floor(Math.random() * diffTemplates.length)];
    
    // Skip if it's the same ID as the last one, unless we've tried too many times 
    // (unlikely, but safe for small template pools)
    if (template.id === excludeId && diffTemplates.length > 1 && attempts < 10) continue;

    const variables: Record<string, number> = {};

    for (const [key, [min, max]] of Object.entries(template.ranges)) {
      variables[key] = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    try {
      const target = template.formula(variables);
      
      // Ensure target is a positive integer and divisions were clean
      if (target > 0 && Number.isInteger(target)) {
        let text = template.text;
        const ingredients: number[] = [];
        
        for (const [key, val] of Object.entries(variables)) {
          text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), val.toString());
          ingredients.push(val);
        }

        return {
          templateId: template.id,
          difficulty: selectedDiff,
          text,
          answerPrompt: template.answerPrompt,
          target,
          variables,
          ingredients
        };
      }
    } catch (e) {
      // Retry
    }
  }

  // Fallback
  return {
    templateId: 'fallback',
    difficulty: 'normal',
    text: '2 Freunde kaufen Äpfel für je 3 Euro. Wie viel kostet es?',
    answerPrompt: 'Preis:',
    target: 6,
    variables: { a: 2, b: 3 },
    ingredients: [2, 3]
  };
}

export function checkSolution(userTerm: string, userResult: number, target: number, ingredients: number[]): CheckResult {
  // 1. Check numeric result first
  if (userResult !== target) {
    return { isCorrect: false, message: 'Das Ergebnis der Antwort stimmt nicht.' };
  }

  // 2. Basic format check for term
  const sanitizedTerm = userTerm.replace(/·/g, '*').replace(/÷/g, '/');
  
  if (!/^[0-9+\-*/().\s]+$/.test(sanitizedTerm)) {
    return { isCorrect: false, message: 'Ungültiges Format im Term!' };
  }

  // 3. Ingredients Check
  const termNumbers = (userTerm.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
  const requiredNumbers = [...ingredients].sort((a, b) => a - b);

  if (JSON.stringify(termNumbers) !== JSON.stringify(requiredNumbers)) {
    return { isCorrect: false, message: 'Der Term muss genau die Zahlen aus dem Text nutzen!' };
  }

  // 4. Mathematical result check for the built term
  try {
    // eslint-disable-next-line no-eval
    const result = eval(sanitizedTerm);
    
    if (Math.abs(result - target) < 0.0001) {
      return { isCorrect: true, message: 'Richtig! 🎉' };
    } else {
      return { isCorrect: false, message: 'Dein gebauter Term ergibt nicht das richtige Ziel.' };
    }
  } catch (e) {
    return { isCorrect: false, message: 'Ungültige Rechnung im Term!' };
  }
}
