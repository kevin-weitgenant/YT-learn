import { useCallback } from "react"
import { useChapterStore } from "~stores/chapterStore"
import { parseChapterRange } from "~utils/chapterRangeParser"

interface ChapterRangeInputProps {
  onApplyRange: (indices: number[]) => void
  disabled?: boolean
}

export function ChapterRangeInput({
  onApplyRange,
  disabled = false
}: ChapterRangeInputProps) {
  const rangeInput = useChapterStore((state) => state.rangeInput)
  const setRangeInput = useChapterStore((state) => state.setRangeInput)
  const totalCount = useChapterStore((state) => state.chapters.length)

  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      // Update input immediately
      setRangeInput(newValue)

      // Parse and validate selection
      const indices = parseChapterRange(newValue, totalCount)
      onApplyRange(indices)
    },
    [setRangeInput, totalCount, onApplyRange]
  )

  return (
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
        disabled={disabled}
        className="mb-2 bg-white text-gray-800 border-gray-200 text-xs h-7 w-full rounded-md px-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}
