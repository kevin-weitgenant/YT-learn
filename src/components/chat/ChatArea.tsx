import { ChatInput } from "./ChatInput"
import { MessageList } from "./MessageList"
import { ModelDownload } from "./ModelDownload"
import { useChatStore } from "../../stores/chatStore"

/**
 * A component that groups the main chat UI elements, including the message list and input area.
 * It conditionally checks if the model is available, and if not, it displays the `ModelDownload` component,
 * so that the user can download the model.
 * If the model is available, then it displays the chat UI, including the message list, 
 * chapter selection header(if there are chapters in the video), and chat input
 */
export function ChatArea() {
  const availability = useChatStore((state) => state.availability)

  return (
    <>
      <MessageList />

      {availability !== "available" ? (
        <ModelDownload />
      ) : (
        <>
          <ChatInput />
        </>
      )}
    </>
  )
}
