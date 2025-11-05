import type { Message } from "../../types/message"
import { MessageItem } from "./MessageItem"

interface MessageListProps {
  messages: Message[]
}

/**
 * Container component for displaying all messages
 * Provides scrollable area for message history
 */
export function MessageList({ messages }: MessageListProps) {
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

