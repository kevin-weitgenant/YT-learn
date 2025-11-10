import { useEffect, useState } from "react"

import type { VideoContext } from "../../types/transcript"
import { useAISession } from "./useAISession"
import { useModelAvailability } from "./useModelAvailability"
import { useStreamingResponse } from "../streaming/useStreamingResponse"
import { useChatStore } from "../../stores/chatStore"

/**
 * Custom hook to unify AI session, streaming, and message management.
 * This hook orchestrates the following hooks, which manage their state in Zustand:
 * - `useModelAvailability`: To check if the model is available and handle downloads.
 * - `useAISession`: To manage the AI session initialization and cleanup.
 * - `useStreamingResponse`: To handle streaming AI responses.
 *
 * @param videoContext The video context to use for the session.
 */
export function useChatSession(videoContext: VideoContext | null) {
  // Use separate selectors to avoid creating new object references
  const availability = useChatStore((state) => state.availability)
  const messages = useChatStore((state) => state.messages)
  
  // transcript comes from videoContext, not store
  const transcript = videoContext?.transcript

  // 1. Model availability (updates store directly)
  useModelAvailability()

  // 2. AI session management (updates store directly)
  useAISession({
    videoContext,
    shouldInitialize: availability === "available" && !!transcript
  })

  // 3. Message streaming (updates store directly)
  useStreamingResponse()

  // 4. Update derived state in the store
  useEffect(() => {
    const hasUserMessages = messages.some((m) => m.sender === "user")
    const hasTranscriptError = !!videoContext?.error

    useChatStore.setState({
      hasUserMessages,
      hasTranscriptError
    })
  }, [videoContext, messages]) // depends on messages to re-calculate hasUserMessages
}
