/**
 * Video Context Interface
 * Stores YouTube video metadata and transcript for AI context
 */
export interface VideoContext {
  /** The YouTube video ID */
  videoId: string
  /** The full transcript text from the YouTube video */
  transcript?: string
  /** The title of the YouTube video */
  title: string
  /** The URL of the YouTube video */
  url: string
  /** The channel/creator name */
  channel: string
  /** Timestamp when the context was created */
  timestamp: number
  /** Optional error message if transcript extraction fails */
  error?: string
  /** Video chapters/timestamps (empty array if none, undefined if extraction failed) */
  chapters?: Chapter[]
}

/**
 * Video Chapter Interface
 * Represents a single chapter/timestamp in a YouTube video
 */
export interface Chapter {
  /** Chapter title (e.g., "Introduction", "Main Content") */
  title: string
  /** Start time in seconds (e.g., 0, 83, 156) */
  startSeconds: number
}

