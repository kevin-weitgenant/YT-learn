import { Eraser, Loader2, Pause } from "lucide-react"
import { useChatStore } from "../../stores/chatStore"
import { useStreamingResponse } from "../../hooks/chat/useStreamingResponse"
import { useAISession } from "../../hooks/chat/useAISession"
import { CircularProgress } from "./ui/CircularProgress"
import { ChapterSelectionHeader } from "./chapters/ChapterSelectionHeader"
import { useChapterStore } from "../../stores/chapterStore"

/**
 * Input area component with textarea and send button
 * Handles user message input and submission
 */
export function ChatInput() {
  const {
    videoContext,
    session,
    inputText,
    setInputText,
    isStreaming,
    isSessionReady,
    tokenInfo,
    hasUserMessages,
    hasTranscriptError
  } = useChatStore()
  const { resetSession } = useAISession({ videoContext, shouldInitialize: false })
  const { sendMessage, stopStreaming } = useStreamingResponse(session)
  const chapters = useChapterStore((state) => state.chapters)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && isSessionReady) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }



  return (
    <div className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200 px-6 py-5">
      {/* Main input container */}
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-200 transition-all duration-200 hover:shadow-xl hover:shadow-gray-200/60 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
          {chapters && chapters.length > 0 && (
            <div className="">
              <ChapterSelectionHeader variant="compact" />
            </div>
          )}
          <div className="flex items-end gap-2 p-2">
            {/* Reset button with circular progress - only show when user has sent messages */}
            {hasUserMessages && (
              <div>
                <CircularProgress
                  percentage={tokenInfo.percentageUsed || 0}
                  size={40}
                  strokeWidth={2}>
                  <button
                    onClick={resetSession}
                    disabled={!isSessionReady}
                    title={`Context Window Usage:
System: ${tokenInfo.systemTokens?.toLocaleString() || 0} tokens
Conversation: ${tokenInfo.conversationTokens?.toLocaleString() || 0} tokens
Total: ${tokenInfo.totalTokens?.toLocaleString() || 0} / ${tokenInfo.inputQuota?.toLocaleString() || 0} tokens (${tokenInfo.percentageUsed?.toFixed(1) || 0}%)`}
                    className="flex-shrink-0 p-2.5 text-gray-400 rounded-xl hover:text-red-500 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group">
                    <Eraser
                      size={20}
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                  </button>
                </CircularProgress>
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                hasTranscriptError
                  ? "Chat is unavailable for this video."
                  : "Ask anything about the video..."
              }
              className="flex-1 resize-none bg-transparent px-3 py-2.5 focus:outline-none placeholder:text-gray-400 text-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed"
              rows={3}
              disabled={hasTranscriptError}
            />

            {/* Loading spinner while session is initializing (and no transcript error) */}
            {!isSessionReady && !isStreaming && !hasTranscriptError && (
              <div className="flex-shrink-0 p-2.5 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {/* Stop button (replaces streaming indicator) */}
            {isStreaming && (
              <button
                onClick={stopStreaming}
                title="Stop generating"
                className="flex-shrink-0 p-2.5 text-gray-500 rounded-xl hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 group">
                <Pause
                  size={20}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

