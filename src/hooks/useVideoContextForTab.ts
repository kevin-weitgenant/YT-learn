import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import type { VideoContext } from "../types/transcript"
import { useChapterStore } from "../stores/chapterStore"
import { storage } from "../utils/storage"

/**
 * Custom hook to manage video context based on the current active tab.
 * It handles:
 * 1. Detecting the current tab ID.
 * 2. Retrieving the associated video ID from session storage.
 * 3. Retrieving the video context (transcript, chapters, etc.) from persistent storage.
 * 4. Synchronizing video chapters with the global chapter store.
 *
 * @returns The video context for the current tab, or null if not available.
 */
export function useVideoContextForTab(): VideoContext | null {
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const setChapters = useChapterStore((state) => state.setChapters)

  // 1. Detect current tab ID
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        setCurrentTabId(tabs[0].id)
      }
    })
  }, [])

  // 2. Get videoId from session storage (tab → videoId mapping)
  const sessionStorage = new Storage({ area: "session" })
  const [videoId] = useStorage<string>({
    key: currentTabId?.toString() || null,
    instance: sessionStorage
  })

  // 3. Read from video-centric key instead of tab-centric
  const [videoContext] = useStorage<VideoContext>({
    key: videoId ? `videoContext_${videoId}` : null,
    instance: storage
  })

  // 4. Initialize chapter store when videoContext changes
  useEffect(() => {
    if (videoContext?.chapters && videoContext.chapters.length > 0) {
      setChapters(videoContext.chapters)
    }
  }, [videoContext?.chapters, setChapters])

  return videoContext
}
