import type { Message } from "../../types/message"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MessageItemProps {
  message: Message
}

/**
 * Individual message bubble component
 * Displays a single message
 */
export function MessageItem({ message }: MessageItemProps) {
  return (
    <div
      className={`flex ${
        message.sender === "user" ? "justify-end" : "justify-start"
      }`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.sender === "user"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-800 border border-gray-200"
        }`}>
        <div className="text-sm prose prose-sm max-w-none prose-invert:text-white flex items-start gap-2">
          <div className="flex-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={["script", "iframe", "object", "embed"]}>
              {message.text}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

