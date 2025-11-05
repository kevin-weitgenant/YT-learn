import { Eraser, Loader2, Pause } from "lucide-react"
import type { TokenInfo } from "../../hooks/useStreamingResponse"
import type { LanguageModelSession } from "../../types/chrome-ai"
import type { EmbeddingProgress } from "../../types/transcript"
import { EmbeddingProgressBar } from "./EmbeddingProgressBar"
import { CircularProgress } from "./CircularProgress"

interface ChatInputProps {
  inputText: string
  setInputText: (text: string) => void
  onSend: () => void
  isStreaming: boolean
  isSessionReady: boolean
  tokenInfo: TokenInfo
  session: LanguageModelSession | null
  onReset: () => void
  isEmbedding: boolean
  embeddingProgress?: EmbeddingProgress
  stopStreaming: () => void
  hasUserMessages: boolean
}

/**
 * Input area component with textarea and send button
 * Handles user message input and submission
 */
export function ChatInput({
  inputText,
  setInputText,
  onSend,
  isStreaming,
  isSessionReady,
  tokenInfo,
  session,
  onReset,
  isEmbedding,
  embeddingProgress,
  stopStreaming,
  hasUserMessages
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && isSessionReady) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200 px-6 py-5">
      {/* Show embedding progress if embedding is in progress */}
      {isEmbedding && embeddingProgress && (
        <div className="mb-4">
          <EmbeddingProgressBar progress={embeddingProgress} />
        </div>
      )}

      {/* Main input container */}
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-200 transition-all duration-200 hover:shadow-xl hover:shadow-gray-200/60 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
          <div className="flex items-end gap-2 p-2">
            {/* Reset button with circular progress - only show when user has sent messages */}
            {hasUserMessages && (
              <div>
                <CircularProgress percentage={tokenInfo.percentageUsed || 0} size={40} strokeWidth={2}>
                  <button
                    onClick={onReset}
                    disabled={!isSessionReady}
                    title={`Context Window Usage:
System: ${tokenInfo.systemTokens?.toLocaleString() || 0} tokens
Conversation: ${tokenInfo.conversationTokens?.toLocaleString() || 0} tokens
Total: ${tokenInfo.totalTokens?.toLocaleString() || 0} / ${tokenInfo.inputQuota?.toLocaleString() || 0} tokens (${tokenInfo.percentageUsed?.toFixed(1) || 0}%)`}
                    className="flex-shrink-0 p-2.5 text-gray-400 rounded-xl hover:text-red-500 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group">
                    <Eraser size={20} className="transition-transform duration-200 group-hover:scale-110" />
                  </button>
                </CircularProgress>
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isSessionReady ? "Ask anything about the video..." : "Preparing session..."}
              className="flex-1 resize-none bg-transparent px-3 py-2.5 focus:outline-none placeholder:text-gray-400 text-gray-900"
              rows={3}
            />

            {/* Loading spinner while session is initializing */}
            {!isSessionReady && !isStreaming && (
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
                <Pause size={20} className="transition-transform duration-200 group-hover:scale-110" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

