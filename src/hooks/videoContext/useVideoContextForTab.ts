import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import type { VideoContext } from "../../types/transcript"
import { useChapterStore } from "../../stores/chapterStore"
import { useChatStore } from "../../stores/chatStore"
import { storage } from "../../utils/storage"



// This session storage instance is created once and reused across all hook instances.
const sessionStorage = new Storage({ area: "session" })

// Returns the VideoContext for the active tab, syncing chapters to global store.
export function useVideoContextForTab(): VideoContext | null {
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const setChapters = useChapterStore((state) => state.setChapters)

  // Step 1: Detect the current active tab to get its ID.
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        setCurrentTabId(tabs[0].id)
      }
    })
  }, [])

  // Step 2: Use the tab ID to get the associated videoId from session storage.
  // The key is the tab ID, and the value is the videoId.
  const [videoId] = useStorage<string>({
    key: currentTabId?.toString(), // useStorage handles null keys gracefully
    instance: sessionStorage
  })

  // Step 3: Use the videoId to retrieve the complete VideoContext from persistent storage.
  const [videoContext] = useStorage<VideoContext>({
    key: videoId ? `videoContext_${videoId}` : null,
    instance: storage
  })

  // Step 4: When videoContext is loaded or changed, update the global chapter store.
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[VideoContext] 📦 VideoContext changed, checking for chapters...');
    console.log('[VideoContext] Debug info:', {
      hasVideoContext: !!videoContext,
      videoId: videoContext?.videoId ?? 'N/A',
      hasChapters: !!videoContext?.chapters,
      chaptersIsArray: Array.isArray(videoContext?.chapters),
      chaptersLength: videoContext?.chapters?.length ?? 0,
      chapters: videoContext?.chapters
    });

    // We only update the store if there are chapters to prevent unnecessary re-renders.
    if (videoContext?.chapters && videoContext.chapters.length > 0) {
      console.log(`[VideoContext] ✅ Setting ${videoContext.chapters.length} chapters to global store`);
      console.log('[VideoContext] Chapter titles:', videoContext.chapters.map(c => c.title));
      setChapters(videoContext.chapters)
      console.log('[VideoContext] ✅ Chapters successfully set to store');
    } else {
      console.log('[VideoContext] ⚠️ NOT setting chapters to store');
      if (!videoContext) {
        console.log('[VideoContext] Reason: videoContext is null/undefined');
      } else if (!videoContext.chapters) {
        console.log('[VideoContext] Reason: videoContext.chapters is null/undefined');
      } else if (videoContext.chapters.length === 0) {
        console.log('[VideoContext] Reason: videoContext.chapters is empty array');
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, [videoContext, setChapters]) // Dependency on videoContext ensures this runs when data changes.

  // Step 5: Sync videoContext to chatStore for easy access by components
  useEffect(() => {
    useChatStore.setState({ videoContext })
  }, [videoContext])

  return videoContext
}
