import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Storage } from "@plasmohq/storage";

import type { Message } from "./types/message";
import type { VideoContext } from "./types/transcript";
import { storage } from "./utils/storage";



import "~style.css";



import { useStorage } from "@plasmohq/storage/hook";



import { sendToBackground } from "@plasmohq/messaging";

import type { RequestBody as RAGRequestBody, ResponseBody as RAGResponseBody } from "~background/messages/retrieveRAG";

import { ChatInput } from "./components/chat/ChatInput";
import { MessageList } from "./components/chat/MessageList";
import { ModelDownload } from "./components/chat/ModelDownload";
import { useAISession } from "./hooks/useAISession";
import { useModelAvailability } from "./hooks/useModelAvailability";
import { useStreamingResponse } from "./hooks/useStreamingResponse";
import { useEmbeddingProgress } from "./hooks/useEmbeddingProgress";
import { buildInitialBotMessage, RAG_CONFIG } from "./utils/constants";


/**
 * Main SidePanel component
 * AI-powered chatbot interface using Chrome's Prompt API (Gemini Nano)
 * Now includes YouTube video context support
 */
function SidePanel() {
  // Initialize AI session (includes video context)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [usingRAG, setUsingRAG] = useState(false)
  const [ragContextLoaded, setRagContextLoaded] = useState(false)

  // Detect current tab ID
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]?.id) {
        setCurrentTabId(tabs[0].id)
      }
    })
  }, [])

  // Get videoId from session storage (tab → videoId mapping)
  const sessionStorage = new Storage({ area: "session" })
  const [videoId] = useStorage<string>({
    key: currentTabId?.toString() || null,
    instance: sessionStorage
  })

  // Read from video-centric key instead of tab-centric
  const [videoContext] = useStorage<VideoContext>({
    key: videoId ? `videoContext_${videoId}` : null,
    instance: storage
  })

  // Check model availability and handle downloads
  const {
    availability,
    downloadProgress,
    isExtracting,
    startDownload
  } = useModelAvailability()

  // Track embedding progress
  const { isEmbedding, progress: embeddingProgress } = useEmbeddingProgress(videoId)

  const {
    session,
    apiAvailable,
    initializationMessages,
    resetSession,
    systemTokens
  } = useAISession({ 
    videoContext, 
    shouldInitialize: availability === 'available',
    setUsingRAG
  })
  
  // Handle message streaming
  const { isStreaming, sendMessage, tokenInfo, resetTokenInfo, stopStreaming } =
    useStreamingResponse(session, messages, setMessages, systemTokens)
  
  
    // Effect to handle initialization messages and readiness
  useEffect(() => {
    if (initializationMessages.length > 0) {
      setMessages(initializationMessages)
    }
  }, [initializationMessages])


 

  // Calculate derived state for ChatInput
  const isSessionReady = session !== null
  const hasUserMessages = messages.some(m => m.sender === "user")

  const handleSend = async () => {
    if (!inputText.trim() || !isSessionReady) return

    let messageToSend = inputText
    let retrievedChunks: import("~types/transcript").TranscriptChunk[] = []

    // RAG retrieval: only on first message when using RAG mode
    if (usingRAG && !ragContextLoaded && session && videoId) {
      try {
        console.log("🎯 First message in RAG mode - retrieving relevant chunks...")

        const quota = session.inputQuota ?? 0
        const userMsg = `User question: ${inputText}`

        // Measure user message token cost
        const userTokens = await session.measureInputUsage(userMsg)

        // Calculate available tokens: quota - user (system prompt tokens not measured)
        const available = quota - userTokens

        // Use 50% for chunks (leaving 50% as buffer for assistant + follow-ups)
        const chunkBudget = Math.floor(available * RAG_CONFIG.chunkBudgetFrac)

        console.log(`💰 Token Budget Breakdown:`)
        console.log(`  Total Quota: ${quota}`)
        console.log(`  User Message: ${userTokens}`)
        console.log(`  Available: ${available}`)
        console.log(`  Chunk Budget (50%): ${chunkBudget}`)
        console.log(`  Buffer (50%): ${available - chunkBudget}`)

        if (chunkBudget > 100) {
          // Call background to retrieve chunks via message handler
          const response = await sendToBackground<RAGRequestBody, RAGResponseBody>({
            name: "retrieveRAG",
            body: {
              userQuery: inputText,
              videoId: videoId,
              tokenBudget: chunkBudget
            }
          })

          if (response.context && response.chunks.length > 0) {
            // Store chunks for UI display
            retrievedChunks = response.chunks
            // Send full context to AI
            messageToSend = `${response.context}\n\n${userMsg}`
            console.log(`✅ Context injected into first message (${response.chunks.length} chunks)`)
          } else {
            messageToSend = userMsg
            console.log(`⚠️ No context retrieved, sending user message only`)
          }
        } else {
          messageToSend = userMsg
          console.log(`⚠️ Chunk budget too small (${chunkBudget} tokens), skipping RAG`)
        }

        setRagContextLoaded(true)
      } catch (error) {
        console.error("❌ RAG retrieval failed:", error)
        messageToSend = `User question: ${inputText}`
        setRagContextLoaded(true)
      }
    }

    // Send message to AI with full context, but display only user text in UI
    await sendMessage(messageToSend, {
      displayText: inputText,
      chunks: retrievedChunks.length > 0 ? retrievedChunks : undefined
    })
    setInputText("")
  }

  // Handle session reset - resets both session and messages
  const handleResetSession = async () => {
    await resetSession()
    resetTokenInfo()
    setRagContextLoaded(false) // Reset RAG flag to allow retrieval on next first message
    setMessages([]) // Clear all messages completely
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Video Context Display */}
      {videoContext ? (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-xl">💬</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-blue-900 text-sm truncate">
                {videoContext.title}
              </h3>
              <p className="text-xs text-blue-700 truncate">
                by {videoContext.channel}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-gray-600" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium">
                Waiting for video context...
              </p>
             
            </div>
          </div>
        </div>
      )}

      <MessageList messages={messages} />
      {availability !== 'available' ? (
        <ModelDownload
          availability={availability}
          downloadProgress={downloadProgress}
          isExtracting={isExtracting}
          onStartDownload={startDownload}
        />
      ) : (
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          onSend={handleSend}
          isStreaming={isStreaming}
          isSessionReady={isSessionReady}
          tokenInfo={tokenInfo}
          session={session}
          onReset={handleResetSession}
          isEmbedding={isEmbedding}
          embeddingProgress={embeddingProgress}
          stopStreaming={stopStreaming}
          hasUserMessages={hasUserMessages}
        />
      )}
    </div>
  )
}

export default SidePanel