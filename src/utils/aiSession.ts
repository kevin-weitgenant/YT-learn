import type { LanguageModelSession } from "../types/chrome-ai"
import type { TokenInfo } from "../types/message"
import type { VideoContext } from "../types/transcript"
import { AI_CONFIG } from "./constants"
import { createSystemPrompt } from "./systemPrompt"
import { useChapterStore } from "../stores/chapterStore"
import { indicesToRangeString } from "./chapterRangeParser"

interface AISessionResult {
  session: LanguageModelSession
  tokenInfo: TokenInfo
}

/**
 * Creates and initializes a new AI model session.
 * Updates chapterStore based on transcript truncation.
 * @param videoContext The video context to be used for the system prompt.
 * @param selectedChapterIndices Optional array of chapter indices to include in context.
 * @returns A promise that resolves to an object containing the new session and token information.
 * @throws Will throw an error if the LanguageModel API is not available or if session creation fails.
 */
export async function createAISession(
  videoContext: VideoContext,
  selectedChapterIndices?: number[]
): Promise<AISessionResult> {
  if (!("LanguageModel" in self)) {
    throw new Error("LanguageModel API not available.")
  }

  const languageModel = self.LanguageModel!

  console.time("AI Session Creation")
  const session = await languageModel.create({
    temperature: AI_CONFIG.temperature,
    topK: AI_CONFIG.topK
  })
  console.timeEnd("AI Session Creation")

  console.time("System Prompt Appending")
  const { systemPrompt, wasTruncated, includedChapterIndices } =
    await createSystemPrompt(videoContext, session, selectedChapterIndices)
  console.timeEnd("System Prompt Appending")

  // Update chapter selection if truncation occurred
  // Only update if we're not using manual chapter selection, or if the included chapters differ
  if (wasTruncated && videoContext.chapters && videoContext.chapters.length > 0) {
    const shouldUpdate =
      selectedChapterIndices === undefined ||
      JSON.stringify(includedChapterIndices) !== JSON.stringify(selectedChapterIndices)

    if (shouldUpdate) {
      console.log(
        `🔄 Updating chapter selection due to truncation (${includedChapterIndices.length}/${videoContext.chapters.length} chapters included)`
      )
      useChapterStore.setState({
        selectedChapters: includedChapterIndices,
        rangeInput: indicesToRangeString(includedChapterIndices)
      })
    }
  }

  console.time("Token Usage Measurement")
  const systemTokenCount = await session.measureInputUsage(systemPrompt)
  console.timeEnd("Token Usage Measurement")

  const tokenInfo: TokenInfo = {
    systemTokens: systemTokenCount,
    conversationTokens: 0,
    totalTokens: session.inputUsage ?? systemTokenCount, // Use actual session value
    inputQuota: session.inputQuota || 0,
    percentageUsed: ((session.inputUsage ?? systemTokenCount) / (session.inputQuota || 1)) * 100
  }

  return { session, tokenInfo }
}
