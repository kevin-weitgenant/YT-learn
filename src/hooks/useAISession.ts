import { useEffect, useState } from "react"
import type { LanguageModelSession } from "../types/chrome-ai"
import type { Message } from "../types/message"
import type { VideoContext } from "../types/transcript"
import { AI_CONFIG, buildSystemPrompt, ERROR_MESSAGES } from "../utils/constants"
import { decideRAGStrategy } from "../utils/ragDecision"

interface UseAISessionProps {
  videoContext: VideoContext | null
  shouldInitialize: boolean
  setUsingRAG: (using: boolean) => void
}

interface UseAISessionReturn {
  session: LanguageModelSession | null
  apiAvailable: boolean | null
  initializationMessages: Message[]
  resetSession: () => Promise<void>
  systemTokens: number
}

/**
 * Custom hook to manage AI session initialization and cleanup.
 * Checks for Prompt API availability and creates a session based on video context.
 * @param videoContext The video context to use for the session.
 */
export function useAISession({
  videoContext,
  shouldInitialize,
  setUsingRAG
}: UseAISessionProps): UseAISessionReturn {
  const [session, setSession] = useState<LanguageModelSession | null>(null)
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)
  const [initializationMessages, setInitializationMessages] = useState<
    Message[]
  >([])
  const [systemTokens, setSystemTokens] = useState<number>(0)

  useEffect(() => {
    const initializeSession = async () => {
      // Don't initialize until we have video context AND model is available
      if (!shouldInitialize || !videoContext) {
        return
      }

      if (!("LanguageModel" in self)) {
        setApiAvailable(false)
        const errorMessage: Message = {
          id: Date.now(),
          text: ERROR_MESSAGES.API_NOT_AVAILABLE,
          sender: "bot"
        }
        setInitializationMessages([errorMessage])
        return
      }

      setApiAvailable(true)

      try {
        const newSession = await createSession(videoContext)
        setSession(newSession)
      } catch (error) {
        console.error("Failed to create session:", error)
        const errorMessage: Message = {
          id: Date.now(),
          text: `${ERROR_MESSAGES.SESSION_INIT_FAILED}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          sender: "bot"
        }
        setInitializationMessages([errorMessage])
      }
    }

    initializeSession()

    // Cleanup: destroy session on unmount or when videoContext changes
    return () => {
      session?.destroy()
    }
  }, [videoContext, shouldInitialize])

  // Helper function to create a new session with dynamic system prompt
  const createSession = async (
    context?: VideoContext
  ): Promise<LanguageModelSession | null> => {
    if (!("LanguageModel" in self)) return null

    const languageModel = self.LanguageModel!
    
    // Create empty session first (no initialPrompts - will be added via append())
    const session = await languageModel.create({
      temperature: AI_CONFIG.temperature,
      topK: AI_CONFIG.topK
      // NO initialPrompts - system prompt will be appended by decideRAGStrategy
    })
    
    let systemPrompt: string
    
    // Decide strategy based on context and append system prompt
    if (!context) {
      systemPrompt = buildSystemPrompt()
      // Append system prompt to empty session
      await session.append([{ role: "system", content: systemPrompt }])
      setUsingRAG(false)
    } else {
      // decideRAGStrategy will append the system prompt internally
      const { systemPrompt: ragPrompt, shouldUseRAG } = await decideRAGStrategy(
        context,
        session
      )
      systemPrompt = ragPrompt
      setUsingRAG(shouldUseRAG)
    }
    
    console.log(`💬 System Prompt (${systemPrompt.length} chars):`, systemPrompt.substring(0, 150) + '...')

    // Measure system prompt tokens
    let systemTokenCount = 0
    try {
      systemTokenCount = await session.measureInputUsage(systemPrompt)
      setSystemTokens(systemTokenCount)
      
      console.log('🔧 [SESSION CREATED - TOKEN BREAKDOWN]')
      console.log('  System prompt length:', systemPrompt.length, 'chars')
      console.log('  System prompt tokens:', systemTokenCount)
      console.log('  session.inputUsage:', session.inputUsage ?? 'undefined')
      console.log('  session.inputQuota:', session.inputQuota ?? 'undefined')
      console.log('  System % of quota:', 
        ((systemTokenCount / (session.inputQuota || 1)) * 100).toFixed(2) + '%')
      console.log('---')
    } catch (error) {
      console.error('Failed to measure system tokens:', error)
    }

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
      // (systemTokens will be remeasured automatically in createSession)
      const newSession = await createSession(videoContext)
      setSession(newSession)
    } catch (error) {
      console.error("Failed to reset session:", error)
      const errorMessage: Message = {
        id: Date.now(),
        text: `Failed to reset session: ${error instanceof Error ? error.message : "Unknown error"}`,
        sender: "bot"
      }
      setInitializationMessages([errorMessage])
    }
  }

  return {
    session,
    apiAvailable,
    initializationMessages,
    resetSession,
    systemTokens
  }
}