import { Loader2, MessageCircle } from "lucide-react"

import { useOpenChat } from "~hooks/useOpenChat"
import { useChatStore } from "~stores/chatStore"

/**
 * Chat button component that opens the side panel with video context
 */
export const ChatButton = () => {
  const { handleOpenChat } = useOpenChat()
  const isOpeningChat = useChatStore((state) => state.isOpeningChat)

  return (
    <button
      onClick={handleOpenChat}
      disabled={isOpeningChat}
      className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full mr-[1rem] hover:bg-blue-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Chat with the video">
      {isOpeningChat ? (
        <>
          <Loader2 size={24} className="animate-spin" />
        </>
      ) : (
        <>
          <MessageCircle size={24} />
        </>
      )}
      <span className="font-medium">Chat</span>
    </button>
  )
}

