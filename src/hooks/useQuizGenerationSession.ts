import { useEffect, useState } from "react"
import type { LanguageModelSession } from "../types/chrome-ai"
import { QUIZ_GENERATOR_SYSTEM_PROMPT } from "../components/quiz/quizPrompts"
import { AI_CONFIG } from "../utils/constants"

interface UseQuizGenerationSessionReturn {
  baseSession: LanguageModelSession | null
  isInitializing: boolean
  error: string | null
}

/**
 * Hook for managing the base quiz generation session
 * Creates a single base session with quiz generation system prompt
 * This session is then cloned by useStreamingQuizGeneration for each quiz
 */
export function useQuizGenerationSession(): UseQuizGenerationSessionReturn {
  const [baseSession, setBaseSession] = useState<LanguageModelSession | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize base session on mount
  useEffect(() => {
    initializeBaseSession()

    // Cleanup on unmount
    return () => {
      if (baseSession?.destroy) {
        baseSession.destroy()
      }
    }
  }, [])

  const initializeBaseSession = async () => {
    setIsInitializing(true)
    setError(null)

    try {
      // Check if API is available
      if (!("LanguageModel" in self)) {
        throw new Error("AI Model API is not available in this browser. Please use Chrome 138+ with Chrome AI enabled.")
      }

      const languageModel = self.LanguageModel!

      // Create empty session
      const session = await languageModel.create({
        temperature: AI_CONFIG.temperature,
        topK: AI_CONFIG.topK
      })

      // Append system prompt
      await session.append([{
        role: "system",
        content: QUIZ_GENERATOR_SYSTEM_PROMPT
      }])

      console.log("🎯 Quiz Generation Base Session Created")
      console.log(`  System Prompt Length: ${QUIZ_GENERATOR_SYSTEM_PROMPT.length} chars`)

      setBaseSession(session)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("Failed to create base quiz session:", err)
      setError(errorMessage)
    } finally {
      setIsInitializing(false)
    }
  }

  return {
    baseSession,
    isInitializing,
    error
  }
}
