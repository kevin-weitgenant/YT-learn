import { useState, useEffect, useCallback } from "react"
import { useChapterStore } from "~stores/chapterStore"
import { useChatStore } from "~stores/chatStore"
import { useChapterValidation } from "./useChapterValidation"
import { indicesToRangeString } from "~utils/chapterRangeParser"

export function useChapterSelection() {
  const chapters = useChapterStore((state) => state.chapters)
  const storeSelectedChapters = useChapterStore((state) => state.selectedChapters)
  const setSelectedChapters = useChapterStore((state) => state.setSelectedChapters)
  const setRangeInput = useChapterStore((state) => state.setRangeInput)
  const togglePanel = useChapterStore((state) => state.togglePanel)

  const videoContext = useChatStore((state) => state.videoContext)
  const session = useChatStore((state) => state.session)

  // Local state for buffered selections
  const [localSelectedChapters, setLocalSelectedChapters] = useState<number[]>([])

  // Initialize local state from store on mount
  useEffect(() => {
    setLocalSelectedChapters(storeSelectedChapters)
  }, [storeSelectedChapters])

  const { validationInProgress, validateSelection } = useChapterValidation(
    videoContext,
    session
  )

  // Wrapper to update local state after validation
  const handleValidation = useCallback(
    (indices: number[]) => {
      validateSelection(indices, (validIndices) => {
        setLocalSelectedChapters(validIndices)
        // Sync range input to reflect current selection
        setRangeInput(indicesToRangeString(validIndices))
      })
    },
    [validateSelection, setRangeInput]
  )

  const handleToggleChapter = useCallback(
    (chapterIndex: number) => {
      const newSelection = localSelectedChapters.includes(chapterIndex)
        ? localSelectedChapters.filter((i) => i !== chapterIndex)
        : [...localSelectedChapters, chapterIndex]

      handleValidation(newSelection)
    },
    [localSelectedChapters, handleValidation]
  )

  const handleSelectAll = useCallback(() => {
    const allIndices = Array.from({ length: chapters.length }, (_, i) => i)
    handleValidation(allIndices)
  }, [chapters.length, handleValidation])

  const handleDeselectAll = useCallback(() => {
    handleValidation([])
  }, [handleValidation])

  const handleApplyRange = useCallback(
    (indices: number[]) => {
      handleValidation(indices)
    },
    [handleValidation]
  )

  // Sync local state to store when minimizing panel
  const handleMinimize = useCallback(() => {
    // Commit local selection to store
    setSelectedChapters(localSelectedChapters)
    // Close panel
    togglePanel()
  }, [localSelectedChapters, setSelectedChapters, togglePanel])

  return {
    localSelectedChapters,
    validationInProgress,
    handleToggleChapter,
    handleSelectAll,
    handleDeselectAll,
    handleApplyRange,
    handleMinimize
  }
}
