import { useEffect, useState } from "react"
import { useStore } from "zustand"

import type { Message } from "../types/message"
import type { VideoContext } from "../types/transcript"
import { useAISession } from "./useAISession"
import { useModelAvailability } from "./useModelAvailability"
import { useStreamingResponse } from "./useStreamingResponse"
import { useChapterStore } from "../stores/chapterStore"
import { useChatStore } from "../stores/chatStore"

/**
 * Custom hook to unify AI session, streaming, and message management.
 * This hook integrates the following hooks:
 * - `useModelAvailability`: To check if the model is available and handle downloads.
 * - `useAISession`: To manage the AI session initialization and cleanup.
 * - `useStreamingResponse`: To handle streaming AI responses.
 * It also manages the message state and provides a unified interface for chat functionality.
 *
 * @param videoContext The video context to use for the session.
 * @returns A unified interface for managing a chat session.
 */
export function useChatSession(videoContext: VideoContext | null) {
  // Get chat store setters and state
  const { 
    setSessionState, 
    messages, 
    setMessages, 
    setInputText 
  } = useChatStore()
  
  const [usingRAG, setUsingRAG] = useState(false)
  const setChapters = useChapterStore((state) => state.setChapters)

  // 1. Model availability
  const model = useModelAvailability()

  // 2. AI session management
  const aiSession = useAISession({
    videoContext,
    shouldInitialize: model.availability === "available" && !!videoContext?.transcript,
    setUsingRAG
  })

  // 3. Message streaming
  const streamer = useStreamingResponse(
    aiSession.session,
    messages,
    setMessages,
    aiSession.systemTokens
  )

  // Effect to handle initialization messages
  useEffect(() => {
    if (aiSession.initializationMessages.length > 0) {
      setMessages(aiSession.initializationMessages)
    }
  }, [aiSession.initializationMessages, setMessages])

  // Handle session reset
  const handleResetSession = async () => {
    await aiSession.resetSession()
    streamer.resetTokenInfo()
    setMessages([]) // Clear all messages
    if (videoContext?.chapters) {
      setChapters(videoContext.chapters) // Reinitialize chapters
    }
  }

  // Send message function that uses the streamer
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !aiSession.session) return

    await streamer.sendMessage(text)
    setInputText("")
  }

  // Update the store whenever the state from hooks changes
  useEffect(() => {
    const hasUserMessages = messages.some((m) => m.sender === "user")
    const hasTranscriptError = !!videoContext?.error

    setSessionState({
      ...model,
      ...aiSession,
      ...streamer,
      messages,
      hasUserMessages,
      hasTranscriptError,
      usingRAG,
      // Override store actions with the ones from the hooks
      sendMessage: handleSendMessage,
      handleResetSession: handleResetSession,
      stopStreaming: streamer.stopStreaming,
      startDownload: model.startDownload,
    })
  }, [
    model,
    aiSession,
    streamer,
    messages,
    videoContext,
    usingRAG,
    setSessionState
  ])
}
