const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a clean, human-friendly 6-character uppercase room code.
 * Excludes ambiguous characters (0, O, 1, I) to prevent user transcription errors.
 */
export function generateRoomCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
    code += SAFE_CHARS[randomIndex];
  }
  return code;
}
