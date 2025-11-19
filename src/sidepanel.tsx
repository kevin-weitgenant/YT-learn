import "~style.css"

import { useVideoContextForTab } from "./hooks/videoContext/useVideoContextForTab"
import { useChatOrquestrator } from "./hooks/chat/useChatOrquestrator"
import { VideoContextHeader } from "./components/chat/video-context/VideoContextHeader"
import { ChatArea } from "./components/chat/ChatArea"
import { ChapterOverlay } from "./components/chat/chapters/ChapterOverlay"


function SidePanel() {
  const videoContext = useVideoContextForTab()
  useChatOrquestrator(videoContext)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <VideoContextHeader />
      <ChatArea />
      <ChapterOverlay />
    </div>
  )
}

export default SidePanel