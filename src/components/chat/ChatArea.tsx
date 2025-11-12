import { ChatInput } from "./ChatInput"
import { MessageList } from "./messages/MessageList"
import { ModelDownload } from "./model_init/ModelDownload"
import { useChatStore } from "../../stores/chatStore"


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
