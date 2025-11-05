import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
import type { EmbeddingProgress } from "../types/transcript"

interface UseEmbeddingProgressReturn {
  isEmbedding: boolean
  progress: EmbeddingProgress | null
}

/**
 * Hook to subscribe to embedding progress updates from session storage.
 * Automatically updates when background embedding process writes progress.
 *
 * @param videoId - YouTube video ID to track embedding progress for
 * @returns Object with isEmbedding boolean and full progress details
 */
export function useEmbeddingProgress(
  videoId: string | null
): UseEmbeddingProgressReturn {
  const sessionStorage = new Storage({ area: "session" })

  const [progress] = useStorage<EmbeddingProgress>({
    key: videoId ? `embeddingProgress-${videoId}` : null,
    instance: sessionStorage
  })

  const isEmbedding = progress?.status === "embedding"

  return { isEmbedding, progress }
}
