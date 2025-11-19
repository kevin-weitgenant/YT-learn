import { ChatInput } from "./ChatInput"
import { MessageList } from "./messages/MessageList"
import { ModelDownload } from "./model_init/ModelDownload"
import { useModelAvailabilityStore } from "../../stores/modelAvailabilityStore"


export function ChatArea() {
  const availability = useModelAvailabilityStore((state) => state.availability)

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
