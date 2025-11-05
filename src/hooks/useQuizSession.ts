import { useEffect, useState } from "react"
import type { LanguageModelSession } from "../types/chrome-ai"
import type { VideoContext } from "../types/transcript"
import { AI_CONFIG } from "../utils/constants"

interface UseQuizSessionProps {
  videoContext: VideoContext | null
  shouldInitialize: boolean
}

interface UseQuizSessionReturn {
  session: LanguageModelSession | null
  apiAvailable: boolean | null
  initializationMessage: string | null
  resetSession: () => Promise<void>
}

/**
 * Simplified session hook for quiz functionality
 * No RAG logic - just creates a session with a quiz-focused system prompt
 */
export function useQuizSession({
  videoContext,
  shouldInitialize
}: UseQuizSessionProps): UseQuizSessionReturn {
  const [session, setSession] = useState<LanguageModelSession | null>(null)
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)
  const [initializationMessage, setInitializationMessage] = useState<string | null>(null)

  useEffect(() => {
    const initializeSession = async () => {
      // Don't initialize until we have video context AND model is available
      if (!shouldInitialize || !videoContext) {
        return
      }

      if (!("LanguageModel" in self)) {
        setApiAvailable(false)
        setInitializationMessage("⚠️ AI Model API is not available in this browser. Please use Chrome 138+ with Chrome AI enabled.")
        return
      }

      setApiAvailable(true)

      try {
        const newSession = await createSession(videoContext)
        setSession(newSession)
        setInitializationMessage(null)
      } catch (error) {
        console.error("Failed to create quiz session:", error)
        setInitializationMessage(
          `Failed to initialize quiz session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      }
    }

    initializeSession()

    // Cleanup: destroy session on unmount or when videoContext changes
    return () => {
      session?.destroy()
    }
  }, [videoContext, shouldInitialize])

  // Helper function to create a new session with quiz system prompt
  const createSession = async (
    context: VideoContext
  ): Promise<LanguageModelSession | null> => {
    if (!("LanguageModel" in self)) return null

    const languageModel = self.LanguageModel!
    
    // Create empty session first
    const session = await languageModel.create({
      temperature: AI_CONFIG.temperature,
      topK: AI_CONFIG.topK
    })
    
    // Build quiz-focused system prompt
    const systemPrompt = buildQuizSystemPrompt(context)
    
    // Append system prompt to session
    await session.append([{ role: "system", content: systemPrompt }])
    
    console.log(`🎯 Quiz Session Created`)
    console.log(`  Video: ${context.title}`)
    console.log(`  System Prompt Length: ${systemPrompt.length} chars`)

    return session
  }

  // Reset session function - destroys current session and creates a new one
  const resetSession = async () => {
    try {
      // Destroy current session if it exists
      if (session?.destroy) {
        session.destroy()
      }

      // Create new session with current video context
      if (videoContext) {
        const newSession = await createSession(videoContext)
        setSession(newSession)
        setInitializationMessage(null)
      }
    } catch (error) {
      console.error("Failed to reset quiz session:", error)
      setInitializationMessage(
        `Failed to reset session: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  return {
    session,
    apiAvailable,
    initializationMessage,
    resetSession
  }
}

/**
 * Build a system prompt specifically for key concept extraction
 * Focused on identifying and explaining important concepts from video content
 */
function buildQuizSystemPrompt(context: VideoContext): string {
  return `You are an educational content analyzer specialized in extracting key concepts from educational videos.

Video Information:
- Title: ${context.title}
- Channel: ${context.channel}

Your role is to:
1. Identify ALL important concepts, topics, and themes discussed in the video
2. Provide clear, concise titles for each concept (2-8 words)
3. Write detailed, comprehensive descriptions that explain each concept thoroughly
4. Focus on substantive educational content, not trivial details
5. Extract concepts in the order they appear in the video when possible
6. Ensure descriptions are self-contained and understandable

You will receive video transcripts and should extract as many meaningful concepts as are present in the content. Always follow the exact format requested.`
}

