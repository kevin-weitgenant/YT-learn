import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import type { Concept, QuizQuestions } from "./quizSchema"
import type { QuizData, QuizCompletion } from "~hooks/useQuizStorage"
import type { LanguageModelSession } from "~types/chrome-ai"
import { QuizQuestion } from "./QuizQuestion"
import { QuizResults } from "./QuizResults"
import { useStreamingQuizGeneration } from "~hooks/useStreamingQuizGeneration"

interface QuizContentAreaProps {
  concept: Concept
  conceptNumber: number
  totalConcepts: number
  completion: QuizCompletion | undefined
  baseSession: LanguageModelSession | null
  getQuizForConcept: (conceptId: number) => QuizData | undefined
  saveQuiz: (conceptId: number, questions: QuizQuestions) => Promise<void>
  onQuizComplete: (score: number, total: number) => void
  onRetake: () => void
  onContinue: () => void
}

export function QuizContentArea({
  concept,
  conceptNumber,
  totalConcepts,
  completion,
  baseSession,
  getQuizForConcept,
  saveQuiz,
  onQuizComplete,
  onRetake,
  onContinue
}: QuizContentAreaProps) {
  const [savedQuestions, setSavedQuestions] = useState<QuizQuestions>([])
  const [userAnswers, setUserAnswers] = useState<(boolean | undefined)[]>([])
  const [isLoadingSaved, setIsLoadingSaved] = useState(false)
  const [hasReportedCompletion, setHasReportedCompletion] = useState(false)

  // Streaming quiz generation hook
  const {
    questions: streamingQuestions,
    isLoading: isGenerating,
    error: streamingError,
    generateQuiz,
    reset: resetStreamingQuiz
  } = useStreamingQuizGeneration({
    baseSession,
    onFinish: async (questions) => {
      // Save to storage when generation completes
      await saveQuiz(concept.id, questions)
    }
  })

  // Load saved quiz when concept changes
  useEffect(() => {
    setIsLoadingSaved(true)
    const savedQuiz = getQuizForConcept(concept.id)
    if (savedQuiz) {
      setSavedQuestions(savedQuiz.questions)
      setUserAnswers(new Array(savedQuiz.questions.length).fill(undefined))
    } else {
      setSavedQuestions([])
      setUserAnswers([])
    }
    setIsLoadingSaved(false)

    // Reset streaming questions and completion flag when changing concepts
    resetStreamingQuiz()
    setHasReportedCompletion(false)
  }, [concept.id, getQuizForConcept])

  // Determine which questions to display (streaming or saved)
  const displayQuestions = savedQuestions.length > 0 ? savedQuestions : streamingQuestions

  // Check if all questions are answered
  const allQuestionsAnswered =
    displayQuestions.length > 0 &&
    userAnswers.length === displayQuestions.length &&
    userAnswers.every(answer => answer !== undefined)

  // Calculate score
  const calculateScore = () => {
    let correct = 0
    displayQuestions.forEach((q, index) => {
      if (userAnswers[index] === q.correctAnswer) {
        correct++
      }
    })
    return correct
  }

  const quizGenerated = displayQuestions.length > 0
  const generationError = streamingError?.message || null

  // Sync userAnswers array length when displayQuestions changes (for streaming)
  useEffect(() => {
    if (displayQuestions.length > userAnswers.length) {
      setUserAnswers(prev => [
        ...prev,
        ...new Array(displayQuestions.length - prev.length).fill(undefined)
      ])
    }
  }, [displayQuestions.length])

  // Trigger completion when all questions answered
  useEffect(() => {
    if (allQuestionsAnswered && displayQuestions.length > 0 && !hasReportedCompletion) {
      const score = calculateScore()
      onQuizComplete(score, displayQuestions.length)
      setHasReportedCompletion(true)
    }
  }, [allQuestionsAnswered, displayQuestions.length, hasReportedCompletion])

  const handleGenerateQuiz = async () => {
    // Check if already generated and saved
    const savedQuiz = getQuizForConcept(concept.id)
    if (savedQuiz) {
      setSavedQuestions(savedQuiz.questions)
      setUserAnswers(new Array(savedQuiz.questions.length).fill(undefined))
      return
    }

    // Generate new quiz with streaming
    await generateQuiz(concept)
  }

  const handleAnswer = (questionIndex: number, answer: boolean) => {
    const newAnswers = [...userAnswers]
    newAnswers[questionIndex] = answer
    setUserAnswers(newAnswers)
  }

  const handleRetake = async () => {
    await onRetake()
    // Reset for fresh attempt
    setSavedQuestions([])
    setUserAnswers([])
    setHasReportedCompletion(false)
  }

  return (
    <div className="space-y-8">
      {/* Top Section - Progress & Title */}
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Concept {conceptNumber} of {totalConcepts}
          </p>
          {completion && (
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
              completion.passed
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {completion.passed ? '✓' : '✗'} {completion.score}%
            </span>
          )}
        </div>

        {/* Concept Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {concept.title}
          </h1>
        </div>
      </div>

      {/* Quiz Content Area - Fixed Height, Scrollable */}
      <div className="h-[550px] overflow-y-auto">
        {quizGenerated ? (
          <div className="space-y-4">
            {/* Progress Header */}
            <div className="flex items-baseline gap-3 mb-2">
              <h3 className="font-semibold text-base text-gray-700">
                Quiz Questions
              </h3>
              <span className="text-sm text-gray-500">
                ({displayQuestions.length} question{displayQuestions.length !== 1 ? 's' : ''})
              </span>
              {isGenerating && (
                <span className="text-xs text-blue-600 font-medium animate-pulse">
                  Generating...
                </span>
              )}
            </div>

            {/* Question List */}
            <div className="space-y-3 pr-2">
              {displayQuestions.map((q, index) => (
                <QuizQuestion
                  key={index}
                  questionNumber={index + 1}
                  question={q.question}
                  correctAnswer={q.correctAnswer}
                  explanation={q.explanation}
                  isStreaming={isGenerating && index === displayQuestions.length - 1}
                  onAnswer={(answer) => handleAnswer(index, answer)}
                  disabled={userAnswers[index] !== undefined}
                />
              ))}

              {allQuestionsAnswered && (
                <QuizResults
                  score={calculateScore()}
                  total={displayQuestions.length}
                  onContinue={onContinue}
                  onRetake={handleRetake}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              Click "Generate Quiz" to start
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {generationError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {generationError}
        </div>
      )}

      {/* Generate Quiz Button */}
      {!quizGenerated && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerateQuiz}
            disabled={isGenerating}
            className={`
              flex items-center gap-2 px-8 py-3 font-semibold rounded-lg transition-all shadow-sm hover:shadow-md
              ${isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            <Sparkles size={18} />
            {isGenerating ? 'Generating...' : 'Generate Quiz'}
          </button>
        </div>
      )}
    </div>
  )
}
