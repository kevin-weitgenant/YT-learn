import { useEffect, useState } from "react"

import type { VideoContext } from "../../types/transcript"
import { useAISession } from "./useAISession"
import { useModelAvailability } from "./useModelAvailability"
import { useStreamingResponse } from "./useStreamingResponse"
import { useChatStore } from "../../stores/chatStore"


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
