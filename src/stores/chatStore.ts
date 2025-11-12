import { create } from "zustand"

import type { Message } from "~types/message"
import type { TokenInfo } from "~hooks/chat/useStreamingResponse"
import type { LanguageModelSession } from "~types/chrome-ai"

interface ChatStore {
  // State
  messages: Message[]
  inputText: string
  isStreaming: boolean
  isSessionReady: boolean
  hasUserMessages: boolean
  hasTranscriptError: boolean
  tokenInfo: TokenInfo
  availability: "available" | "downloadable" | "downloading" | "unavailable" | null
  downloadProgress: number
  isExtracting: boolean
  apiAvailable: boolean | null
  session: LanguageModelSession | null
  isOpeningChat: boolean
  openChatError: string | null

  // Actions
  setInputText: (text: string) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateLastMessage: (text: string) => void
  setIsOpeningChat: (isOpening: boolean) => void
  setOpenChatError: (error: string | null) => void

  // Placeholder for async actions to be managed by hooks
  // These will be dynamically set by the hooks
  sendMessage: (text: string) => Promise<void>
  handleResetSession: () => Promise<void>
  stopStreaming: () => void
  startDownload: () => Promise<void>
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  messages: [],
  inputText: "",
  isStreaming: false,
  isSessionReady: false,
  hasUserMessages: false,
  hasTranscriptError: false,
  tokenInfo: {
    systemTokens: 0,
    conversationTokens: 0,
    totalTokens: 0,
    inputQuota: 0,
    percentageUsed: 0
  },
  availability: null,
  downloadProgress: 0,
  isExtracting: false,
  apiAvailable: null,
  session: null,
  isOpeningChat: false,
  openChatError: null,

  // Actions
  setInputText: (text) => set({ inputText: text }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (text) =>
    set((state) => {
      if (state.messages.length === 0) return {}
      const lastMessage = state.messages[state.messages.length - 1]
      const updatedMessage = { ...lastMessage, text }
      return {
        messages: [...state.messages.slice(0, -1), updatedMessage]
      }
    }),
  setIsOpeningChat: (isOpening) => set({ isOpeningChat: isOpening }),
  setOpenChatError: (error) => set({ openChatError: error }),
  
  // Async actions will be placeholders here and implemented in the hook
  // They will be dynamically replaced by the hooks
  sendMessage: async (text: string) => {
    console.warn("sendMessage called before initialization")
  },
  handleResetSession: async () => {
    console.warn("handleResetSession called before initialization")
  },
  stopStreaming: () => {
    console.warn("stopStreaming called before initialization")
  },
  startDownload: async () => {
    console.warn("startDownload called before initialization")
  },
}))
