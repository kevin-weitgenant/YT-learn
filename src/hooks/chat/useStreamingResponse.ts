import { useEffect, useRef } from "react"
import type { LanguageModelSession } from "../../types/chrome-ai"
import type { Message, TokenInfo } from "../../types/message"
import { useChatStore } from "../../stores/chatStore"
import { ERROR_MESSAGES } from "../../utils/constants"

/**
 * Custom hook to handle streaming AI responses
 * Manages message streaming state and updates messages in real-time
 */
export function useStreamingResponse(session: LanguageModelSession | null) {
  const streamingMessageRef = useRef<string>("")
  const streamingMessageIdRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  // Throttled update function to limit re-renders during streaming
  const updateStreamingMessage = (forceUpdate: boolean = false) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current
    const THROTTLE_MS = 16 // 60 FPS

    const performUpdate = () => {
      const { updateLastMessage, addMessage } = useChatStore.getState()
      const messages = useChatStore.getState().messages
      const lastMessage = messages[messages.length - 1]

      if (
        streamingMessageIdRef.current &&
        lastMessage?.id === streamingMessageIdRef.current
      ) {
        updateLastMessage(streamingMessageRef.current)
      } else {
        const newBotMessage: Message = {
          id: Date.now(),
          text: streamingMessageRef.current,
          sender: "bot"
        }
        streamingMessageIdRef.current = newBotMessage.id
        addMessage(newBotMessage)
      }
      lastUpdateTimeRef.current = Date.now()
    }

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
      updateTimeoutRef.current = null
    }

    if (forceUpdate || timeSinceLastUpdate >= THROTTLE_MS) {
      performUpdate()
    } else {
      const delay = THROTTLE_MS - timeSinceLastUpdate
      updateTimeoutRef.current = setTimeout(() => {
        performUpdate()
        updateTimeoutRef.current = null
      }, delay)
    }
  }

  const sendMessage = async (
    text: string,
    options?: {
      displayText?: string
    }
  ) => {
    const { isStreaming, addMessage } = useChatStore.getState()
    if (!text.trim() || isStreaming || !session) return

    console.log("📤 [BEFORE SENDING MESSAGE]")
    console.log("  session.inputUsage: " + (session.inputUsage ?? "undefined"))
    console.log("  session.inputQuota: " + (session.inputQuota ?? "undefined"))
    console.log("---")

    const userMessage: Message = {
      id: Date.now(),
      text: options?.displayText ?? text,
      sender: "user"
    }
    addMessage(userMessage)

    useChatStore.setState({ isStreaming: true })
    streamingMessageRef.current = ""
    abortControllerRef.current = new AbortController()

    try {
      const stream = await session.promptStreaming(text, {
        signal: abortControllerRef.current.signal
      })
      let previousContent = ""

      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousContent)
          ? chunk.slice(previousContent.length)
          : chunk

        streamingMessageRef.current += newChunk
        previousContent = chunk
        updateStreamingMessage()
      }
      updateStreamingMessage(true)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Streaming aborted by user")
        updateStreamingMessage(true)
      } else {
        console.error("Error during streaming:", error)
        const errorMessage: Message = {
          id: Date.now(),
          text: `${ERROR_MESSAGES.STREAMING_ERROR}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          sender: "bot"
        }
        addMessage(errorMessage)
      }
    } finally {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
        updateTimeoutRef.current = null
      }

      useChatStore.setState({ isStreaming: false })
      streamingMessageRef.current = ""
      streamingMessageIdRef.current = null
      abortControllerRef.current = null

      if (
        session?.inputUsage !== undefined &&
        session?.inputQuota !== undefined
      ) {
        const { tokenInfo } = useChatStore.getState()
        const systemTokens = tokenInfo.systemTokens
        const conversationTokens = session.inputUsage ?? 0
        const quota = session.inputQuota ?? 0
        const totalTokens = systemTokens + conversationTokens
        const percentageUsed = quota > 0 ? (totalTokens / quota) * 100 : 0

        console.log("📊 [TOKEN TRACKING - After Message]")
        console.log("  System tokens:", systemTokens)
        console.log(
          "  Conversation tokens (session.inputUsage):",
          conversationTokens
        )
        console.log("  Total tokens:", totalTokens)
        console.log("  Input quota:", quota)
        console.log("  Percentage used:", percentageUsed.toFixed(2) + "%")
        console.log(
          "  Tokens this turn:",
          conversationTokens - (tokenInfo.conversationTokens || 0)
        )
        console.log("---")

        useChatStore.setState({
          tokenInfo: {
            systemTokens,
            conversationTokens,
            totalTokens,
            inputQuota: quota,
            percentageUsed
          }
        })
      }
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      console.log("Stopping streaming...")
      abortControllerRef.current.abort()
    }
  }

  // Return functions for components to use
  return { sendMessage, stopStreaming }
}

