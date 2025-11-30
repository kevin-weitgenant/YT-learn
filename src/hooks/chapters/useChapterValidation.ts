import { useState, useCallback } from "react"
import { validateAndTruncateSelection } from "~utils/transcriptValidator"
import type { VideoContext } from "~types/transcript"
import type { LanguageModelSession } from "~types/chrome-ai"

export function useChapterValidation(
  videoContext: VideoContext | null,
  session: LanguageModelSession | null
) {
  const [validationInProgress, setValidationInProgress] = useState(false)

  const validateSelection = useCallback(
    async (
      newSelection: number[],
      onValidated: (validIndices: number[]) => void
    ) => {
      if (!videoContext || !session) {
        // No validation possible yet, just update local state
        onValidated(newSelection)
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

        // Optional: Show feedback if truncation occurred
        if (result.wasTruncated && result.removedIndices.length > 0) {
          console.log(
            `⚠️ Chapters ${result.removedIndices.map((i) => i + 1).join(", ")} removed (context limit)`
          )
        }
      } catch (error) {
        console.error("Validation failed:", error)
        // On error, keep the selection as-is
        onValidated(newSelection)
      } finally {
        setValidationInProgress(false)
      }
    },
    [videoContext, session]
  )

  return {
    validationInProgress,
    validateSelection
  }
}
