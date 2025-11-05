import { sendToBackground } from "@plasmohq/messaging"
import type { LanguageModelSession } from "~types/chrome-ai"
import type { VideoContext } from "~types/transcript"
import { RAG_CONFIG } from "./constants"
import { estimateTokens } from "./tokenEstimation"

interface RAGDecisionResult {
  systemPrompt: string
  shouldUseRAG: boolean
}

export async function decideRAGStrategy(
  context: VideoContext,
  session: LanguageModelSession
): Promise<RAGDecisionResult> {
  // Use existing session to get inputQuota - no temp session needed!
  const inputQuota = session.inputQuota
  const transcriptTokens = estimateTokens(context.transcript)
  const ragThreshold = Math.floor(inputQuota * RAG_CONFIG.threshold)

  if (transcriptTokens > ragThreshold) {
    // === RAG MODE ===
    console.log(`🎯 RAG Decision: Using RAG mode (transcript: ${transcriptTokens} tokens > threshold: ${ragThreshold} tokens)`)
    
    const ragSystemPrompt = `You are an assistant that answers questions about the video: ${context.title}. You will receive the question of the user and some relevant chunks of the transcript. Make use of them and write the best reply.`
    
    // Check if embeddings exist for this video
    const { exists } = await sendToBackground({
      name: "checkEmbeddings",
      body: { videoId: context.videoId }
    })
    
    // Generate embeddings if they don't exist
    if (!exists) {
      await sendToBackground({
        name: "embedTranscript",
        body: {
          transcript: context.transcript,
          url: context.url,
          videoTitle: context.title
        }
      })
    }

    else {
      console.log("Embeddings already exist for this videoid and chunk size")
    }
    
    // Append system prompt to the session
    await session.append([
      { role: 'system', content: ragSystemPrompt }
    ])
    
    return { systemPrompt: ragSystemPrompt, shouldUseRAG: true }
  } else {
    // === FULL TRANSCRIPT MODE ===
    console.log(`📄 RAG Decision: Using full transcript mode (transcript: ${transcriptTokens} tokens <= threshold: ${ragThreshold} tokens)`)
    
    const fullTranscriptPrompt = `You are an assistant that answers questions about the video: ${context.title}. Here is the full transcript:\n\n${context.transcript}`
    
    // Append system prompt to the session
    await session.append([
      { role: 'system', content: fullTranscriptPrompt }
    ])
    
    return { systemPrompt: fullTranscriptPrompt, shouldUseRAG: false }
  }
}

