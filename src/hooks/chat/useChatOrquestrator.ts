import { useEffect, useState } from "react"

import type { VideoContext } from "../../types/transcript"
import { useAISession } from "./useAISession"
import { useModelAvailability } from "./useModelAvailability"
import { useStreamingResponse } from "./useStreamingResponse"
import { useChatStore } from "../../stores/chatStore"
import { useModelAvailabilityStore } from "../../stores/modelAvailabilityStore"


export function useChatOrquestrator(videoContext: VideoContext | null) {
  // Use separate selectors to avoid creating new object references
  const availability = useModelAvailabilityStore((state) => state.availability)
  const messages = useChatStore((state) => state.messages)
  const session = useChatStore((state) => state.session)

  // transcript comes from videoContext, not store
  const transcript = videoContext?.transcript

  // 1. Model availability (updates store directly)
  useModelAvailability()

  // 2. AI session management (updates store directly)
  useAISession({
    videoContext,
    shouldInitialize: availability === "available" && !!transcript
  })

  // 3. Message streaming (pass session)
  useStreamingResponse(session)

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
