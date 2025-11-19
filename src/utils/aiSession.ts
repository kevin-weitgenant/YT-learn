import type { LanguageModelSession } from "../types/chrome-ai"
import type { TokenInfo } from "../types/message"
import type { VideoContext } from "../types/transcript"
import { AI_CONFIG } from "./constants"
import { createSystemPrompt } from "./systemPrompt"

interface AISessionResult {
  session: LanguageModelSession
  tokenInfo: TokenInfo
}

/**
 * Creates and initializes a new AI model session.
 * @param videoContext The video context to be used for the system prompt.
 * @returns A promise that resolves to an object containing the new session and token information.
 * @throws Will throw an error if the LanguageModel API is not available or if session creation fails.
 */
export async function createAISession(
  videoContext: VideoContext
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
  const systemPrompt = await createSystemPrompt(videoContext, session)
  console.timeEnd("System Prompt Appending")

  console.time("Token Usage Measurement")
  const systemTokenCount = await session.measureInputUsage(systemPrompt)
  console.timeEnd("Token Usage Measurement")

  const tokenInfo: TokenInfo = {
    systemTokens: systemTokenCount,
    conversationTokens: 0,
    totalTokens: systemTokenCount,
    inputQuota: session.inputQuota || 0,
    percentageUsed: (systemTokenCount / (session.inputQuota || 1)) * 100
  }

  return { session, tokenInfo }
}
