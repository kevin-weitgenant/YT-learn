import { useCallback, useEffect } from "react"
import { useChapterStore } from "~stores/chapterStore"
import { useChatStore } from "~stores/chatStore"
import { useChapterValidation } from "./useChapterValidation"
import { indicesToRangeString } from "~utils/chapterRangeParser"

export function useChapterSelection() {
  const videoContext = useChatStore((state) => state.videoContext)
  const session = useChatStore((state) => state.session)

  const { validationInProgress, validateSelection } = useChapterValidation(
    videoContext,
    session
  )

  const handleToggleChapter = useCallback(
    async (chapterIndex: number) => {
      // Read current draft from store
      const currentDraft = useChapterStore.getState().draftSelectedChapters

      // Calculate new selection
      const newSelection = currentDraft.includes(chapterIndex)
        ? currentDraft.filter((i) => i !== chapterIndex)
        : [...currentDraft, chapterIndex].sort((a, b) => a - b)

      // Validate and update if valid
      await validateSelection(newSelection, (validIndices) => {
        useChapterStore.getState().setDraft(validIndices)
        // Sync range input
        useChapterStore.getState().setRangeInput(indicesToRangeString(validIndices))
      })
    },
    [validateSelection]
  )

  const handleSelectAll = useCallback(async () => {
    const chapters = useChapterStore.getState().chapters
    const allIndices = Array.from({ length: chapters.length }, (_, i) => i)

    await validateSelection(allIndices, (validIndices) => {
      useChapterStore.getState().setDraft(validIndices)
      useChapterStore.getState().setRangeInput(indicesToRangeString(validIndices))
    })
  }, [validateSelection])

  const handleDeselectAll = useCallback(async () => {
    await validateSelection([], (validIndices) => {
      useChapterStore.getState().setDraft(validIndices)
      useChapterStore.getState().setRangeInput(indicesToRangeString(validIndices))
    })
  }, [validateSelection])

  const handleApplyRange = useCallback(
    async (indices: number[]) => {
      await validateSelection(indices, (validIndices) => {
        useChapterStore.getState().setDraft(validIndices)
        useChapterStore.getState().setRangeInput(indicesToRangeString(validIndices))
      })
    },
    [validateSelection]
  )

  const handleMinimize = useCallback(() => {
    useChapterStore.getState().commitDraft()
  }, [])

  return {
    validationInProgress,
    handleToggleChapter,
    handleSelectAll,
    handleDeselectAll,
    handleApplyRange,
    handleMinimize
  }
}
