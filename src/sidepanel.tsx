import "~style.css"

import { useVideoContextForTab } from "./hooks/useVideoContextForTab"
import { useChatSession } from "./hooks/useChatSession"
import { VideoContextHeader } from "./components/chat/VideoContextHeader"
import { ChatArea } from "./components/chat/ChatArea"
import { ChapterOverlay } from "./components/chat/ChapterOverlay"


function SidePanel() {
  const videoContext = useVideoContextForTab()
  useChatSession(videoContext)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <VideoContextHeader videoContext={videoContext} />
      <ChatArea />
      <ChapterOverlay />
    </div>
  )
}

export default SidePanel