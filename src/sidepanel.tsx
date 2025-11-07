import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Storage } from "@plasmohq/storage";

import type { Message } from "./types/message";
import type { VideoContext } from "./types/transcript";
import { storage } from "./utils/storage";

import "~style.css";

import { useStorage } from "@plasmohq/storage/hook";

import { ChatInput } from "./components/chat/ChatInput";
import { MessageList } from "./components/chat/MessageList";
import { ModelDownload } from "./components/chat/ModelDownload";
import { ChapterSelectionHeader } from "./components/chat/ChapterSelectionHeader";
import { ChapterSelectionPanel } from "./components/chat/ChapterSelectionPanel";
import { useAISession } from "./hooks/useAISession";
import { useModelAvailability } from "./hooks/useModelAvailability";
import { useStreamingResponse } from "./hooks/useStreamingResponse";
import { useChapterStore } from "./stores/chapterStore";

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

  // Get chapter store state and actions
  const setChapters = useChapterStore((state) => state.setChapters)
  const chapters = useChapterStore((state) => state.chapters)
  const showChapterPanel = useChapterStore((state) => state.showPanel)
  const toggleChapterPanel = useChapterStore((state) => state.togglePanel)
  
  
  
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

  // Initialize chapter store when videoContext changes
  useEffect(() => {
    if (videoContext?.chapters && videoContext.chapters.length > 0) {
      setChapters(videoContext.chapters)
    }
  }, [videoContext?.chapters, setChapters])

  // Check model availability and handle downloads
  const {
    availability,
    downloadProgress,
    isExtracting,
    startDownload
  } = useModelAvailability()

  const {
    session,
    apiAvailable,
    initializationMessages,
    resetSession,
    systemTokens
  } = useAISession({ 
    videoContext, 
    shouldInitialize: availability === 'available' && !!videoContext?.transcript,
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
  const hasTranscriptError = !!videoContext?.error;

  const handleSend = async () => {
    if (!inputText.trim() || !isSessionReady) return

    await sendMessage(inputText)
    setInputText("")
  }

  // Handle session reset - resets both session and messages
  const handleResetSession = async () => {
    await resetSession()
    resetTokenInfo()
    setMessages([]) // Clear all messages completely
    if (videoContext?.chapters) {
      setChapters(videoContext.chapters) // Reinitialize chapters (which selects all by default)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Video Context Display */}
      {videoContext ? (
        <div>
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
          {videoContext.error && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-800 text-xs">
              <p className="font-medium">Sorry, no available transcripts for this video.</p>
            </div>
          )}
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

      {availability !== "available" ? (
        <ModelDownload
          availability={availability}
          downloadProgress={downloadProgress}
          isExtracting={isExtracting}
          onStartDownload={startDownload}
        />
      ) : (
        <>
          {/* Chapter Selection Header - positioned above input */}
          {chapters && chapters.length > 0 && (
            <div className="px-6 pt-3 pb-1">
              <ChapterSelectionHeader variant="compact" />
            </div>
          )}

          <ChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSend={handleSend}
            isStreaming={isStreaming}
            isSessionReady={isSessionReady}
            tokenInfo={tokenInfo}
            session={session}
            onReset={handleResetSession}
            stopStreaming={stopStreaming}
            hasUserMessages={hasUserMessages}
            hasTranscriptError={hasTranscriptError}
          />
        </>
      )}

      {showChapterPanel && (
        <div className="absolute inset-0 flex z-10">
          <div
            onClick={toggleChapterPanel}
            className="flex-1 bg-black/20 animate-fade-in"
          />
          <div className="w-80 bg-white transform transition-transform duration-300 ease-in-out translate-x-0 animate-slide-in-right">
            <ChapterSelectionPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default SidePanel