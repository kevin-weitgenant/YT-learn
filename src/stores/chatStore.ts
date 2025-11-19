import { create } from "zustand"

import type { Message, TokenInfo } from "~types/message"
import type { LanguageModelSession } from "~types/chrome-ai"
import type { VideoContext } from "~types/transcript"

interface ChatStore {
  // State
  videoContext: VideoContext | null
  messages: Message[]
  inputText: string
  isStreaming: boolean
  isSessionReady: boolean
  hasUserMessages: boolean
  hasTranscriptError: boolean
  tokenInfo: TokenInfo
  apiAvailable: boolean | null
  session: LanguageModelSession | null
  isOpeningChat: boolean
  openChatError: string | null

  // Actions
  setVideoContext: (context: VideoContext | null) => void
  setInputText: (text: string) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateLastMessage: (text: string) => void
  setIsOpeningChat: (isOpening: boolean) => void
  setOpenChatError: (error: string | null) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  videoContext: null,
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
  apiAvailable: null,
  session: null,
  isOpeningChat: false,
  openChatError: null,

  // Actions
  setVideoContext: (context) => set({ videoContext: context }),
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
}))
