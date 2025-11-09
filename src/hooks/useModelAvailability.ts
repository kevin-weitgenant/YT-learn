import { useEffect } from "react"
import type { LanguageModelSession } from "../types/chrome-ai"
import { useChatStore } from "../stores/chatStore"

/**
 * Custom hook to manage model availability and download progress.
 * Checks if the model is available and provides download functionality.
 * All state is managed in the chatStore.
 */
export function useModelAvailability() {
  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      if (!("LanguageModel" in self)) {
        useChatStore.setState({ availability: "unavailable" })
        return
      }

      try {
        const languageModel = self.LanguageModel!
        const status = await languageModel.availability()
        useChatStore.setState({ availability: status })
      } catch (err) {
        console.error("Failed to check model availability:", err)
        useChatStore.setState({ availability: "unavailable" })
      }
    }

    checkAvailability()
  }, [])

  // Function to start model download
  const startDownload = async () => {
    if (!("LanguageModel" in self)) {
      return
    }

    try {
      useChatStore.setState({
        availability: "downloading",
        downloadProgress: 0,
        isExtracting: false
      })

      const languageModel = self.LanguageModel!
      let modelNewlyDownloaded = false

      // Create a temporary session with monitor to track download
      const tempSession: LanguageModelSession = await languageModel.create({
        monitor(m) {
          modelNewlyDownloaded = true
          m.addEventListener("downloadprogress", (e) => {
            useChatStore.setState({ downloadProgress: e.loaded })

            // When download completes, show extraction/loading state
            if (e.loaded === 1) {
              useChatStore.setState({ isExtracting: true })
            }
          })
        }
      })

      // Clean up the temporary session
      if (tempSession?.destroy) {
        tempSession.destroy()
      }

      // Model is now available
      useChatStore.setState({
        availability: "available",
        isExtracting: false,
        downloadProgress: 1
      })
    } catch (err) {
      console.error("Failed to download model:", err)
      useChatStore.setState({
        availability: "unavailable",
        isExtracting: false
      })
    }
  }

  // Set the action in the store so components can call it
  useEffect(() => {
    useChatStore.setState({ startDownload })
  }, [])
}

