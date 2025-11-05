import { useEffect, useState } from "react"

import type { LanguageModelSession } from "../types/chrome-ai"

interface UseModelAvailabilityReturn {
  availability: 'available' | 'downloadable' | 'downloading' | 'unavailable' | null
  downloadProgress: number  // 0-1
  isExtracting: boolean     // true when download complete but loading
  startDownload: () => Promise<void>
  error: string | null
}

/**
 * Custom hook to manage model availability and download progress.
 * Checks if the model is available and provides download functionality.
 */
export function useModelAvailability(): UseModelAvailabilityReturn {
  const [availability, setAvailability] = useState<'available' | 'downloadable' | 'downloading' | 'unavailable' | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [isExtracting, setIsExtracting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      if (!("LanguageModel" in self)) {
        setAvailability('unavailable')
        setError("LanguageModel API is not available in this browser.")
        return
      }

      try {
        const languageModel = self.LanguageModel!
        const status = await languageModel.availability()
        setAvailability(status)
      } catch (err) {
        console.error("Failed to check model availability:", err)
        setAvailability('unavailable')
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    }

    checkAvailability()
  }, [])

  // Function to start model download
  const startDownload = async () => {
    if (!("LanguageModel" in self)) {
      setError("LanguageModel API is not available")
      return
    }

    try {
      setAvailability('downloading')
      setDownloadProgress(0)
      setIsExtracting(false)
      setError(null)

      const languageModel = self.LanguageModel!
      let modelNewlyDownloaded = false

      // Create a temporary session with monitor to track download
      const tempSession: LanguageModelSession = await languageModel.create({
        monitor(m) {
          modelNewlyDownloaded = true
          m.addEventListener('downloadprogress', (e) => {
            setDownloadProgress(e.loaded)
            
            // When download completes, show extraction/loading state
            if (e.loaded === 1) {
              setIsExtracting(true)
            }
          })
        }
      })

      // Clean up the temporary session
      if (tempSession?.destroy) {
        tempSession.destroy()
      }

      // Model is now available
      setAvailability('available')
      setIsExtracting(false)
      setDownloadProgress(1)
    } catch (err) {
      console.error("Failed to download model:", err)
      setError(err instanceof Error ? err.message : "Failed to download model")
      setAvailability('unavailable')
      setIsExtracting(false)
    }
  }

  return {
    availability,
    downloadProgress,
    isExtracting,
    startDownload,
    error
  }
}

