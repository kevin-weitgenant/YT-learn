import { useState, useEffect, useCallback } from "react"
import { storage } from "~utils/storage"
import type { ConceptArray } from "~components/quiz/quizSchema"

interface UseConceptStorageResult {
  savedConcepts: ConceptArray | null
  saveConcepts: (concepts: ConceptArray) => Promise<void>
  clearConcepts: () => Promise<void>
  isLoading: boolean
  error: string | null
}

/**
 * Hook to manage concept storage in chrome.storage.local
 * Stores concepts per video using key: `concepts_${videoId}`
 */
export function useConceptStorage(videoId: string | null): UseConceptStorageResult {
  const [savedConcepts, setSavedConcepts] = useState<ConceptArray | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const storageKey = videoId ? `concepts_${videoId}` : null

  // Load concepts from storage on mount
  useEffect(() => {
    const loadConcepts = async () => {
      if (!storageKey) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const stored = await storage.get<ConceptArray>(storageKey)
        setSavedConcepts(stored || null)
      } catch (err) {
        console.error("Failed to load concepts from storage:", err)
        setError(err instanceof Error ? err.message : "Failed to load concepts")
        setSavedConcepts(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadConcepts()
  }, [storageKey])

  // Save concepts to storage
  const saveConcepts = useCallback(
    async (concepts: ConceptArray) => {
      if (!storageKey) {
        throw new Error("Cannot save concepts: no video ID provided")
      }

      try {
        setError(null)
        await storage.set(storageKey, concepts)
        setSavedConcepts(concepts)
      } catch (err) {
        console.error("Failed to save concepts to storage:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to save concepts"
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [storageKey]
  )

  // Clear concepts from storage
  const clearConcepts = useCallback(async () => {
    if (!storageKey) {
      throw new Error("Cannot clear concepts: no video ID provided")
    }

    try {
      setError(null)
      await storage.remove(storageKey)
      setSavedConcepts(null)
    } catch (err) {
      console.error("Failed to clear concepts from storage:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to clear concepts"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [storageKey])

  return {
    savedConcepts,
    saveConcepts,
    clearConcepts,
    isLoading,
    error
  }
}
