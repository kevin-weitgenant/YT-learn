import type { TranscriptSegment, Chapter } from "~types/transcript"

/**
 * Reconstructs full transcript text from segments
 * @param segments - Array of transcript segments
 * @returns Concatenated transcript text with spaces between segments
 */
export function buildTranscriptFromSegments(
  segments: TranscriptSegment[]
): string {
  if (!segments || segments.length === 0) return ""
  return segments.map(seg => seg.text).join(' ')
}

/**
 * Truncates segments to fit within character limit, respecting segment boundaries
 *
 * This ensures we don't cut off mid-sentence when truncating transcripts for AI context.
 *
 * @param segments - Full array of transcript segments
 * @param maxChars - Maximum allowed characters
 * @returns Object with truncated segments, final text, truncation status, and end time
 */
export function truncateAtSegmentBoundary(
  segments: TranscriptSegment[],
  maxChars: number
): {
  truncatedSegments: TranscriptSegment[]
  finalText: string
  wasTruncated: boolean
  endTimeSeconds: number
} {
  let currentLength = 0
  let lastIncludedIndex = -1

  // Find how many segments fit within maxChars
  for (let i = 0; i < segments.length; i++) {
    const segmentLength = segments[i].text.length + 1 // +1 for space separator

    if (currentLength + segmentLength > maxChars) {
      break
    }

    currentLength += segmentLength
    lastIncludedIndex = i
  }

  // Safety: include at least first segment if none fit
  if (lastIncludedIndex === -1) {
    lastIncludedIndex = 0
  }

  const truncatedSegments = segments.slice(0, lastIncludedIndex + 1)
  const finalText = truncatedSegments.map(seg => seg.text).join(' ')
  const wasTruncated = lastIncludedIndex < segments.length - 1

  // Calculate end time of last included segment
  const lastSegment = truncatedSegments[truncatedSegments.length - 1]
  const endTimeSeconds = lastSegment.start + lastSegment.duration

  return {
    truncatedSegments,
    finalText,
    wasTruncated,
    endTimeSeconds
  }
}

/**
 * Determines which chapters fall within the transcript time range
 *
 * Used to update chapter selection when transcript is truncated,
 * ensuring only chapters that are actually in the AI's context are selected.
 *
 * @param chapters - All video chapters
 * @param endTimeSeconds - End time of included transcript (in seconds)
 * @returns Array of chapter indices that should be selected
 */
export function findChaptersInRange(
  chapters: Chapter[],
  endTimeSeconds: number
): number[] {
  if (!chapters || chapters.length === 0) {
    return []
  }

  const includedIndices: number[] = []

  for (let i = 0; i < chapters.length; i++) {
    // Include chapter if it starts before the cutoff
    if (chapters[i].startSeconds < endTimeSeconds) {
      includedIndices.push(i)
    } else {
      // Chapters are typically ordered, so we can break early
      break
    }
  }

  return includedIndices
}
