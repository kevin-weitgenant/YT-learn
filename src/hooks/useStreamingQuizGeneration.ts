import { useState, useRef } from "react"
import { JSONParser } from "@streamparser/json-whatwg"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { LanguageModelSession } from "../types/chrome-ai"
import type { Concept, QuizQuestions } from "../components/quiz/quizSchema"
import { quizQuestionSchema } from "../components/quiz/quizSchema"
import { generateQuizPrompt } from "../components/quiz/quizPrompts"

interface UseStreamingQuizGenerationOptions {
  baseSession: LanguageModelSession | null
  onFinish?: (questions: QuizQuestions) => void
}

interface UseStreamingQuizGenerationReturn {
  questions: QuizQuestions
  isLoading: boolean
  error: Error | null
  generateQuiz: (concept: Concept) => Promise<void>
  stop: () => void
  reset: () => void
}

/**
 * Hook for streaming quiz generation with real-time UI updates
 * Mirrors the pattern used in useStreamingObject for concept extraction
 */
export function useStreamingQuizGeneration({
  baseSession,
  onFinish
}: UseStreamingQuizGenerationOptions): UseStreamingQuizGenerationReturn {
  const [questions, setQuestions] = useState<QuizQuestions>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateQuiz = async (concept: Concept) => {
    if (!baseSession) {
      setError(new Error("Base session not initialized"))
      return
    }

    setIsLoading(true)
    setError(null)
    setQuestions([]) // Reset questions for new generation

    // Clone the base session for this specific concept
    const clonedSession = await baseSession.clone()
    abortControllerRef.current = new AbortController()

    try {
      const prompt = generateQuizPrompt(concept)
      const jsonSchema = zodToJsonSchema(quizQuestionSchema, {
        $refStrategy: "none"
      })

      const parser = new JSONParser({
        paths: ["$.*"], // Parse array items
        keepStack: false
      })

      let accumulatedQuestions: any[] = []

      // Start streaming from AI with schema constraint
      const aiStream = clonedSession.promptStreaming(prompt, {
        responseConstraint: jsonSchema,
        signal: abortControllerRef.current.signal
      })

      // Create readable stream from AI stream
      const inputStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of aiStream) {
              controller.enqueue(chunk)
            }
            controller.close()
          } catch (err) {
            if ((err as Error).name !== "AbortError") {
              controller.error(err)
            }
            controller.close()
          }
        }
      })

      // Pipe through JSON parser
      const reader = inputStream.pipeThrough(parser).getReader()

      // 🔥 KEY: Stream updates to UI as questions arrive
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value.value !== undefined) {
          accumulatedQuestions.push(value.value)
          // ✅ Update state immediately - UI re-renders with each question!
          setQuestions([...accumulatedQuestions])
        }
      }

      // Validate final result with Zod schema
      const validated = quizQuestionSchema.parse(accumulatedQuestions)
      setQuestions(validated)
      onFinish?.(validated)

      console.log(`✅ Generated ${validated.length} questions for concept: ${concept.title}`)
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Quiz generation failed:", err)
        setError(err as Error)
      }
    } finally {
      // Always cleanup cloned session
      if (clonedSession?.destroy) {
        clonedSession.destroy()
      }
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const reset = () => {
    setQuestions([])
    setError(null)
    setIsLoading(false)
  }

  return {
    questions,
    isLoading,
    error,
    generateQuiz,
    stop,
    reset
  }
}
