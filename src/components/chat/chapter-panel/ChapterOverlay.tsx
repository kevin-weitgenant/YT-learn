import { useChapterStore } from "../../../stores/chapterStore"
import { ChapterSelectionPanel } from "./ChapterSelectionPanel"

/**
 * A component that displays the chapter selection panel as an overlay.
 * It uses the `useChapterStore` to determine whether to show the panel and to provide the toggle functionality.
 * The overlay consists of a semi-transparent backdrop and a slide-in panel for chapter selection.
 */
export function ChapterOverlay() {
  const showChapterPanel = useChapterStore((state) => state.showPanel)
  const toggleChapterPanel = useChapterStore((state) => state.togglePanel)

  if (!showChapterPanel) {
    return null
  }

  return (
    <div className="absolute inset-0 flex z-10">
      <div
        onClick={toggleChapterPanel}
        className="flex-1 bg-black/20 animate-fade-in"
      />
      <div className="w-80 bg-white transform transition-transform duration-300 ease-in-out translate-x-0 animate-slide-in-right">
        <ChapterSelectionPanel />
      </div>
    </div>
  )
}
