;
// Inject Tailwind styles into the shadow DOM
import cssText from "data-text:~style.css";
import { AlertCircle } from "lucide-react";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";
import { useState, useEffect } from "react";

import { ChatButton } from "~components/chat/ChatButton";
import { QuizButton } from "~components/quiz/QuizButton";
import { QuizModal } from "~components/quiz/QuizModal";
import { useVideoContext } from "~hooks/useVideoContext";
import type { VideoContext } from "~types/transcript";

// Only run on YouTube video pages
export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/watch*"],
  run_at: "document_idle"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

// Configure shadow DOM host ID for better debugging
export const getShadowHostId = () => "youtube-action-buttons-shadow-host"

/**
 * Find YouTube's button container and inject our buttons inline
 * This positions our buttons alongside YouTube's native buttons (Like, Share, etc.)
 */
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  // Multiple selectors to handle YouTube's varying DOM structure
  const selectors = [
    "#top-level-buttons-computed",
    "#menu-container #top-level-buttons",
    ".ytd-menu-renderer #top-level-buttons-computed",
    "#actions #top-level-buttons-computed",
    "#actions-inner #top-level-buttons-computed",
    "ytd-menu-renderer #top-level-buttons",
    "#top-row #menu #top-level-buttons-computed",
    "ytd-video-primary-info-renderer #menu #top-level-buttons-computed",
    "#primary-inner #menu-container #top-level-buttons",
    "ytd-watch-flexy #menu #top-level-buttons-computed"
  ]

  // Try to find the button container with retries
  const findContainer = (): Promise<Element> => {
    return new Promise((resolve) => {
      const maxAttempts = 60 // Try for ~30 seconds
      let attempts = 0

      const checkForContainer = () => {
        attempts++

        // Try each selector
        for (const selector of selectors) {
          const container = document.querySelector(selector)
          if (container) {
            resolve(container)
            return
          }
        }

        // If not found and haven't exceeded max attempts, try again
        if (attempts < maxAttempts) {
          setTimeout(checkForContainer, 500)
        } else {
          console.warn(
            "⚠️ Could not find YouTube button container after 30 seconds"
          )
          console.log("📍 Using floating widget fallback position")

          // Create a dedicated floating container
          const fallbackContainer = document.createElement("div")
          fallbackContainer.id = "nano-tutor-floating-buttons"
          fallbackContainer.setAttribute("data-fallback-mode", "true")
          document.body.appendChild(fallbackContainer)

          resolve(fallbackContainer)
        }
      }

      checkForContainer()
    })
  }

  const container = await findContainer()

  return {
    element: container,
    insertPosition: "afterbegin" // Insert as first child (leftmost button)
  }
}

/**
 * YouTube Action Buttons Container
 * Renders Chat and Quiz buttons inline with YouTube's native buttons
 */
const YoutubeActionButtons = () => {
  const [error, setError] = useState<string | null>(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [isQuizLoading, setIsQuizLoading] = useState(false)
  const [quizVideoContext, setQuizVideoContext] = useState<VideoContext | null>(
    null
  )
  const [isFallbackMode, setIsFallbackMode] = useState(false)

  // Detect if we're in fallback mode
  useEffect(() => {
    const checkFallbackMode = () => {
      const shadowHost = document.getElementById(
        "youtube-action-buttons-shadow-host"
      )
      const parent = shadowHost?.parentElement
      if (parent?.getAttribute("data-fallback-mode") === "true") {
        setIsFallbackMode(true)
      }
    }

    // Check after a brief delay to ensure DOM is mounted
    setTimeout(checkFallbackMode, 100)
  }, [])

  const { getVideoContext } = useVideoContext()

  const handleQuizClick = async () => {
    setIsQuizLoading(true)
    setError(null)

    try {
      const videoContext = await getVideoContext()
      setQuizVideoContext(videoContext)
      setShowQuizModal(true)
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to extract transcript. Make sure the video has captions available."

      setError(errorMessage)

      setTimeout(() => setError(null), 5000)
    } finally {
      setIsQuizLoading(false)
    }
  }

  const handleCloseQuiz = () => {
    setShowQuizModal(false)
  }

  return (
    <div
      className={
        isFallbackMode
          ? "fixed top-20 right-4 flex gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999]"
          : "relative flex gap-2"
      }>
      <ChatButton onError={setError} />
      <QuizButton onClick={handleQuizClick} isLoading={isQuizLoading} />

      {/* Error notification - positioned below the buttons */}
      {error && (
        <div className="absolute top-full left-0 mt-2 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm whitespace-normal z-[10000]">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuizModal && quizVideoContext && (
        <QuizModal onClose={handleCloseQuiz} videoContext={quizVideoContext} />
      )}
    </div>
  )
}

export default YoutubeActionButtons

