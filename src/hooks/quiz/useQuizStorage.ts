import { useState, useEffect, useCallback } from "react"
import { storage } from "~utils/storage"
import type { QuizQuestions } from "~components/quiz/quizSchema"

export interface QuizData {
  conceptId: number
  questions: QuizQuestions
  generatedAt: number
}

export interface QuizCompletion {
  conceptId: number
  score: number // Percentage (0-100)
  totalQuestions: number
  completedAt: number
  passed: boolean // score >= 70
}

interface UseQuizStorageResult {
  quizzes: QuizData[]
  completions: QuizCompletion[]
  isLoading: boolean
  error: string | null
  saveQuiz: (conceptId: number, questions: QuizQuestions) => Promise<void>
  saveCompletion: (completion: QuizCompletion) => Promise<void>
  retakeQuiz: (conceptId: number) => Promise<void>
  getQuizForConcept: (conceptId: number) => QuizData | undefined
  getCompletionForConcept: (conceptId: number) => QuizCompletion | undefined
}

/**
 * Hook to manage quiz storage in chrome.storage.local
 * Stores quizzes and completions per video:
 * - Quizzes: `quizzes_${videoId}` - Generated questions for each concept
 * - Completions: `quizCompletion_${videoId}` - User's scores and progress
 */
export function useQuizStorage(videoId: string | null): UseQuizStorageResult {
  const [quizzes, setQuizzes] = useState<QuizData[]>([])
  const [completions, setCompletions] = useState<QuizCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const quizzesKey = videoId ? `quizzes_${videoId}` : null
  const completionsKey = videoId ? `quizCompletion_${videoId}` : null

  // Load quizzes and completions from storage on mount
  useEffect(() => {
    const loadData = async () => {
      if (!quizzesKey || !completionsKey) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const [storedQuizzes, storedCompletions] = await Promise.all([
          storage.get<QuizData[]>(quizzesKey),
          storage.get<QuizCompletion[]>(completionsKey)
        ])

        setQuizzes(storedQuizzes || [])
        setCompletions(storedCompletions || [])
      } catch (err) {
        console.error("Failed to load quiz data from storage:", err)
        setError(err instanceof Error ? err.message : "Failed to load quiz data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [quizzesKey, completionsKey])

  // Save a generated quiz for a concept
  const saveQuiz = useCallback(
    async (conceptId: number, questions: QuizQuestions) => {
      if (!quizzesKey) {
        throw new Error("Cannot save quiz: no video ID provided")
      }

      try {
        setError(null)

        const newQuizData: QuizData = {
          conceptId,
          questions,
          generatedAt: Date.now()
        }

        // Update or add quiz for this concept
        const updatedQuizzes = quizzes.filter(q => q.conceptId !== conceptId)
        updatedQuizzes.push(newQuizData)

        await storage.set(quizzesKey, updatedQuizzes)
        setQuizzes(updatedQuizzes)
      } catch (err) {
        console.error("Failed to save quiz to storage:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to save quiz"
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [quizzesKey, quizzes]
  )

  // Save completion data for a concept
  const saveCompletion = useCallback(
    async (completion: QuizCompletion) => {
      if (!completionsKey) {
        throw new Error("Cannot save completion: no video ID provided")
      }

      try {
        setError(null)

        // Update or add completion for this concept
        const updatedCompletions = completions.filter(c => c.conceptId !== completion.conceptId)
        updatedCompletions.push(completion)

        await storage.set(completionsKey, updatedCompletions)
        setCompletions(updatedCompletions)
      } catch (err) {
        console.error("Failed to save completion to storage:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to save completion"
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [completionsKey, completions]
  )

  // Retake a quiz: clear both the quiz and completion for this concept
  const retakeQuiz = useCallback(
    async (conceptId: number) => {
      if (!quizzesKey || !completionsKey) {
        throw new Error("Cannot retake quiz: no video ID provided")
      }

      try {
        setError(null)

        // Remove quiz and completion for this concept
        const updatedQuizzes = quizzes.filter(q => q.conceptId !== conceptId)
        const updatedCompletions = completions.filter(c => c.conceptId !== conceptId)

        await Promise.all([
          storage.set(quizzesKey, updatedQuizzes),
          storage.set(completionsKey, updatedCompletions)
        ])

        setQuizzes(updatedQuizzes)
        setCompletions(updatedCompletions)
      } catch (err) {
        console.error("Failed to retake quiz:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to retake quiz"
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [quizzesKey, completionsKey, quizzes, completions]
  )

  // Get quiz for a specific concept
  const getQuizForConcept = useCallback(
    (conceptId: number): QuizData | undefined => {
      return quizzes.find(q => q.conceptId === conceptId)
    },
    [quizzes]
  )

  // Get completion for a specific concept
  const getCompletionForConcept = useCallback(
    (conceptId: number): QuizCompletion | undefined => {
      return completions.find(c => c.conceptId === conceptId)
    },
    [completions]
  )

  return {
    quizzes,
    completions,
    isLoading,
    error,
    saveQuiz,
    saveCompletion,
    retakeQuiz,
    getQuizForConcept,
    getCompletionForConcept
  }
}
