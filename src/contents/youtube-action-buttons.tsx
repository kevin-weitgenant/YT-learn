;
// Inject Tailwind styles into the shadow DOM
import cssText from "data-text:~style.css";
import { AlertCircle } from "lucide-react";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";

import { ChatButton } from "~components/chat/ChatButton";
import { useChatStore } from "~stores/chatStore";

// Only run on YouTube video pages
export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"],
  run_at: "document_idle"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}



/**
 * Find YouTube's button container and inject our buttons inline
 * This positions our buttons alongside YouTube's native buttons (Like, Share, etc.)
 */
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  const anchor = document.querySelector("ytd-menu-renderer.ytd-watch-metadata");
  return {
    element: anchor as Element,
    insertPosition: "afterbegin"
  }
}

/**
 * YouTube Action Buttons Container
 * Renders Chat and Quiz buttons inline with YouTube's native buttons
 */
const YoutubeActionButtons = () => {
  const openChatError = useChatStore((state) => state.openChatError)

  return (
    <div
      className={"relative flex gap-2"}>
      <ChatButton />

      {/* Error notification - positioned below the buttons */}
      {openChatError && (
        <div className="absolute top-full left-0 mt-2 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm whitespace-normal z-[10000]">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span className="text-sm">{openChatError}</span>
        </div>
      )}
    </div>
  )
}

export default YoutubeActionButtons

