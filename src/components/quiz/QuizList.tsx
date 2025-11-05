import { ConceptCard } from "./ConceptCard"
import type { ConceptArray, Concept } from "./quizSchema"

interface ConceptListProps {
  concepts: ConceptArray
  onUpdateConcept: (id: number, updates: Partial<Omit<Concept, 'id'>>) => void
  onDeleteConcept: (id: number) => void
}

export function ConceptList({ concepts, onUpdateConcept, onDeleteConcept }: ConceptListProps) {
  if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h3 className="font-semibold text-base text-gray-700">
          Extracted Concepts
        </h3>
        <span className="text-sm text-gray-500">
          ({concepts.length} {concepts.length === 1 ? 'concept' : 'concepts'})
        </span>
      </div>
      <div className="space-y-3">
        {concepts.map((concept) => (
          <ConceptCard
            key={concept.id}
            concept={concept}
            onUpdate={onUpdateConcept}
            onDelete={onDeleteConcept}
          />
        ))}
      </div>
    </div>
  )
}

// Keep QuizList as an alias for backward compatibility during transition
export { ConceptList as QuizList }

