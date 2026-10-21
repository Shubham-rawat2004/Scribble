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

const COMBINATION_WORDS: WordOption[] = [
  { word: 'flying cat', category: 'COMBINATION', difficulty: 'HARD' },
  { word: 'dancing elephant', category: 'COMBINATION', difficulty: 'HARD' },
  { word: 'ice cream castle', category: 'COMBINATION', difficulty: 'HARD' },
  { word: 'space ship', category: 'COMBINATION', difficulty: 'MEDIUM' },
  { word: 'fire truck', category: 'COMBINATION', difficulty: 'MEDIUM' },
  { word: 'tree house', category: 'COMBINATION', difficulty: 'MEDIUM' },
  { word: 'snow man', category: 'COMBINATION', difficulty: 'EASY' },
  { word: 'water melon', category: 'COMBINATION', difficulty: 'MEDIUM' },
  { word: 'hot dog', category: 'COMBINATION', difficulty: 'EASY' },
  { word: 'sun flower', category: 'COMBINATION', difficulty: 'MEDIUM' },
  { word: 'rain bow', category: 'COMBINATION', difficulty: 'EASY' },
  { word: 'sea shell', category: 'COMBINATION', difficulty: 'MEDIUM' },
  { word: 'butter fly', category: 'COMBINATION', difficulty: 'EASY' },
  { word: 'sleepy monkey', category: 'COMBINATION', difficulty: 'HARD' },
  { word: 'cooking penguin', category: 'COMBINATION', difficulty: 'HARD' },
];

const LANGUAGE_WORD_BANKS: Record<string, WordOption[]> = {
  German: [
    { word: 'katze', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'hund', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'elefant', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'giraffe', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'pinguin', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'loewe', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'gitarre', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'flugzeug', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'rakete', category: 'OBJECTS', difficulty: 'MEDIUM' },
    { word: 'computer', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'fahrrad', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'uhr', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'pizza', category: 'FOOD', difficulty: 'EASY' },
    { word: 'schloss', category: 'PLACES', difficulty: 'MEDIUM' },
    { word: 'strand', category: 'PLACES', difficulty: 'EASY' },
    { word: 'schwimmen', category: 'ACTIONS', difficulty: 'MEDIUM' },
  ],
  Spanish: [
    { word: 'gato', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'perro', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'elefante', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'jirafa', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'pinguino', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'leon', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'guitarra', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'avion', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'cohete', category: 'OBJECTS', difficulty: 'MEDIUM' },
    { word: 'computadora', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'bicicleta', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'reloj', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'pizza', category: 'FOOD', difficulty: 'EASY' },
    { word: 'castillo', category: 'PLACES', difficulty: 'MEDIUM' },
    { word: 'playa', category: 'PLACES', difficulty: 'EASY' },
    { word: 'nadar', category: 'ACTIONS', difficulty: 'MEDIUM' },
  ],
  French: [
    { word: 'chat', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'chien', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'elephant', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'girafe', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'pingouin', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'lion', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'guitare', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'avion', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'fusee', category: 'OBJECTS', difficulty: 'MEDIUM' },
    { word: 'ordinateur', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'bicyclette', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'horloge', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'chateau', category: 'PLACES', difficulty: 'MEDIUM' },
    { word: 'plage', category: 'PLACES', difficulty: 'EASY' },
    { word: 'nager', category: 'ACTIONS', difficulty: 'MEDIUM' },
  ],
  Italian: [
    { word: 'gatto', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'cane', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'elefante', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'giraffa', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'leone', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'chitarra', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'aereo', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'razzo', category: 'OBJECTS', difficulty: 'MEDIUM' },
    { word: 'bicicletta', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'orologio', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'castello', category: 'PLACES', difficulty: 'MEDIUM' },
    { word: 'spiaggia', category: 'PLACES', difficulty: 'EASY' },
  ],
  Portuguese: [
    { word: 'gato', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'cachorro', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'elefante', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'girafa', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'leao', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'guitarra', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'aviao', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'foguete', category: 'OBJECTS', difficulty: 'MEDIUM' },
    { word: 'bicicleta', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'relogio', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'castelo', category: 'PLACES', difficulty: 'MEDIUM' },
    { word: 'praia', category: 'PLACES', difficulty: 'EASY' },
  ],
  Russian: [
    { word: 'кот', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'собака', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'слон', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'жираф', category: 'ANIMALS', difficulty: 'MEDIUM' },
    { word: 'лев', category: 'ANIMALS', difficulty: 'EASY' },
    { word: 'гитара', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'самолет', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'ракета', category: 'OBJECTS', difficulty: 'MEDIUM' },
    { word: 'велосипед', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'часы', category: 'OBJECTS', difficulty: 'EASY' },
    { word: 'замок', category: 'PLACES', difficulty: 'MEDIUM' },
    { word: 'пляж', category: 'PLACES', difficulty: 'EASY' },
  ],
};

export class WordManager {
  /**
   * Fetches N random word options for the drawer.
   * Supports 'Combination' game mode, multi-language catalogs, host custom words, and database fallback.
   */
  public static async getRandomWords(
    count: number = 3,
    customWords?: string[],
    customWordsOnly?: boolean,
    gameMode?: string,
    language: string = 'English'
  ): Promise<WordOption[]> {
    const safeCount = Math.min(Math.max(count, 1), 5);

    // If Combination mode, prioritize compound/combination phrases
    if (gameMode === 'Combination') {
      const shuffledCombo = [...COMBINATION_WORDS].sort(() => 0.5 - Math.random());
      return shuffledCombo.slice(0, safeCount);
    }

    // If a specific language is selected
    if (language && language !== 'English' && LANGUAGE_WORD_BANKS[language]) {
      const bank = LANGUAGE_WORD_BANKS[language];
      const shuffled = [...bank].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, safeCount);
    }

    let selectedCustom: WordOption[] = [];
    // If host provided custom words, prioritize them
    if (customWords && customWords.length > 0) {
      const sanitized = Array.from(new Set(customWords.map(w => w.trim().toLowerCase()))).filter(w => w.length >= 2);
      if (sanitized.length > 0) {
        const shuffledCustom = sanitized.sort(() => 0.5 - Math.random());
        selectedCustom = shuffledCustom.slice(0, safeCount).map((w) => ({
          word: w,
          category: 'CUSTOM',
          difficulty: 'MEDIUM',
        }));
        if (customWordsOnly || selectedCustom.length >= safeCount) {
          return selectedCustom;
        }
      }
    }

    const remainingNeeded = safeCount - selectedCustom.length;
    const existingWords = new Set(selectedCustom.map(w => w.word.toLowerCase()));

    try {
      const [rows] = await pool.query(
        `SELECT word, category, difficulty FROM words ORDER BY RAND() LIMIT ?`,
        [safeCount * 2]
      );

      const dbWords = (rows as WordOption[]).filter(w => !existingWords.has(w.word.toLowerCase()));
      if (dbWords && dbWords.length >= remainingNeeded) {
        return [...selectedCustom, ...dbWords.slice(0, remainingNeeded)];
      }
    } catch (err) {
      console.warn('[WordManager] DB query fallback to memory catalog:', (err as Error).message);
    }

    // Fallback: shuffle memory catalog
    const shuffled = [...FALLBACK_WORDS].filter(w => !existingWords.has(w.word.toLowerCase())).sort(() => 0.5 - Math.random());
    return [...selectedCustom, ...shuffled.slice(0, remainingNeeded)];
  }
}
