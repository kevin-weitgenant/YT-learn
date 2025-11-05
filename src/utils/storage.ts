import { Storage } from "@plasmohq/storage"

/**
 * Shared Storage Instance
 * Configured to use chrome.storage.local (10MB+ limit)
 * Instead of chrome.storage.sync (8KB per item limit)
 *
 * This prevents quota exceeded errors when storing large YouTube transcripts
 */
export const storage = new Storage({
  area: "local"
})

/**
 * Cleanup old video contexts to prevent storage overflow
 * Keeps max 50 videos, removes oldest 10 when limit reached
 */
export async function cleanupVideoStorage(): Promise<void> {
  const MAX_VIDEOS = 50
  const REMOVE_COUNT = 10

  const allStorage = (await chrome.storage.local.get(null)) as unknown as { [key: string]: any }
  const videoContextKeys = Object.keys(allStorage)
    .filter(key => key.startsWith('videoContext_'))
  
  if (videoContextKeys.length >= MAX_VIDEOS) {
    // Remove oldest entries (Chrome stores keys in insertion order)
    const toRemove = videoContextKeys.slice(0, REMOVE_COUNT)
    await chrome.storage.local.remove(toRemove)
    console.log(`🧹 Cleaned up ${toRemove.length} old videos (${videoContextKeys.length} → ${videoContextKeys.length - REMOVE_COUNT})`)
  }
}