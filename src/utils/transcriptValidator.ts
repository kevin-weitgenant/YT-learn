import type { VideoContext, TranscriptSegment, Chapter } from "~types/transcript"
import type { LanguageModelSession } from "~types/chrome-ai"
import { estimateTokens } from "./tokenEstimation"
import { buildTranscriptFromSegments } from "./transcriptUtils"

export interface ValidationResult {
  /** Valid chapter indices that fit within token limits */
  validIndices: number[]
  /** Indices that were removed due to token limits */
  removedIndices: number[]
  /** Estimated token count for valid selection */
  tokenCount: number
  /** Whether truncation occurred */
  wasTruncated: boolean
}

/**
 * Filters transcript segments to include only those within selected chapters' time ranges.
 *
 * @param transcriptSegments - Full transcript segments array
 * @param chapters - All video chapters
 * @param selectedIndices - Indices of selected chapters (sorted)
 * @returns Filtered transcript segments for selected chapters only
 */
export function filterTranscriptSegmentsByChapters(
  transcriptSegments: TranscriptSegment[],
  chapters: Chapter[],
  selectedIndices: number[]
): TranscriptSegment[] {
  if (!transcriptSegments || transcriptSegments.length === 0) return []
  if (!chapters || chapters.length === 0) return transcriptSegments
  if (!selectedIndices || selectedIndices.length === 0) return []

  // Sort selected indices to process in order
  const sortedIndices = [...selectedIndices].sort((a, b) => a - b)

  // Build time ranges for selected chapters
  const timeRanges: Array<{ start: number; end: number }> = []

  for (const idx of sortedIndices) {
    if (idx < 0 || idx >= chapters.length) continue

    const currentChapter = chapters[idx]
    const nextChapter = chapters[idx + 1]

    timeRanges.push({
      start: currentChapter.startSeconds,
      // If there's a next chapter, use its start time; otherwise use Infinity
      end: nextChapter ? nextChapter.startSeconds : Infinity
    })
  }

  // Filter segments that fall within any selected chapter's time range
  return transcriptSegments.filter(segment => {
    const segmentStart = segment.start
    const segmentEnd = segment.start + segment.duration

    return timeRanges.some(range => {
      // Include segment if it overlaps with the chapter's time range
      return segmentStart < range.end && segmentEnd > range.start
    })
  })
}

/**
 * Validates chapter selection against token limits and auto-truncates from end if needed.
 * Uses fast estimation first, then precise measurement if needed.
 *
 * @param videoContext - Full video context with transcript and chapters
 * @param selectedIndices - User's selected chapter indices
 * @param session - AI session for token measurement (optional, uses estimation if not provided)
 * @param maxTokens - Maximum allowed tokens (uses session.inputQuota if not provided)
 * @param safetyMargin - Percentage of maxTokens to reserve for system prompt overhead (default 0.8)
 * @returns Validation result with valid indices and truncation info
 */
export async function validateAndTruncateSelection(
  videoContext: VideoContext,
  selectedIndices: number[],
  session: LanguageModelSession | null,
  maxTokens?: number,
  safetyMargin: number = 0.8
): Promise<ValidationResult> {
  const { transcriptSegments, chapters } = videoContext

  // Edge cases
  if (!transcriptSegments || transcriptSegments.length === 0) {
    return {
      validIndices: [],
      removedIndices: selectedIndices,
      tokenCount: 0,
      wasTruncated: selectedIndices.length > 0
    }
  }

  if (!chapters || chapters.length === 0) {
    // No chapters - validate full transcript
    const fullTranscript = buildTranscriptFromSegments(transcriptSegments)
    const tokenCount = estimateTokens(fullTranscript)
    const threshold = maxTokens ? Math.floor(maxTokens * safetyMargin) : Infinity

    return {
      validIndices: [],
      removedIndices: [],
      tokenCount,
      wasTruncated: tokenCount > threshold
    }
  }

  if (selectedIndices.length === 0) {
    return {
      validIndices: [],
      removedIndices: [],
      tokenCount: 0,
      wasTruncated: false
    }
  }

  // Determine token limit
  const quota = session?.inputQuota ?? maxTokens ?? Infinity
  const threshold = Math.floor(quota * safetyMargin)

  // Sort indices to ensure we process in order
  const sortedIndices = [...selectedIndices].sort((a, b) => a - b)

  // Try all selected chapters first
  let currentIndices = [...sortedIndices]
  let removedIndices: number[] = []
  let wasTruncated = false

  while (currentIndices.length > 0) {
    // Filter transcript by current selection
    const filteredSegments = filterTranscriptSegmentsByChapters(
      transcriptSegments,
      chapters,
      currentIndices
    )

    const filteredTranscript = buildTranscriptFromSegments(filteredSegments)

    // Fast estimation first
    const estimatedTokens = estimateTokens(filteredTranscript)

    // If estimation is within limits, we might be good
    if (estimatedTokens <= threshold) {
      // If we have a session, do precise measurement to confirm
      if (session) {
        try {
          const preciseTokens = await session.measureInputUsage(filteredTranscript)

          if (preciseTokens <= threshold) {
            // Success! This selection fits
            return {
              validIndices: currentIndices,
              removedIndices,
              tokenCount: preciseTokens,
              wasTruncated
            }
          }
          // Precise measurement exceeded, need to remove more
        } catch (error) {
          console.warn("Token measurement failed, using estimation:", error)
          // Fall back to estimation
          return {
            validIndices: currentIndices,
            removedIndices,
            tokenCount: estimatedTokens,
            wasTruncated
          }
        }
      } else {
        // No session available, trust the estimation
        return {
          validIndices: currentIndices,
          removedIndices,
          tokenCount: estimatedTokens,
          wasTruncated
        }
      }
    }

    // Exceeds limit - remove last chapter and try again
    const removedIndex = currentIndices.pop()!
    removedIndices.unshift(removedIndex) // Add to front to maintain order
    wasTruncated = true
  }

  // All chapters removed - nothing fits
  return {
    validIndices: [],
    removedIndices: sortedIndices,
    tokenCount: 0,
    wasTruncated: true
  }
}

/**
 * Estimates maximum number of chapters that can fit within token limit.
 * Useful for UI to show limits before user makes selection.
 *
 * @param videoContext - Full video context
 * @param session - AI session for token measurement
 * @returns Estimated max selectable chapter count
 */
export async function estimateMaxSelectableChapters(
  videoContext: VideoContext,
  session: LanguageModelSession | null
): Promise<number> {
  const { chapters } = videoContext

  if (!chapters || chapters.length === 0) return 0
  if (!session) return chapters.length // No session, can't measure

  // Try selecting all chapters and see how many fit
  const allIndices = Array.from({ length: chapters.length }, (_, i) => i)
  const result = await validateAndTruncateSelection(
    videoContext,
    allIndices,
    session
  )

  return result.validIndices.length
}
