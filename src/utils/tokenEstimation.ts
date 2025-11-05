// Conservative token estimation: 1 token ≈ 3.5 characters for English text
export const CHARS_PER_TOKEN = 3.5

/**
 * Estimates token count from text using character-based heuristic.
 * Fast, synchronous alternative to session.measureInputUsage().
 * Accuracy: ~95% for English text.
 *
 * @param text - Text to estimate token count for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}
