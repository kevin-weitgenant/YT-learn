import { useChapterStore } from "~stores/chapterStore"
import { useChapterSelection } from "~hooks/chapters/useChapterSelection"
import { ChapterPanelHeader } from "./components/ChapterPanelHeader"
import { ChapterListItem } from "./components/ChapterListItem"

export function ChapterSelectionPanel() {
  const chapters = useChapterStore((state) => state.chapters)

  const {
    localSelectedChapters,
    validationInProgress,
    handleToggleChapter,
    handleSelectAll,
    handleDeselectAll,
    handleApplyRange,
    handleMinimize
  } = useChapterSelection()

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden border-l border-gray-200">
      <ChapterPanelHeader
        selectedCount={localSelectedChapters.length}
        totalCount={chapters.length}
        validationInProgress={validationInProgress}
        onMinimize={handleMinimize}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onApplyRange={handleApplyRange}
      />

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="p-2">
            {chapters.map((chapter, index) => (
              <ChapterListItem
                key={index}
                chapter={chapter}
                index={index}
                isSelected={localSelectedChapters.includes(index)}
                disabled={validationInProgress}
                onToggle={handleToggleChapter}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
