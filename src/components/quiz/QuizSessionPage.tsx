import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import type { ConceptArray } from "./quizSchema"
import { ConceptSidebar } from "./ConceptSidebar"
import { QuizContentArea } from "./QuizContentArea"
import { QuizNavigation } from "./QuizNavigation"
import { useQuizGenerationSession } from "~hooks/useQuizGenerationSession"
import { useQuizStorage, type QuizCompletion } from "~hooks/useQuizStorage"

interface QuizSessionPageProps {
  concepts: ConceptArray
  videoId: string
  onBack: () => void
}

export function QuizSessionPage({ concepts, videoId, onBack }: QuizSessionPageProps) {
  const [currentConceptIndex, setCurrentConceptIndex] = useState(0)

  // Initialize quiz generation session (base session for cloning)
  const {
    baseSession,
    isInitializing,
    error: sessionError,
    generateQuizForConcept
  } = useQuizGenerationSession()

  // Initialize quiz storage (quizzes and completions)
  const {
    completions,
    saveQuiz,
    saveCompletion,
    retakeQuiz,
    getQuizForConcept,
    getCompletionForConcept
  } = useQuizStorage(videoId)

  const currentConcept = concepts[currentConceptIndex]

  const handlePrevious = () => {
    if (currentConceptIndex > 0) {
      setCurrentConceptIndex(currentConceptIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentConceptIndex < concepts.length - 1) {
      setCurrentConceptIndex(currentConceptIndex + 1)
    }
  }

  const handleSelectConcept = (index: number) => {
    setCurrentConceptIndex(index)
  }

  const handleQuizComplete = async (score: number, total: number) => {
    const percentage = Math.round((score / total) * 100)
    const completion: QuizCompletion = {
      conceptId: currentConcept.id,
      score: percentage,
      totalQuestions: total,
      completedAt: Date.now(),
      passed: percentage >= 70
    }

    await saveCompletion(completion)
  }

  const handleRetake = async () => {
    await retakeQuiz(currentConcept.id)
  }

  const handleContinue = () => {
    // Advance to next concept if available
    if (currentConceptIndex < concepts.length - 1) {
      setCurrentConceptIndex(currentConceptIndex + 1)
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <ConceptSidebar
        concepts={concepts}
        currentConceptIndex={currentConceptIndex}
        completions={completions}
        onSelectConcept={handleSelectConcept}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Concepts</span>
          </button>
        </div>

        {/* Session Error */}
        {sessionError && (
          <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Session Error: {sessionError}
          </div>
        )}

        {/* Session Initializing */}
        {isInitializing && (
          <div className="mx-8 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            Initializing quiz generation session...
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <QuizContentArea
                concept={currentConcept}
                conceptNumber={currentConceptIndex + 1}
                totalConcepts={concepts.length}
                completion={getCompletionForConcept(currentConcept.id)}
                baseSession={baseSession}
                getQuizForConcept={getQuizForConcept}
                saveQuiz={saveQuiz}
                onQuizComplete={handleQuizComplete}
                onRetake={handleRetake}
                onContinue={handleContinue}
              />

              {/* Navigation - Fixed at bottom */}
              <QuizNavigation
                currentIndex={currentConceptIndex}
                totalConcepts={concepts.length}
                onPrevious={handlePrevious}
                onNext={handleNext}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
