import type { Chapter } from "~types/transcript"

interface ChapterListItemProps {
  chapter: Chapter
  index: number
  isSelected: boolean
  disabled: boolean
  onToggle: (index: number) => void
}

export function ChapterListItem({
  chapter,
  index,
  isSelected,
  disabled,
  onToggle
}: ChapterListItemProps) {
  return (
    <div
      className={`
        relative flex items-center space-x-2 py-1 px-2 rounded cursor-pointer transition-all duration-150 hover:bg-gray-100 group
        ${isSelected ? "bg-blue-50/50" : ""}
        ${disabled ? "opacity-50 pointer-events-none" : ""}
      `}
      onClick={() => onToggle(index)}>
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
}
