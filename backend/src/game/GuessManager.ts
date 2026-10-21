// GuessManager: Anti-Cheat, Levenshtein Distance & Chat Classification Engine
export type MessageClassification =
  | 'DRAWER_CHEAT'
  | 'CORRECT_GUESS'
  | 'CLOSE_GUESS'
  | 'ALREADY_GUESSED'
  | 'REGULAR_CHAT';

export interface EvaluationResult {
  classification: MessageClassification;
  cleanText: string;
  levenshteinDistance?: number;
  warning?: string;
}

export class GuessManager {
  /**
   * Normalizes input text: lowercases, trims whitespace, collapses multiple spaces.
   */
  public static normalize(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Calculates Levenshtein edit distance between two strings using dynamic programming.
   * Time complexity: O(n * m), Space complexity: O(min(n, m)).
   */
  public static calculateLevenshteinDistance(a: string, b: string): number {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();

    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    // Use two rows for space optimization
    let prevRow = new Array(s2.length + 1);
    let currRow = new Array(s2.length + 1);

    for (let j = 0; j <= s2.length; j++) {
      prevRow[j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      currRow[0] = i;
      const char1 = s1.charAt(i - 1);

      for (let j = 1; j <= s2.length; j++) {
        const char2 = s2.charAt(j - 1);
        const cost = char1 === char2 ? 0 : 1;

        currRow[j] = Math.min(
          prevRow[j] + 1,      // deletion
          currRow[j - 1] + 1,  // insertion
          prevRow[j - 1] + cost // substitution
        );
      }

      // Copy currRow into prevRow for next iteration
      for (let j = 0; j <= s2.length; j++) {
        prevRow[j] = currRow[j];
      }
    }

    return prevRow[s2.length];
  }

  /**
   * Evaluates an incoming message against the secret word and player context.
   */
  public static evaluateMessage(
    text: string,
    secretWord: string | null,
    isDrawer: boolean,
    hasAlreadyGuessed: boolean
  ): EvaluationResult {
    const cleanText = this.normalize(text);

    // If there is no active secret word (e.g. word picking phase), treat as regular chat
    if (!secretWord) {
      return { classification: 'REGULAR_CHAT', cleanText };
    }

    const cleanSecret = this.normalize(secretWord);

    // 1. Drawer Anti-Cheat: Drawer cannot chat or guess while drawing turn is active
    if (isDrawer) {
      return {
        classification: 'DRAWER_CHEAT',
        cleanText,
        warning: 'You cannot chat while drawing!',
      };
    }

    // 2. Already Guessed: Route message to post-guess channel (Option A - Skribbl.io authentic)
    if (hasAlreadyGuessed) {
      return { classification: 'ALREADY_GUESSED', cleanText };
    }

    // 3. Exact Match (Correct Guess)
    if (cleanText === cleanSecret) {
      return { classification: 'CORRECT_GUESS', cleanText };
    }

    // 4. Fuzzy Matching: "You're close!" (Levenshtein distance <= 1 for words >= 4 letters)
    if (cleanSecret.length >= 4) {
      const dist = this.calculateLevenshteinDistance(cleanText, cleanSecret);
      if (dist === 1) {
        return {
          classification: 'CLOSE_GUESS',
          cleanText,
          levenshteinDistance: dist,
        };
      }
    }

    // 5. Regular chat / incorrect guess
    return { classification: 'REGULAR_CHAT', cleanText };
  }
}
