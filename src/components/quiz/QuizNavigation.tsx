import { ChevronLeft, ChevronRight } from "lucide-react"

interface QuizNavigationProps {
  currentIndex: number
  totalConcepts: number
  onPrevious: () => void
  onNext: () => void
}

export function QuizNavigation({
  currentIndex,
  totalConcepts,
  onPrevious,
  onNext
}: QuizNavigationProps) {
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalConcepts - 1

  return (
    <div className="flex items-center justify-between pt-8 border-t border-gray-200">
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        disabled={isFirst}
        className={`
          flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg transition-all
          ${isFirst
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md'
          }
        `}
      >
        <ChevronLeft size={18} />
        Previous Concept
      </button>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={isLast}
        className={`
          flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg transition-all
          ${isLast
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
          }
        `}
      >
        Next Concept
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
