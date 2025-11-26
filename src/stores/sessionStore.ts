import { create } from "zustand"
import type { LanguageModelSession } from "~types/chrome-ai"

interface SessionStore {
  // State
  session: LanguageModelSession | null
  isSessionReady: boolean

  // Actions
  setSession: (session: LanguageModelSession | null) => void
  setIsSessionReady: (isReady: boolean) => void
  destroySession: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  session: null,
  isSessionReady: false,

  // Actions
  setSession: (session) => set({ session, isSessionReady: !!session }),
  setIsSessionReady: (isReady) => set({ isSessionReady: isReady }),
  destroySession: () => {
    const { session } = get()
    if (session) {
      session.destroy()
    }
    set({ session: null, isSessionReady: false })
  }
}))
