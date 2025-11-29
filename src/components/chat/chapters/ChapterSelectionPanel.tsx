import { Minimize2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useChapterStore } from "~stores/chapterStore"
import { useChatStore } from "~stores/chatStore"
import { validateAndTruncateSelection } from "~utils/transcriptValidator"

export function ChapterSelectionPanel() {
  // Get state from Zustand stores
  const chapters = useChapterStore((state) => state.chapters)
  const storeSelectedChapters = useChapterStore((state) => state.selectedChapters)
  const setSelectedChapters = useChapterStore((state) => state.setSelectedChapters)
  const togglePanel = useChapterStore((state) => state.togglePanel)
  const setRangeInput = useChapterStore((state) => state.setRangeInput)

  const videoContext = useChatStore((state) => state.videoContext)
  const session = useChatStore((state) => state.session)

  // Local state for buffered selections
  const [localSelectedChapters, setLocalSelectedChapters] = useState<number[]>([])
  const [rangeInput, setLocalRangeInput] = useState("")
  const [validationInProgress, setValidationInProgress] = useState(false)

  // Initialize local state from store on mount
  useEffect(() => {
    setLocalSelectedChapters(storeSelectedChapters)
  }, [storeSelectedChapters])

  // Real-time validation when local selection changes
  const validateSelection = useCallback(
    async (newSelection: number[]) => {
      if (!videoContext || !session) {
        // No validation possible yet, just update local state
        setLocalSelectedChapters(newSelection)
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
        setLocalSelectedChapters(result.validIndices)

        // Optional: Show feedback if truncation occurred
        if (result.wasTruncated && result.removedIndices.length > 0) {
          console.log(
            `⚠️ Chapters ${result.removedIndices.map(i => i + 1).join(", ")} removed (context limit)`
          )
        }
      } catch (error) {
        console.error("Validation failed:", error)
        // On error, keep the selection as-is
        setLocalSelectedChapters(newSelection)
      } finally {
        setValidationInProgress(false)
      }
    },
    [videoContext, session]
  )

  // Local handlers that update local state + validate
  const handleToggleChapter = useCallback(
    (chapterIndex: number) => {
      const newSelection = localSelectedChapters.includes(chapterIndex)
        ? localSelectedChapters.filter((i) => i !== chapterIndex)
        : [...localSelectedChapters, chapterIndex]

      validateSelection(newSelection)
    },
    [localSelectedChapters, validateSelection]
  )

  const handleSelectAll = useCallback(() => {
    const allIndices = Array.from({ length: chapters.length }, (_, i) => i)
    validateSelection(allIndices)
  }, [chapters.length, validateSelection])

  const handleDeselectAll = useCallback(() => {
    validateSelection([])
  }, [validateSelection])

  const handleApplyRange = useCallback(
    (rangeValue: string) => {
      const selected = new Set<number>()
      const ranges = rangeValue.split(",")
      const totalChapters = chapters.length

      ranges.forEach((range) => {
        const parts = range.trim().split("-")
        if (parts.length === 1 && parts[0]) {
          // Single number (e.g., "3")
          const num = parseInt(parts[0], 10) - 1
          if (!isNaN(num) && num >= 0 && num < totalChapters) {
            selected.add(num)
          }
        } else if (parts.length === 2) {
          // Range (e.g., "1-3")
          const start = parseInt(parts[0], 10) - 1
          const end = parseInt(parts[1], 10) - 1
          if (!isNaN(start) && !isNaN(end)) {
            for (
              let i = Math.min(start, end);
              i <= Math.max(start, end);
              i++
            ) {
              if (i >= 0 && i < totalChapters) {
                selected.add(i)
              }
            }
          }
        }
      })

      validateSelection(Array.from(selected))
    },
    [chapters.length, validateSelection]
  )
  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalRangeInput(newValue)
      setRangeInput(newValue) // Keep store in sync for persistence
      handleApplyRange(newValue)
    },
    [setRangeInput, handleApplyRange]
  )

  // Sync local state to store when minimizing panel
  const handleMinimize = useCallback(() => {
    // Commit local selection to store
    setSelectedChapters(localSelectedChapters)
    // Close panel
    togglePanel()
  }, [localSelectedChapters, setSelectedChapters, togglePanel])

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden border-l border-gray-200">
      <div className="flex-shrink-0 p-3 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-semibold text-gray-800">
            Select Context
          </h2>
          <button
            onClick={handleMinimize}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title="Minimize"
            disabled={validationInProgress}>
            <Minimize2 size={16} />
          </button>
        </div>

        <div className="text-xs text-gray-600 mb-2">
          {localSelectedChapters.length} / {chapters.length} chapters selected
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={handleSelectAll}
            disabled={validationInProgress}
            className="bg-white border border-gray-200 text-gray-700 text-xs py-1 h-6 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            All
          </button>
          <button
            onClick={handleDeselectAll}
            disabled={validationInProgress}
            className="bg-white border border-gray-200 text-gray-700 text-xs py-1 h-6 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            None
          </button>
        </div>
        <div>
          <label
            htmlFor="chapter-range"
            className="text-xs font-medium mb-1 block text-gray-700">
            Range (e.g., 1-3,5-8)
          </label>
          <input
            id="chapter-range"
            value={rangeInput}
            onChange={handleRangeChange}
            placeholder="1-3,5-8"
            className="mb-2 bg-white text-gray-800 border-gray-200 text-xs h-7 w-full rounded-md px-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="p-2">
            {chapters.map((chapter, index) => {
              const isSelected = localSelectedChapters.includes(index)
              return (
                <div
                  key={index}
                  className={`
                    relative flex items-center space-x-2 py-1 px-2 rounded cursor-pointer transition-all duration-150 hover:bg-gray-100 group
                    ${isSelected ? "bg-blue-50/50" : ""}
                    ${validationInProgress ? "opacity-50 pointer-events-none" : ""}
                  `}
                  onClick={() => handleToggleChapter(index)}>
                  {/* Selection indicator bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                  )}

                  <input
                    type="checkbox"
                    id={`chapter-${index}`}
                    checked={isSelected}
                    readOnly
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                  />

                  <span
                    className={`
                      text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0
                      ${
                        isSelected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}>
                    {index + 1}
                  </span>

                  <span
                    className={`
                      text-sm font-medium flex-1 truncate leading-tight
                      ${isSelected ? "text-gray-900" : "text-gray-700"}
                    `}
                    title={`${index + 1}. ${chapter.title}`}>
                    {chapter.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
