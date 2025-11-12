import "~style.css"

import { useVideoContextForTab } from "./hooks/videoContext/useVideoContextForTab"
import { useChatSession } from "./hooks/chat/useChatSession"
import { VideoContextHeader } from "./components/chat/video-context/VideoContextHeader"
import { ChatArea } from "./components/chat/ChatArea"
import { ChapterOverlay } from "./components/chat/chapters/ChapterOverlay"


function SidePanel() {
  const videoContext = useVideoContextForTab()
  useChatSession(videoContext)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <VideoContextHeader />
      <ChatArea />
      <ChapterOverlay />
    </div>
  )
}

export default SidePanel