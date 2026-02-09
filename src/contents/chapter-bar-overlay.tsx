// Inject Tailwind styles into the shadow DOM
import cssText from "data-text:~style.css";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";

import { ChapterBarOverlay } from "~components/poc/ChapterBarOverlay";

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
 * Find YouTube's progress bar container and inject our overlay
 * This positions our overlay above the chapter progress bar
 */
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  // Target the progress bar container to inject our overlay nearby
  const anchor = document.querySelector(".ytp-progress-bar-container");
  return {
    element: anchor as Element,
    insertPosition: "afterbegin"
  }
}

/**
 * Chapter Bar Overlay Content Script
 * Renders a hover overlay above YouTube's chapter progress bar
 */
export default ChapterBarOverlay
