import { useEffect } from "react"
import type { LanguageModelSession } from "../../types/chrome-ai"
import { useModelAvailabilityStore } from "../../stores/modelAvailabilityStore"

/**
 * Custom hook to manage model availability and download progress.
 * Checks if the model is available and provides download functionality.
 * All state is managed in the modelAvailabilityStore.
 */
export function useModelAvailability() {
  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      if (!("LanguageModel" in self)) {
        useModelAvailabilityStore.setState({ availability: "unavailable" })
        return
      }

      try {
        const languageModel = self.LanguageModel!
        const status = await languageModel.availability()
        useModelAvailabilityStore.setState({ availability: status as any })
      } catch (err) {
        console.error("Failed to check model availability:", err)
        useModelAvailabilityStore.setState({ availability: "unavailable" })
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
      useModelAvailabilityStore.setState({
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
            useModelAvailabilityStore.setState({ downloadProgress: e.loaded })

            // When download completes, show extraction/loading state
            if (e.loaded === 1) {
              useModelAvailabilityStore.setState({ isExtracting: true })
            }
          })
        }
      })

      // Clean up the temporary session
      if (tempSession?.destroy) {
        tempSession.destroy()
      }

      // Model is now available
      useModelAvailabilityStore.setState({
        availability: "available",
        isExtracting: false,
        downloadProgress: 1
      })
    } catch (err) {
      console.error("Failed to download model:", err)
      useModelAvailabilityStore.setState({
        availability: "unavailable",
        isExtracting: false
      })
    }
  }

  // Return function for components to use
  return { startDownload }
}

