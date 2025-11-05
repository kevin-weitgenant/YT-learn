import { Check, ChevronRight, X } from "lucide-react"
import type { Concept } from "./quizSchema"
import type { QuizCompletion } from "~hooks/useQuizStorage"

interface ConceptSidebarProps {
  concepts: Concept[]
  currentConceptIndex: number
  completions: QuizCompletion[]
  onSelectConcept: (index: number) => void
}

export function ConceptSidebar({
  concepts,
  currentConceptIndex,
  completions,
  onSelectConcept
}: ConceptSidebarProps) {
  const getCompletionForConcept = (conceptId: number): QuizCompletion | undefined => {
    return completions.find(c => c.conceptId === conceptId)
  }

  const passedCount = completions.filter(c => c.passed).length

  return (
    <div className="w-96 bg-gray-50 border-r border-gray-200 p-6 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Concept Quiz
        </h2>
        <p className="text-sm text-gray-500">
          {passedCount} of {concepts.length} completed
        </p>
      </div>

      {/* Concept List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {concepts.map((concept, index) => {
          const isCurrent = index === currentConceptIndex
          const completion = getCompletionForConcept(concept.id)

          return (
            <button
              key={concept.id}
              onClick={() => onSelectConcept(index)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all
                ${isCurrent
                  ? 'bg-blue-50 border-l-4 border-blue-600 pl-3'
                  : 'hover:bg-gray-100 border-l-4 border-transparent'
                }
              `}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {completion ? (
                  completion.passed ? (
                    <Check size={18} className="text-green-600" />
                  ) : (
                    <X size={18} className="text-red-600" />
                  )
                ) : isCurrent ? (
                  <ChevronRight size={18} className="text-blue-600" />
                ) : (
                  <span className="text-sm font-medium text-gray-400">
                    {concept.id}
                  </span>
                )}
              </div>

              {/* Concept Title and Score */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <p className={`
                  text-base font-medium truncate
                  ${isCurrent ? 'text-blue-900' : 'text-gray-700'}
                `}>
                  {concept.title}
                </p>

                {/* Score Badge */}
                {completion && (
                  <span className={`
                    text-xs font-semibold whitespace-nowrap
                    ${completion.passed ? 'text-green-600' : 'text-red-600'}
                  `}>
                    {completion.score}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
