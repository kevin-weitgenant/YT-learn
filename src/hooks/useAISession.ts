import { useEffect } from "react"
import type { LanguageModelSession } from "../types/chrome-ai"
import type { Message } from "../types/message"
import type { VideoContext } from "../types/transcript"
import { useChatStore } from "../stores/chatStore"
import { AI_CONFIG, ERROR_MESSAGES } from "../utils/constants"
import { decideRAGStrategy } from "../utils/ragDecision"

interface UseAISessionProps {
  videoContext: VideoContext | null
  shouldInitialize: boolean
  setUsingRAG: (using: boolean) => void
}

/**
 * Custom hook to manage AI session initialization and cleanup.
 * Checks for Prompt API availability and creates a session based on video context.
 * All state is managed in the chatStore.
 * @param videoContext The video context to use for the session.
 */
export function useAISession({
  videoContext,
  shouldInitialize,
  setUsingRAG
}: UseAISessionProps) {
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
      systemPrompt = "You are a helpful and friendly assistant."
      // Append system prompt to empty session
      await session.append([{ role: "system", content: systemPrompt }])
      setUsingRAG(false)
    } else {
      // decideRAGStrategy will append the system prompt internally
      const { systemPrompt: ragPrompt, shouldUseRAG } =
        await decideRAGStrategy(context, session)
      systemPrompt = ragPrompt
      setUsingRAG(shouldUseRAG)
    }

    console.log(
      `💬 System Prompt (${systemPrompt.length} chars):`,
      systemPrompt.substring(0, 150) + "..."
    )

    // Measure system prompt tokens
    let systemTokenCount = 0
    try {
      systemTokenCount = await session.measureInputUsage(systemPrompt)
      const { setMessages } = useChatStore.getState()
      setMessages([]) // Clear messages on new session
      const tokenInfo = {
        systemTokens: systemTokenCount,
        conversationTokens: 0,
        totalTokens: systemTokenCount,
        inputQuota: session.inputQuota || 0,
        percentageUsed:
          ((systemTokenCount / (session.inputQuota || 1)) * 100)
      }
      useChatStore.setState({ tokenInfo })

      console.log("🔧 [SESSION CREATED - TOKEN BREAKDOWN]")
      console.log("  System prompt length:", systemPrompt.length, "chars")
      console.log("  System prompt tokens:", systemTokenCount)
      console.log("  session.inputUsage:", session.inputUsage ?? "undefined")
      console.log("  session.inputQuota:", session.inputQuota ?? "undefined")
      console.log(
        "  System % of quota:",
        ((systemTokenCount / (session.inputQuota || 1)) * 100).toFixed(2) + "%"
      )
      console.log("---")
    } catch (error) {
      console.error("Failed to measure system tokens:", error)
    }

    return session
  }

  useEffect(() => {
    const initializeSession = async () => {
      // Don't initialize until we have video context AND model is available
      if (!shouldInitialize || !videoContext) {
        return
      }

      if (!("LanguageModel" in self)) {
        useChatStore.setState({ apiAvailable: false })
        const errorMessage: Message = {
          id: Date.now(),
          text: ERROR_MESSAGES.API_NOT_AVAILABLE,
          sender: "bot"
        }
        useChatStore.setState({ messages: [errorMessage] })
        return
      }

      useChatStore.setState({ apiAvailable: true })

      try {
        const newSession = await createSession(videoContext)
        useChatStore.setState({ session: newSession, isSessionReady: true })
      } catch (error) {
        console.error("Failed to create session:", error)
        const errorMessage: Message = {
          id: Date.now(),
          text: `${ERROR_MESSAGES.SESSION_INIT_FAILED}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          sender: "bot"
        }
        useChatStore.setState({ messages: [errorMessage], isSessionReady: false })
      }
    }

    initializeSession()

    // Cleanup: destroy session on unmount or when videoContext changes
    return () => {
      const { session } = useChatStore.getState()
      session?.destroy()
      useChatStore.setState({ session: null, isSessionReady: false })
    }
  }, [videoContext, shouldInitialize])

  // Reset session function - destroys current session and creates a new one
  const resetSession = async () => {
    try {
      // Destroy current session if it exists
      const { session } = useChatStore.getState()
      if (session?.destroy) {
        session.destroy()
      }
      useChatStore.setState({ session: null, isSessionReady: false })

      // Create new session with current video context
      const newSession = await createSession(videoContext)
      useChatStore.setState({ session: newSession, isSessionReady: true })
    } catch (error) {
      console.error("Failed to reset session:", error)
      const errorMessage: Message = {
        id: Date.now(),
        text: `Failed to reset session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        sender: "bot"
      }
      useChatStore.setState({ messages: [errorMessage], isSessionReady: false })
    }
  }

  // Set the action in the store so components can call it
  useEffect(() => {
    useChatStore.setState({ handleResetSession: resetSession })
  }, [videoContext])
}