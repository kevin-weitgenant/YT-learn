import type { LanguageModelSession } from "~types/chrome-ai"
import type { VideoContext } from "~types/transcript"
import { CHARS_PER_TOKEN, estimateTokens } from "./tokenEstimation"
import {
  buildTranscriptFromSegments,
  truncateAtSegmentBoundary,
  findChaptersInRange
} from "./transcriptUtils"
import { filterTranscriptSegmentsByChapters } from "./transcriptValidator"
import { useChapterStore } from "~stores/chapterStore"

interface SystemPromptResult {
  systemPrompt: string
  wasTruncated: boolean
  includedChapterIndices: number[]
}

/**
 * Creates system prompt for the chat, truncates at segment boundaries if needed.
 * Returns metadata about truncation for chapter selection updates.
 *
 * @param context - Video context with transcript and chapters
 * @param session - AI session for token measurement
 * @param selectedChapterIndices - Optional array of chapter indices to include (if provided, only these chapters are used)
 */
export async function createSystemPrompt(
  context: VideoContext,
  session: LanguageModelSession,
  selectedChapterIndices?: number[]
): Promise<SystemPromptResult> {
  const inputQuota = session.inputQuota
  const threshold = Math.floor(inputQuota * 0.8)

  // If selectedChapterIndices provided, filter transcript by those chapters
  let segmentsToUse = context.transcriptSegments || []
  let usingChapterFilter = false

  if (selectedChapterIndices !== undefined) {
    usingChapterFilter = true

    // Empty selection means no video context
    if (selectedChapterIndices.length === 0) {
      const systemPrompt = `You are a helpful AI assistant. The user has not selected any video chapters for context. You can answer general questions or help them understand how to select chapters to discuss video content.`

      await session.append([{ role: "system", content: systemPrompt }])

      return {
        systemPrompt,
        wasTruncated: false,
        includedChapterIndices: []
      }
    }

    // Filter segments by selected chapters, respecting truncation limits
    if (context.chapters && context.chapters.length > 0) {
      // Get truncation info from store
      const truncatedChapter = useChapterStore.getState().truncatedChapter

      segmentsToUse = filterTranscriptSegmentsByChapters(
        context.transcriptSegments || [],
        context.chapters,
        selectedChapterIndices,
        truncatedChapter
      )
    }
  }

  // Build transcript from segments (filtered or full)
  const fullTranscript = buildTranscriptFromSegments(segmentsToUse)
  const fullTranscriptTokens = estimateTokens(fullTranscript)

  let finalTranscript: string
  let wasTruncated = false
  let includedChapterIndices: number[] = []

  if (fullTranscriptTokens > threshold) {
    // Truncate at segment boundaries
    const maxChars = Math.floor(threshold * CHARS_PER_TOKEN)
    const truncationResult = truncateAtSegmentBoundary(
      segmentsToUse,
      maxChars
    )

    finalTranscript = truncationResult.finalText
    wasTruncated = truncationResult.wasTruncated

    console.log(
      `📄 Transcript truncated at segment boundary: ${fullTranscript.length} → ${finalTranscript.length} chars ` +
      `(${segmentsToUse.length} → ${truncationResult.truncatedSegments.length} segments)`
    )

    // Calculate which chapters are covered by truncated transcript
    if (context.chapters && context.chapters.length > 0) {
      if (usingChapterFilter && selectedChapterIndices) {
        // When using chapter filter, determine which of the selected chapters fit
        const selectedChapters = selectedChapterIndices.map(i => context.chapters![i])
        const truncatedChapterIndices = selectedChapters
          .map((chapter, idx) => ({
            originalIndex: selectedChapterIndices[idx],
            startSeconds: chapter.startSeconds
          }))
          .filter(item => item.startSeconds < truncationResult.endTimeSeconds)
          .map(item => item.originalIndex)

        includedChapterIndices = truncatedChapterIndices

        console.log(
          `📑 Selected chapters included after truncation: ${includedChapterIndices.length}/${selectedChapterIndices.length}`
        )
      } else {
        // Original behavior: find all chapters in range
        includedChapterIndices = findChaptersInRange(
          context.chapters,
          truncationResult.endTimeSeconds
        )

        console.log(
          `📑 Chapters included after truncation: ${includedChapterIndices.length}/${context.chapters.length}`
        )
      }
    }
  } else {
    // No truncation needed - use full transcript
    finalTranscript = fullTranscript
    wasTruncated = false

    // Determine included chapters
    if (context.chapters && context.chapters.length > 0) {
      if (usingChapterFilter && selectedChapterIndices) {
        // When using chapter filter, all selected chapters are included
        includedChapterIndices = [...selectedChapterIndices]
      } else {
        // Original behavior: all chapters are included
        includedChapterIndices = Array.from(
          { length: context.chapters.length },
          (_, i) => i
        )
      }
    }
  }

  const systemPrompt = `You are an assistant that answers questions about the video: ${context.title}. Here is the transcript:\n\n${finalTranscript}`

  await session.append([{ role: "system", content: systemPrompt }])

  return {
    systemPrompt,
    wasTruncated,
    includedChapterIndices
  }
}

