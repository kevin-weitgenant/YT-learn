import { useChapterStore } from "~stores/chapterStore"

export function SelectedCountDisplay() {
  // Subscribe to lengths directly
  const selectedCount = useChapterStore(
    (state) => state.draftSelectedChapters.length
  )
  const totalCount = useChapterStore((state) => state.chapters.length)

  return (
    <span className="text-sm text-gray-600 font-medium">
      {selectedCount} / {totalCount} chapters
    </span>
  )
}
