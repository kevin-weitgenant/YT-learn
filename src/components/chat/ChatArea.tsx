import { ChatInput } from "./ChatInput"
import { MessageList } from "./MessageList"
import { ModelDownload } from "./ModelDownload"
import { ChapterSelectionHeader } from "./ChapterSelectionHeader"
import { useChapterStore } from "../../stores/chapterStore"
import { useChatStore } from "../../stores/chatStore"

/**
 * A component that groups the main chat UI elements, including the message list and input area.
 * It conditionally renders the `ModelDownload` component if the model is not available,
 * otherwise it displays the `MessageList`, `ChapterSelectionHeader`, and `ChatInput`.
 */
export function ChatArea() {
  const chapters = useChapterStore((state) => state.chapters)
  const {
    messages,
    availability,
    downloadProgress,
    isExtracting,
    startDownload
  } = useChatStore()

  return (
    <>
      <MessageList messages={messages} />

      {availability !== "available" ? (
        <ModelDownload
          availability={availability}
          downloadProgress={downloadProgress}
          isExtracting={isExtracting}
          onStartDownload={startDownload}
        />
      ) : (
        <>
          {chapters && chapters.length > 0 && (
            <div className="px-6 pt-3 pb-1">
              <ChapterSelectionHeader variant="compact" />
            </div>
          )}

          <ChatInput />
        </>
      )}
    </>
  )
}
