import type { LanguageModelSession } from "~types/chrome-ai"
import type { VideoContext } from "~types/transcript"
import { CHARS_PER_TOKEN, estimateTokens } from "./tokenEstimation"



//create system prompt for the chat, truncates the transcript if it's too long.
export async function createSystemPrompt(
  context: VideoContext,
  session: LanguageModelSession
): Promise<string> {
  const inputQuota = session.inputQuota
  const transcriptTokens = estimateTokens(context.transcript)
  const threshold = Math.floor(inputQuota * 0.8)

  let finalTranscript = context.transcript

  if (transcriptTokens > threshold) {
    // Truncate transcript to fit
    const maxChars = Math.floor(threshold * CHARS_PER_TOKEN)
    finalTranscript = context.transcript.substring(0, maxChars)
    console.log(
      `📄 Transcript truncated: ${context.transcript.length} → ${finalTranscript.length} chars`
    )
  }

  const systemPrompt = `You are an assistant that answers questions about the video: ${context.title}. Here is the transcript:\n\n${finalTranscript}`

  await session.append([{ role: "system", content: systemPrompt }])

  return systemPrompt
}

