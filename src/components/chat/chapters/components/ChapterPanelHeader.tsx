import { Minimize2 } from "lucide-react"
import { useChapterStore } from "~stores/chapterStore"
import { useChapterSelection } from "~hooks/chapters/useChapterSelection"
import { SelectedCountDisplay } from "./SelectedCountDisplay"
import { ChapterRangeInput } from "./ChapterRangeInput"

export function ChapterPanelHeader() {
  const truncatedChapter = useChapterStore((state) => state.truncatedChapter)
  const {
    validationInProgress,
    handleApplyRange,
    handleSelectAll,
    handleDeselectAll,
    handleMinimize
  } = useChapterSelection()

  // Disable "All" button when truncation is active (context limit reached)
  const isSelectAllDisabled = validationInProgress || truncatedChapter !== null

  return (
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
        <SelectedCountDisplay />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={handleSelectAll}
          disabled={isSelectAllDisabled}
          title={
            truncatedChapter !== null
              ? "Cannot select all - 80% context limit reached"
              : "Select all chapters"
          }
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

      <ChapterRangeInput onApplyRange={handleApplyRange} />
    </div>
  )
}
