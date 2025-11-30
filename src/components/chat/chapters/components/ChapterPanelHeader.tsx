import { Minimize2 } from "lucide-react"
import { useCallback } from "react"
import { useChapterStore } from "~stores/chapterStore"
import { parseChapterRange } from "~utils/chapterRangeParser"

interface ChapterPanelHeaderProps {
  selectedCount: number
  totalCount: number
  validationInProgress: boolean
  onMinimize: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onApplyRange: (indices: number[]) => void
}

export function ChapterPanelHeader({
  selectedCount,
  totalCount,
  validationInProgress,
  onMinimize,
  onSelectAll,
  onDeselectAll,
  onApplyRange
}: ChapterPanelHeaderProps) {
  const rangeInput = useChapterStore((state) => state.rangeInput)
  const setRangeInput = useChapterStore((state) => state.setRangeInput)

  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setRangeInput(newValue)
      
      const indices = parseChapterRange(newValue, totalCount)
      onApplyRange(indices)
    },
    [setRangeInput, totalCount, onApplyRange]
  )

  return (
    <div className="flex-shrink-0 p-3 border-b border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold text-gray-800">
          Select Context
        </h2>
        <button
          onClick={onMinimize}
          className="p-1 rounded-md hover:bg-gray-200 transition-colors"
          title="Minimize"
          disabled={validationInProgress}>
          <Minimize2 size={16} />
        </button>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        {selectedCount} / {totalCount} chapters selected
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={onSelectAll}
          disabled={validationInProgress}
          className="bg-white border border-gray-200 text-gray-700 text-xs py-1 h-6 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          All
        </button>
        <button
          onClick={onDeselectAll}
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
  )
}
