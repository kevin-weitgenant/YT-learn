import type { LanguageModelSession } from "~types/chrome-ai"
import type { VideoContext } from "~types/transcript"
import { CHARS_PER_TOKEN, estimateTokens } from "./tokenEstimation"
import {
  buildTranscriptFromSegments,
  truncateAtSegmentBoundary,
  findChaptersInRange
} from "./transcriptUtils"

interface SystemPromptResult {
  systemPrompt: string
  wasTruncated: boolean
  includedChapterIndices: number[]
}

/**
 * Creates system prompt for the chat, truncates at segment boundaries if needed.
 * Returns metadata about truncation for chapter selection updates.
 */
export async function createSystemPrompt(
  context: VideoContext,
  session: LanguageModelSession
): Promise<SystemPromptResult> {
  const inputQuota = session.inputQuota
  const threshold = Math.floor(inputQuota * 0.8)

  // Build full transcript from segments
  const fullTranscript = buildTranscriptFromSegments(context.transcriptSegments || [])
  const fullTranscriptTokens = estimateTokens(fullTranscript)

  let finalTranscript: string
  let wasTruncated = false
  let includedChapterIndices: number[] = []

  if (fullTranscriptTokens > threshold) {
    // Truncate at segment boundaries
    const maxChars = Math.floor(threshold * CHARS_PER_TOKEN)
    const truncationResult = truncateAtSegmentBoundary(
      context.transcriptSegments || [],
      maxChars
    )

    finalTranscript = truncationResult.finalText
    wasTruncated = truncationResult.wasTruncated

    console.log(
      `📄 Transcript truncated at segment boundary: ${fullTranscript.length} → ${finalTranscript.length} chars ` +
      `(${(context.transcriptSegments || []).length} → ${truncationResult.truncatedSegments.length} segments)`
    )

    // Calculate which chapters are covered by truncated transcript
    if (context.chapters && context.chapters.length > 0) {
      includedChapterIndices = findChaptersInRange(
        context.chapters,
        truncationResult.endTimeSeconds
      )

      console.log(
        `📑 Chapters included after truncation: ${includedChapterIndices.length}/${context.chapters.length}`
      )
    }
  } else {
    // No truncation needed - use full transcript
    finalTranscript = fullTranscript
    wasTruncated = false

    // All chapters are included
    if (context.chapters && context.chapters.length > 0) {
      includedChapterIndices = Array.from(
        { length: context.chapters.length },
        (_, i) => i
      )
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

