import type { TranscriptChunk } from "./transcript"

export interface Message {
  id: number
  text: string
  sender: "user" | "bot"
  /** Retrieved RAG chunks (only present on user messages when RAG was used) */
  retrievedChunks?: TranscriptChunk[]
}

