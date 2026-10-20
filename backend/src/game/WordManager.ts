import { pool } from '../db/connection.js';

export interface WordOption {
  word: string;
  category: string;
  difficulty: string;
}

const FALLBACK_WORDS: WordOption[] = [
  // Animals
  { word: 'cat', category: 'ANIMALS', difficulty: 'EASY' },
  { word: 'dog', category: 'ANIMALS', difficulty: 'EASY' },
  { word: 'elephant', category: 'ANIMALS', difficulty: 'MEDIUM' },
  { word: 'giraffe', category: 'ANIMALS', difficulty: 'MEDIUM' },
  { word: 'penguin', category: 'ANIMALS', difficulty: 'EASY' },
  { word: 'lion', category: 'ANIMALS', difficulty: 'EASY' },
  { word: 'dolphin', category: 'ANIMALS', difficulty: 'MEDIUM' },
  { word: 'monkey', category: 'ANIMALS', difficulty: 'EASY' },
  { word: 'kangaroo', category: 'ANIMALS', difficulty: 'HARD' },
  // Food
  { word: 'pizza', category: 'FOOD', difficulty: 'EASY' },
  { word: 'burger', category: 'FOOD', difficulty: 'EASY' },
  { word: 'ice cream', category: 'FOOD', difficulty: 'EASY' },
  { word: 'banana', category: 'FOOD', difficulty: 'EASY' },
  { word: 'pancake', category: 'FOOD', difficulty: 'MEDIUM' },
  { word: 'chocolate', category: 'FOOD', difficulty: 'MEDIUM' },
  // Objects
  { word: 'guitar', category: 'OBJECTS', difficulty: 'EASY' },
  { word: 'airplane', category: 'OBJECTS', difficulty: 'EASY' },
  { word: 'rocket', category: 'OBJECTS', difficulty: 'MEDIUM' },
  { word: 'computer', category: 'OBJECTS', difficulty: 'EASY' },
  { word: 'bicycle', category: 'OBJECTS', difficulty: 'EASY' },
  { word: 'clock', category: 'OBJECTS', difficulty: 'EASY' },
  { word: 'umbrella', category: 'OBJECTS', difficulty: 'MEDIUM' },
  { word: 'telescope', category: 'OBJECTS', difficulty: 'HARD' },
  // Places
  { word: 'castle', category: 'PLACES', difficulty: 'MEDIUM' },
  { word: 'pyramid', category: 'PLACES', difficulty: 'MEDIUM' },
  { word: 'beach', category: 'PLACES', difficulty: 'EASY' },
  { word: 'hospital', category: 'PLACES', difficulty: 'MEDIUM' },
  { word: 'island', category: 'PLACES', difficulty: 'EASY' },
  // Actions
  { word: 'swimming', category: 'ACTIONS', difficulty: 'MEDIUM' },
  { word: 'dancing', category: 'ACTIONS', difficulty: 'MEDIUM' },
  { word: 'sleeping', category: 'ACTIONS', difficulty: 'EASY' },
  { word: 'flying', category: 'ACTIONS', difficulty: 'MEDIUM' },
  { word: 'cooking', category: 'ACTIONS', difficulty: 'EASY' },
];

export class WordManager {
  /**
   * Fetches N random word options for the drawer.
   * Attempts to query MySQL `words` table first; seamlessly falls back to categorized memory catalog.
   */
  public static async getRandomWords(count: number = 3): Promise<WordOption[]> {
    const safeCount = Math.min(Math.max(count, 1), 5);

    try {
      const [rows] = await pool.query(
        `SELECT word, category, difficulty FROM words ORDER BY RAND() LIMIT ?`,
        [safeCount]
      );

      const dbWords = rows as WordOption[];
      if (dbWords && dbWords.length >= safeCount) {
        return dbWords;
      }
    } catch (err) {
      console.warn('[WordManager] DB query fallback to memory catalog:', (err as Error).message);
    }

    // Fallback: shuffle memory catalog
    const shuffled = [...FALLBACK_WORDS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, safeCount);
  }
}
