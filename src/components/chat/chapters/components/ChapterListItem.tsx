import type { Chapter } from "~types/transcript"
import { useChapterStore } from "~stores/chapterStore"
import { useChapterSelection } from "~hooks/chapters/useChapterSelection"

interface ChapterListItemProps {
  chapter: Chapter
  index: number
}

export function ChapterListItem({ chapter, index }: ChapterListItemProps) {
  const isSelected = useChapterStore((state) =>
    state.draftSelectedChapters.includes(index)
  )
  const truncatedChapter = useChapterStore((state) => state.truncatedChapter)
  const { handleToggleChapter } = useChapterSelection()

  // Check if this chapter is the truncated one
  const isTruncated = truncatedChapter?.chapterIndex === index
  const truncationPercentage = isTruncated ? truncatedChapter.truncationPercentage : null

  // Disable unselected chapters when truncation is active (context limit reached)
  const isDisabled = truncatedChapter !== null && !isSelected

  // Determine tooltip text
  const tooltipText = isDisabled
    ? "Cannot add more chapters - 80% context limit reached. Deselect chapters to add others."
    : `${index + 1}. ${chapter.title}`

  return (
    <div
      className={`
        relative flex items-center space-x-2 py-1 px-2 rounded transition-all duration-150 group
        ${isSelected ? "bg-blue-50/50" : ""}
        ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"}
      `}
      onClick={() => {
        if (!isDisabled) {
          handleToggleChapter(index)
        }
      }}
      title={tooltipText}>
      {/* Selection indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
      )}

      <input
        type="checkbox"
        id={`chapter-${index}`}
        checked={isSelected}
        disabled={isDisabled}
        readOnly
        className={`
          h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none
          ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
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
        `}>
        {chapter.title}
      </span>

      {/* Truncation indicator badge */}
      {isTruncated && truncationPercentage !== null && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex-shrink-0"
          title={`Only ${truncationPercentage}% of this chapter's transcript fits in the 80% context window budget. Later segments were truncated to stay within limits.`}>
          <span>{truncationPercentage}%</span>
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
