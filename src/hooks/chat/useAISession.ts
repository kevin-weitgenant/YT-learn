import { useEffect, useState } from "react"

import type { Message } from "../../types/message"
import type { VideoContext } from "../../types/transcript"
import { useChatStore } from "../../stores/chatStore"
import { useSessionStore } from "../../stores/sessionStore"
import { ERROR_MESSAGES } from "../../utils/constants"
import { createAISession } from "../../utils/aiSession"

interface UseAISessionProps {
  videoContext: VideoContext | null
  shouldInitialize: boolean
}

/**
 * Manages the AI model session, including initialization, cleanup, and reset.
 * @param videoContext Context from the video for system prompts.
 * @param shouldInitialize Controls when the session is created.
 */
export function useAISession({
  videoContext,
  shouldInitialize
}: UseAISessionProps) {
  const [resetCount, setResetCount] = useState(0)

  const handleError = (message: string, error?: unknown) => {
    console.error(message, error)
    const errorDetails = error
      ? `: ${error instanceof Error ? error.message : "Unknown error"}`
      : ""
    const errorMessage: Message = {
      id: Date.now(),
      text: `${message}${errorDetails}`,
      sender: "bot"
    }
    useChatStore.setState({ messages: [errorMessage] })
    useSessionStore.getState().setIsSessionReady(false)
  }

  useEffect(() => {
    if (!shouldInitialize || !videoContext) {
      return
    }

    let isCancelled = false

    const initializeSession = async () => {
      // Clear previous state before creating a new session
      useSessionStore.getState().destroySession()

      try {
        const { session, tokenInfo } = await createAISession(videoContext)

        if (isCancelled) {
          session.destroy()
          return
        }

        useChatStore.getState().setMessages([])
        useSessionStore.getState().setSession(session)
        useChatStore.setState({
          tokenInfo
        })
      } catch (error) {
        if (isCancelled) return
        handleError(ERROR_MESSAGES.SESSION_INIT_FAILED, error)
      }
    }

    initializeSession()

    return () => {
      isCancelled = true
      // Also destroy the session on cleanup to handle fast re-renders
      useSessionStore.getState().destroySession()
    }
  }, [shouldInitialize, videoContext, resetCount])

  const resetSession = () => {
    const { setMessages } = useChatStore.getState()
    setMessages([])
    useChatStore.setState({ hasUserMessages: false })
    setResetCount((c) => c + 1)
  }

  return { resetSession }
}