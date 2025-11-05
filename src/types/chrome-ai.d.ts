// TypeScript interfaces for Chrome's Prompt API (Gemini Nano)

export interface LanguageModelSession {
  destroy?: () => void
  temperature?: number
  topK?: number

  // System prompt management
  append?: (messages: { role: string; content: string }[]) => Promise<void>

  // Session cloning for parallel conversations
  clone?: () => Promise<LanguageModelSession>

  // Streaming response
  promptStreaming: (
    prompt: string,
    options?: {
      signal?: AbortSignal
      responseConstraint?: any
    }
  ) => AsyncIterable<string>

  // Token counting and quota management (official API)
  measureInputUsage: (input: string) => Promise<number>
  inputUsage: number  // Current token usage (read-only)
  inputQuota: number  // Total token quota available (read-only)

  // Legacy properties (for backward compatibility, not in official spec)
  maxTokens?: number
  tokensSoFar?: number
  tokensLeft?: number
}

// Download progress event
export interface DownloadProgressEvent {
  loaded: number  // 0 to 1 (percentage as decimal)
  total: number   // always 1
}

// Monitor callback for tracking download
export interface CreateMonitor {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: DownloadProgressEvent) => void
  ): void
}

export interface LanguageModel {
  create: (options: {
    temperature?: number
    topK?: number
    initialPrompts?: Array<{ role: string; content: string }>
    monitor?: (m: CreateMonitor) => void
  }) => Promise<LanguageModelSession>
  availability: () => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>
  params?: () => Promise<{
    defaultTopK: number
    maxTopK: number
    defaultTemperature: number
    maxTemperature: number
  }>
}

declare global {
  interface Window {
    // Stable API shape
    LanguageModel?: LanguageModel
  }
  // Stable API shape
  var LanguageModel: LanguageModel | undefined
}

export {}

