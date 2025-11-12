import { useChatStore } from "../../../stores/chatStore"
import type { Message } from "../../../types/message"
import { MessageItem } from "./MessageItem"

/**
 * Container component for displaying all messages
 * Provides scrollable area for message history
 */
export function MessageList() {
  const messages = useChatStore((state) => state.messages)
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages
        .filter((message) => message.text.trim().length > 0)
        .map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
    </div>
  )
}

