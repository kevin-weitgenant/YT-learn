import { useEffect, useRef, useState } from "react"
import type { LanguageModelSession } from "../types/chrome-ai"
import type { Message } from "../types/message"
import { ERROR_MESSAGES } from "../utils/constants"

export interface TokenInfo {
  systemTokens: number       // System message tokens
  conversationTokens: number // User + assistant tokens
  totalTokens: number        // System + conversation
  inputQuota: number         // Total token quota
  percentageUsed: number     // 0-100%
}

interface UseStreamingResponseReturn {
  isStreaming: boolean
  sendMessage: (text: string, options?: { displayText?: string; chunks?: import("../types/transcript").TranscriptChunk[] }) => Promise<void>
  tokenInfo: TokenInfo
  resetTokenInfo: () => void
  stopStreaming: () => void
}

/**
 * Custom hook to handle streaming AI responses
 * Manages message streaming state and updates messages in real-time
 */
export function useStreamingResponse(
  session: LanguageModelSession | null,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  systemTokens: number
): UseStreamingResponseReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    systemTokens: 0,
    conversationTokens: 0,
    totalTokens: 0,
    inputQuota: 0,
    percentageUsed: 0
  })
  const streamingMessageRef = useRef<string>("")
  const streamingMessageIdRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize token info when session is ready
  useEffect(() => {
    if (session?.inputUsage !== undefined && session?.inputQuota !== undefined) {
      const conversationTokens = session.inputUsage ?? 0
      const quota = session.inputQuota ?? 0
      const totalTokens = systemTokens + conversationTokens
      const percentageUsed = quota > 0 ? (totalTokens / quota) * 100 : 0

      console.log('📊 [TOKEN TRACKING - Initial Load]')
      console.log('  System tokens:', systemTokens)
      console.log('  Conversation tokens (session.inputUsage):', conversationTokens)
      console.log('  Total tokens:', totalTokens)
      console.log('  Input quota:', quota)
      console.log('  Percentage used:', percentageUsed.toFixed(2) + '%')
      console.log('---')

      setTokenInfo({
        systemTokens,
        conversationTokens,
        totalTokens,
        inputQuota: quota,
        percentageUsed
      })
    }
  }, [session, systemTokens])

  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  // Throttled update function to limit re-renders during streaming
  // Updates at most every 16ms (60 FPS) for optimal performance
  const updateStreamingMessage = (forceUpdate: boolean = false) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current
    const THROTTLE_MS = 16 // 60 FPS

    const performUpdate = () => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1]

        // If we're updating the current streaming message
        if (
          streamingMessageIdRef.current &&
          lastMessage?.id === streamingMessageIdRef.current
        ) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              text: streamingMessageRef.current
            }
          ]
        }

        // Create new bot message
        const newBotMessage: Message = {
          id: Date.now(),
          text: streamingMessageRef.current,
          sender: "bot"
        }
        streamingMessageIdRef.current = newBotMessage.id

        return [...prev, newBotMessage]
      })
      lastUpdateTimeRef.current = Date.now()
    }

    // Clear any pending timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
      updateTimeoutRef.current = null
    }

    // Force immediate update or check throttle window
    if (forceUpdate || timeSinceLastUpdate >= THROTTLE_MS) {
      performUpdate()
    } else {
      // Schedule update for next throttle window
      const delay = THROTTLE_MS - timeSinceLastUpdate
      updateTimeoutRef.current = setTimeout(() => {
        performUpdate()
        updateTimeoutRef.current = null
      }, delay)
    }
  }

  const sendMessage = async (text: string, options?: { displayText?: string; chunks?: import("../types/transcript").TranscriptChunk[] }) => {
    if (!text.trim() || isStreaming || !session) return

    // Log token state BEFORE sending message
    console.log('📤 [BEFORE SENDING MESSAGE]')
    console.log('  session.inputUsage: ' + (session.inputUsage ?? 'undefined'))
    console.log('  session.inputQuota: ' + (session.inputQuota ?? 'undefined'))
    console.log('---')

    // Add user message
    // Use displayText if provided (for RAG, to show only user query not full context)
    const userMessage: Message = {
      id: Date.now(),
      text: options?.displayText ?? text,
      sender: "user",
      retrievedChunks: options?.chunks
    }

    setMessages((prev) => [...prev, userMessage])

    // Set streaming state and create abort controller
    setIsStreaming(true)
    streamingMessageRef.current = ""
    abortControllerRef.current = new AbortController()

    try {
      // Stream the response with abort signal
      const stream = await session.promptStreaming(text, {
        signal: abortControllerRef.current.signal
      })
      let previousContent = ""

      for await (const chunk of stream) {
        // Calculate new content (avoiding repetition)
        const newChunk = chunk.startsWith(previousContent)
          ? chunk.slice(previousContent.length)
          : chunk

        streamingMessageRef.current += newChunk
        previousContent = chunk

        // Update with throttling (max 60 FPS)
        updateStreamingMessage()
      }

      // Force final update to ensure last chunk is displayed
      updateStreamingMessage(true)
    } catch (error) {
      // Ignore AbortError - it's expected when user stops streaming
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Streaming aborted by user")
        // Force final update to show partial content
        updateStreamingMessage(true)
      } else {
        console.error("Error during streaming:", error)
        const errorMessage: Message = {
          id: Date.now(),
          text: `${ERROR_MESSAGES.STREAMING_ERROR}: ${error instanceof Error ? error.message : "Unknown error"}`,
          sender: "bot"
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      // Clear any pending throttle timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
        updateTimeoutRef.current = null
      }

      // Reset streaming state and clear abort controller
      setIsStreaming(false)
      streamingMessageRef.current = ""
      streamingMessageIdRef.current = null
      abortControllerRef.current = null

      // Update token information from session
      if (session?.inputUsage !== undefined && session?.inputQuota !== undefined) {
        const conversationTokens = session.inputUsage ?? 0
        const quota = session.inputQuota ?? 0
        const totalTokens = systemTokens + conversationTokens
        const percentageUsed = quota > 0 ? (totalTokens / quota) * 100 : 0

        console.log('📊 [TOKEN TRACKING - After Message]')
        console.log('  System tokens:', systemTokens)
        console.log('  Conversation tokens (session.inputUsage):', conversationTokens)
        console.log('  Total tokens:', totalTokens)
        console.log('  Input quota:', quota)
        console.log('  Percentage used:', percentageUsed.toFixed(2) + '%')
        console.log('  Tokens this turn:', conversationTokens - (tokenInfo.conversationTokens || 0))
        console.log('---')

        setTokenInfo({
          systemTokens,
          conversationTokens,
          totalTokens,
          inputQuota: quota,
          percentageUsed
        })
      }
    }
  }

  const resetTokenInfo = () => {
    setTokenInfo({
      systemTokens: 0,
      conversationTokens: 0,
      totalTokens: 0,
      inputQuota: 0,
      percentageUsed: 0
    })
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      console.log("Stopping streaming...")
      abortControllerRef.current.abort()
    }
  }

  return { isStreaming, sendMessage, tokenInfo, resetTokenInfo, stopStreaming }
}

