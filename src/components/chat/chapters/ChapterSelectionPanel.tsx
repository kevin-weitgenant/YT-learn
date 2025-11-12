import { Minimize2 } from "lucide-react"
import { useChapterStore } from "~stores/chapterStore"

export function ChapterSelectionPanel() {
  // Get state and actions from Zustand store
  const chapters = useChapterStore((state) => state.chapters)
  const selectedChapters = useChapterStore((state) => state.selectedChapters)
  const rangeInput = useChapterStore((state) => state.rangeInput)
  const toggleChapter = useChapterStore((state) => state.toggleChapter)
  const togglePanel = useChapterStore((state) => state.togglePanel)
  const selectAll = useChapterStore((state) => state.selectAll)
  const deselectAll = useChapterStore((state) => state.deselectAll)
  const setRangeInput = useChapterStore((state) => state.setRangeInput)
  const applyRange = useChapterStore((state) => state.applyRange)
  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setRangeInput(newValue)
    applyRange(newValue)
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden border-l border-gray-200">
      <div className="flex-shrink-0 p-3 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-semibold text-gray-800">
            Select Context
          </h2>
          <button
            onClick={togglePanel}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title="Minimize">
            <Minimize2 size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={selectAll}
            className="bg-white border border-gray-200 text-gray-700 text-xs py-1 h-6 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
            All
          </button>
          <button
            onClick={deselectAll}
            className="bg-white border border-gray-200 text-gray-700 text-xs py-1 h-6 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
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
              const isSelected = selectedChapters.includes(index)
              return (
                <div
                  key={index}
                  className={`
                    relative flex items-center space-x-2 py-1 px-2 rounded cursor-pointer transition-all duration-150 hover:bg-gray-100 group
                    ${isSelected ? "bg-blue-50/50" : ""}
                  `}
                  onClick={() => toggleChapter(index)}>
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
