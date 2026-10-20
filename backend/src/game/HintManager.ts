/**
 * HintManager: Manages progressive word masking and character reveal calculations.
 * Enforces mathematical safeguards preventing words from being fully spoiled.
 */
export class HintManager {
  /**
   * Calculates maximum number of letters permitted to be revealed as hints.
   * Rule: At least half the word plus one letter must remain concealed.
   */
  public static getMaxHintsAllowed(word: string, hintsAllowedSetting: number): number {
    const lettersOnly = word.replace(/[^A-Za-z0-9]/g, '');
    const len = lettersOnly.length;
    if (len <= 2) return 0; // 2-letter words get no letter hints
    if (len <= 4) return 1; // 3 or 4-letter words get at most 1 hint

    const theoreticalMax = Math.max(1, Math.floor((len - 1) / 2));
    return Math.min(hintsAllowedSetting, theoreticalMax);
  }

  /**
   * Generates the initial mask where letters are underscores and spaces/hyphens are preserved.
   */
  public static createInitialMask(word: string): string[] {
    return word.split('').map((char) => {
      if (/[A-Za-z0-9]/.test(char)) {
        return '_';
      }
      return char; // Preserve spaces, dashes, apostrophes
    });
  }

  /**
   * Formats an array of mask characters into a readable spaced string (e.g. "_ _ _   _ _ _ _ _").
   */
  public static formatMaskString(maskArray: string[]): string {
    return maskArray.join(' ');
  }

  /**
   * Reveals one random unrevealed letter from the secret word into the mask.
   */
  public static revealNextHint(
    secretWord: string,
    currentMask: string[],
    revealedIndices: number[]
  ): { updatedMask: string[]; newRevealedIndex: number | null } {
    const unrevealedIndices: number[] = [];
    const upperWord = secretWord.toUpperCase();

    for (let i = 0; i < upperWord.length; i++) {
      const char = upperWord[i];
      // Only letters that have not yet been revealed can be selected
      if (/[A-Za-z0-9]/.test(char) && currentMask[i] === '_') {
        unrevealedIndices.push(i);
      }
    }

    if (unrevealedIndices.length === 0) {
      return { updatedMask: currentMask, newRevealedIndex: null };
    }

    // Pick a random unrevealed index
    const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    const updatedMask = [...currentMask];
    updatedMask[randomIndex] = upperWord[randomIndex];
    revealedIndices.push(randomIndex);

    return { updatedMask, newRevealedIndex: randomIndex };
  }
}
