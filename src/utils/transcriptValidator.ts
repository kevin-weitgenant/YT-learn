import type { VideoContext, TranscriptSegment, Chapter } from "~types/transcript"
import type { LanguageModelSession } from "~types/chrome-ai"
import { estimateTokens } from "./tokenEstimation"
import { buildTranscriptFromSegments } from "./transcriptUtils"

/**
 * Information about a truncated chapter
 */
export interface ChapterTruncationInfo {
  /** Index of the chapter that was truncated */
  chapterIndex: number
  /** Number of transcript segments included from this chapter */
  segmentsIncluded: number
  /** Total number of segments in this chapter */
  segmentsTotal: number
  /** Percentage of chapter content included (0-100) */
  truncationPercentage: number
  /** Token count for the included portion of this chapter */
  tokenCount: number
  /** Cumulative token count up to and including this chapter */
  cumulativeTokens: number
}

export interface ValidationResult {
  /** Valid chapter indices that fit within token limits */
  validIndices: number[]
  /** Indices that were removed due to token limits */
  removedIndices: number[]
  /** Estimated token count for valid selection */
  tokenCount: number
  /** Whether truncation occurred */
  wasTruncated: boolean
  /** Information about the truncated chapter, if any */
  truncatedChapter: ChapterTruncationInfo | null
}

/**
 * Filters transcript segments to include only those within selected chapters' time ranges.
 * Optionally applies truncation to a specific chapter if truncationInfo is provided.
 *
 * @param transcriptSegments - Full transcript segments array
 * @param chapters - All video chapters
 * @param selectedIndices - Indices of selected chapters (sorted)
 * @param truncationInfo - Optional truncation info to limit segments for a specific chapter
 * @returns Filtered transcript segments for selected chapters only
 */
export function filterTranscriptSegmentsByChapters(
  transcriptSegments: TranscriptSegment[],
  chapters: Chapter[],
  selectedIndices: number[],
  truncationInfo?: ChapterTruncationInfo | null
): TranscriptSegment[] {
  if (!transcriptSegments || transcriptSegments.length === 0) return []
  if (!chapters || chapters.length === 0) return transcriptSegments
  if (!selectedIndices || selectedIndices.length === 0) return []

  // Sort selected indices to process in order
  const sortedIndices = [...selectedIndices].sort((a, b) => a - b)

  // Build time ranges for selected chapters
  const timeRanges: Array<{ start: number; end: number; chapterIndex: number }> = []

  for (const idx of sortedIndices) {
    if (idx < 0 || idx >= chapters.length) continue

    const currentChapter = chapters[idx]
    const nextChapter = chapters[idx + 1]

    timeRanges.push({
      start: currentChapter.startSeconds,
      // If there's a next chapter, use its start time; otherwise use Infinity
      end: nextChapter ? nextChapter.startSeconds : Infinity,
      chapterIndex: idx
    })
  }

  // Filter segments that fall within any selected chapter's time range
  const filteredSegments = transcriptSegments.filter(segment => {
    const segmentStart = segment.start
    const segmentEnd = segment.start + segment.duration

    return timeRanges.some(range => {
      // Include segment if it overlaps with the chapter's time range
      return segmentStart < range.end && segmentEnd > range.start
    })
  })

  // Apply truncation if provided
  if (truncationInfo && truncationInfo.segmentsIncluded < truncationInfo.segmentsTotal) {
    const truncatedChapterIdx = truncationInfo.chapterIndex

    // Get segments for the truncated chapter
    const chapterRange = timeRanges.find(r => r.chapterIndex === truncatedChapterIdx)
    if (!chapterRange) return filteredSegments

    const chapterSegments = filteredSegments.filter(segment => {
      const segmentStart = segment.start
      const segmentEnd = segment.start + segment.duration
      return segmentStart < chapterRange.end && segmentEnd > chapterRange.start
    })

    // Only include the first N segments from this chapter
    const truncatedChapterSegments = chapterSegments.slice(0, truncationInfo.segmentsIncluded)

    // Get the last included segment's end time for this chapter
    const lastIncludedSegment = truncatedChapterSegments[truncatedChapterSegments.length - 1]
    const truncationCutoff = lastIncludedSegment
      ? lastIncludedSegment.start + lastIncludedSegment.duration
      : chapterRange.start

    // Filter: include all segments before truncated chapter, and only included segments from truncated chapter
    return filteredSegments.filter(segment => {
      const segmentStart = segment.start

      // If segment is from the truncated chapter
      if (segmentStart >= chapterRange.start && segmentStart < chapterRange.end) {
        return segmentStart < truncationCutoff
      }

      // Keep all segments from other chapters
      return true
    })
  }

  return filteredSegments
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
      wasTruncated: selectedIndices.length > 0,
      truncatedChapter: null
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
      wasTruncated: tokenCount > threshold,
      truncatedChapter: null
    }
  }

  if (selectedIndices.length === 0) {
    return {
      validIndices: [],
      removedIndices: [],
      tokenCount: 0,
      wasTruncated: false,
      truncatedChapter: null
    }
  }

  // Determine token limit (80% budget for system prompt)
  const quota = session?.inputQuota ?? maxTokens ?? Infinity
  const threshold = Math.floor(quota * safetyMargin)

  // Process chapters in selection order (as they appear in selectedIndices array)
  // NOT sorted by index - we process in the order user selected them
  const orderedIndices = [...selectedIndices]

  // Phase 1: Calculate per-chapter token costs
  interface ChapterTokenInfo {
    index: number
    segments: TranscriptSegment[]
    tokenCount: number
  }

  const chapterTokens: ChapterTokenInfo[] = []

  for (const chapterIdx of orderedIndices) {
    if (chapterIdx < 0 || chapterIdx >= chapters.length) continue

    // Get segments for this chapter only
    const chapterSegments = filterTranscriptSegmentsByChapters(
      transcriptSegments,
      chapters,
      [chapterIdx]
    )

    if (chapterSegments.length === 0) continue

    const chapterTranscript = buildTranscriptFromSegments(chapterSegments)
    const tokens = estimateTokens(chapterTranscript)

    chapterTokens.push({
      index: chapterIdx,
      segments: chapterSegments,
      tokenCount: tokens
    })
  }

  // Phase 2: Apply 80% budget with cumulative tracking
  let cumulativeTokens = 0
  const validIndices: number[] = []
  let truncatedChapter: ChapterTruncationInfo | null = null

  for (let i = 0; i < chapterTokens.length; i++) {
    const chapter = chapterTokens[i]
    const potentialTotal = cumulativeTokens + chapter.tokenCount

    if (potentialTotal <= threshold) {
      // Chapter fully fits
      validIndices.push(chapter.index)
      cumulativeTokens += chapter.tokenCount
    } else {
      // Chapter would exceed budget - truncate it
      const remainingBudget = threshold - cumulativeTokens

      if (remainingBudget <= 0) {
        // No budget left, can't include any part of this chapter
        break
      }

      // Phase 3: Truncate this chapter to fit remaining budget
      let includedSegments = 0
      let segmentTokens = 0

      for (const segment of chapter.segments) {
        const segmentText = `${segment.text}\n`
        const segmentTokenCount = estimateTokens(segmentText)

        if (segmentTokens + segmentTokenCount <= remainingBudget) {
          includedSegments++
          segmentTokens += segmentTokenCount
        } else {
          break
        }
      }

      // Calculate truncation percentage
      const truncationPercentage = (includedSegments / chapter.segments.length) * 100

      truncatedChapter = {
        chapterIndex: chapter.index,
        segmentsIncluded: includedSegments,
        segmentsTotal: chapter.segments.length,
        truncationPercentage: Math.round(truncationPercentage),
        tokenCount: segmentTokens,
        cumulativeTokens: cumulativeTokens + segmentTokens
      }

      // Include this chapter in validIndices (even though truncated)
      validIndices.push(chapter.index)
      cumulativeTokens += segmentTokens

      // Stop processing further chapters
      break
    }
  }

  // If we have a session and truncation occurred, verify with precise measurement
  if (session && truncatedChapter) {
    try {
      // Build the actual transcript that will be used
      const finalSegments = filterTranscriptSegmentsByChapters(
        transcriptSegments,
        chapters,
        validIndices
      )

      // Apply truncation to the last chapter's segments
      const lastChapterIdx = validIndices[validIndices.length - 1]
      const lastChapterSegments = finalSegments.filter(seg => {
        const chapterForSegment = chapters.findIndex((ch, idx, arr) => {
          const nextCh = arr[idx + 1]
          return seg.start >= ch.startSeconds &&
                 (nextCh ? seg.start < nextCh.startSeconds : true)
        })
        return chapterForSegment === lastChapterIdx
      })

      // Take only the included segments
      const truncatedSegments = finalSegments.filter(seg => {
        const chapterForSegment = chapters.findIndex((ch, idx, arr) => {
          const nextCh = arr[idx + 1]
          return seg.start >= ch.startSeconds &&
                 (nextCh ? seg.start < nextCh.startSeconds : true)
        })

        if (chapterForSegment !== lastChapterIdx) return true

        // For the truncated chapter, only include up to segmentsIncluded
        const segmentIndexInChapter = lastChapterSegments.indexOf(seg)
        return segmentIndexInChapter < truncatedChapter!.segmentsIncluded
      })

      const finalTranscript = buildTranscriptFromSegments(truncatedSegments)
      const preciseTokens = await session.measureInputUsage(finalTranscript)

      // Update with precise measurement
      cumulativeTokens = preciseTokens
    } catch (error) {
      console.warn("Precise token measurement failed, using estimation:", error)
    }
  }

  return {
    validIndices,
    removedIndices: [],
    tokenCount: cumulativeTokens,
    wasTruncated: truncatedChapter !== null,
    truncatedChapter
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
