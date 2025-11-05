/**
 * Video Context Interface
 * Stores YouTube video metadata and transcript for AI context
 */
export interface VideoContext {
  /** The YouTube video ID */
  videoId: string
  /** The full transcript text from the YouTube video */
  transcript: string
  /** The title of the YouTube video */
  title: string
  /** The URL of the YouTube video */
  url: string
  /** The channel/creator name */
  channel: string
  /** Timestamp when the context was created */
  timestamp: number
}

/**
 * A single chunk of transcript with embedding metadata
 * Stored in IndexedDB via MeMemo (text + embedding together)
 */
export interface TranscriptChunk {
  /** Unique identifier: "{videoId}-chunk-{index}" */
  id: string

  /** YouTube video ID for multi-video support */
  videoId: string

  /** Clean text content (NO timestamps - for embedding quality) */
  text: string

  /** Chunk position in sequence (0, 1, 2, ...) */
  chunkIndex: number

  /** 384-dimensional embedding vector (populated by worker, stored with chunk) */
  embedding?: number[]
}

/**
 * Status of embedding generation process
 */
export type EmbeddingStatus =
  | "idle" // No processing needed (transcript < 2000 chars)
  | "downloading_model" // First-time model download from HuggingFace
  | "chunking" // Splitting transcript into chunks
  | "embedding" // Generating embeddings via worker
  | "ready" // Embeddings stored in IndexedDB, ready for RAG
  | "error" // Something failed

/**
 * Progress tracking for UI display
 * Stored in chrome.storage.local as "embeddingStatus-{videoId}"
 */
export interface EmbeddingProgress {
  status: EmbeddingStatus

  /** Overall progress 0-100 */
  progress: number

  /** Current step description for UI */
  currentStep: string

  /** For "embedding" status: current chunk being processed */
  currentChunk?: number

  /** For "embedding" status: total chunks to process */
  totalChunks?: number

  /** For "downloading_model" status: which file is downloading */
  downloadingFile?: string

  /** Error message if status is "error" */
  error?: string

  /** When this status was last updated */
  lastUpdated: number
}
