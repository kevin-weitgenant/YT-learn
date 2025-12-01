import { useChapterStore } from "~stores/chapterStore"
import { ChapterPanelHeader } from "./components/ChapterPanelHeader"
import { ChapterListItem } from "./components/ChapterListItem"

export function ChapterSelectionPanel() {
  const chapters = useChapterStore((state) => state.chapters)

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden border-l border-gray-200">
      <ChapterPanelHeader />

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="p-2">
            {chapters.map((chapter, index) => (
              <ChapterListItem key={index} chapter={chapter} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
