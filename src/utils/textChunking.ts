import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import type { TranscriptChunk } from "~types/transcript"
import { RAG_CONFIG } from "./constants"

/**
 * Chunks a transcript into overlapping segments suitable for embedding
 *
 * @param transcript - Full video transcript text (clean, no timestamps)
 * @param videoId - YouTube video ID
 * @returns Array of transcript chunks
 */
export async function chunkTranscript(
  transcript: string,
  videoId: string
): Promise<TranscriptChunk[]> {
  // Initialize text splitter with fixed chunk size
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: RAG_CONFIG.chunkSize,
    chunkOverlap: RAG_CONFIG.chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
    lengthFunction: (text: string) => text.length
  })

  // Split transcript into chunks
  const textChunks = await splitter.splitText(transcript)

  // Map text chunks to TranscriptChunk objects
  const chunks: TranscriptChunk[] = textChunks.map((text, index) => ({
    id: `${videoId}-chunk-${index}`,
    videoId,
    text,
    chunkIndex: index
  }))

  return chunks
}

/**
 * Checks if transcript needs RAG (too long for context window)
 */
export function shouldUseRAG(transcript: string): boolean {
  const TRANSCRIPT_CHAR_LIMIT = 2000
  return transcript.length > TRANSCRIPT_CHAR_LIMIT
}
