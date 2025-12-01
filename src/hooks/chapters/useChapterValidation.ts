import { useState, useCallback } from "react"
import { validateAndTruncateSelection } from "~utils/transcriptValidator"
import { useChapterStore } from "~stores/chapterStore"
import type { VideoContext } from "~types/transcript"
import type { LanguageModelSession } from "~types/chrome-ai"

export function useChapterValidation(
  videoContext: VideoContext | null,
  session: LanguageModelSession | null
) {
  const [validationInProgress, setValidationInProgress] = useState(false)
  const setTruncatedChapter = useChapterStore((state) => state.setTruncatedChapter)

  const validateSelection = useCallback(
    async (
      newSelection: number[],
      onValidated: (validIndices: number[]) => void
    ) => {
      if (!videoContext || !session) {
        // No validation possible yet, just update local state
        onValidated(newSelection)
        setTruncatedChapter(null)
        return
      }

      setValidationInProgress(true)

      try {
        const result = await validateAndTruncateSelection(
          videoContext,
          newSelection,
          session
        )

        // Update local state with validated (possibly truncated) selection
        onValidated(result.validIndices)

        // Store truncation info in chapter store
        setTruncatedChapter(result.truncatedChapter)

        // Optional: Show feedback if truncation occurred
        if (result.truncatedChapter) {
          const { chapterIndex, truncationPercentage } = result.truncatedChapter
          console.log(
            `⚠️ Chapter ${chapterIndex + 1} truncated to ${truncationPercentage}% (context limit)`
          )
        }
      } catch (error) {
        console.error("Validation failed:", error)
        // On error, keep the selection as-is
        onValidated(newSelection)
        setTruncatedChapter(null)
      } finally {
        setValidationInProgress(false)
      }
    },
    [videoContext, session, setTruncatedChapter]
  )

  return {
    validationInProgress,
    validateSelection
  }
}
