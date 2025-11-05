import { useState, useRef } from "react"
import { JSONParser } from "@streamparser/json-whatwg"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { z, ZodSchema } from "zod"
import type { LanguageModelSession } from "../types/chrome-ai"

interface UseStreamingObjectOptions<T> {
  schema: ZodSchema<T>
  session: LanguageModelSession | null
  onFinish?: (finalObject: T) => void
}

interface UseStreamingObjectReturn<T> {
  object: Partial<T> | undefined
  error: Error | null
  isLoading: boolean
  submit: (prompt: string) => Promise<void>
  stop: () => void
}

/**
 * Custom hook for streaming structured JSON objects from Chrome AI
 */
export function useStreamingObject<T>({
  schema,
  session,
  onFinish
}: UseStreamingObjectOptions<T>): UseStreamingObjectReturn<T> {
  const [object, setObject] = useState<Partial<T> | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const submit = async (prompt: string) => {
    if (!session) {
      setError(new Error("AI session not available"))
      return
    }

    if (isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)
    setObject(undefined)

    abortControllerRef.current = new AbortController()

    try {
      const jsonSchema = zodToJsonSchema(schema, {
        $refStrategy: "none"
      })

      const isArray = (jsonSchema as any).type === "array"
      const parserPath = isArray ? ["$.*"] : ["$"]

      const parser = new JSONParser({
        paths: parserPath,
        keepStack: false
      })

      let partialObject: Partial<T> | undefined = undefined
      let accumulatedItems: any[] = []

      const aiStream = session.promptStreaming(prompt, {
        responseConstraint: jsonSchema,
        signal: abortControllerRef.current.signal
      })

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

      const reader = inputStream.pipeThrough(parser).getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value.value !== undefined) {
          if (isArray) {
            accumulatedItems.push(value.value)
            partialObject = [...accumulatedItems] as any
          } else {
            partialObject = value.value as Partial<T>
          }
          
          setObject(partialObject)
        }
      }

      if (partialObject !== undefined) {
        try {
          const validated = schema.parse(partialObject)
          setObject(validated as T)
          onFinish?.(validated)
        } catch (validationError) {
          // Keep partial object even if validation fails
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err as Error)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  return {
    object,
    error,
    isLoading,
    submit,
    stop
  }
}

