import type { FeatureExtractionPipeline } from "@huggingface/transformers"
import { querySimilarChunks } from "~utils/mememoStore"
import { getChunks } from "~utils/chunkStore"
import { RAG_CONFIG } from "~utils/constants"
import { estimateTokens, CHARS_PER_TOKEN } from "~utils/tokenEstimation"

export interface RAGResult {
  context: string
  chunks: import("~types/transcript").TranscriptChunk[]
}

/**
 * Retrieves relevant transcript chunks based on semantic similarity to user query
 * @param userQuery - The user's question/message
 * @param videoId - YouTube video ID
 * @param embedder - Hugging Face embedding model pipeline
 * @param tokenBudget - Maximum tokens available for chunks
 * @returns Object with formatted context string and chunk array, or null if none available
 */
export async function retrieveRelevantContext(
  userQuery: string,
  videoId: string,
  embedder: FeatureExtractionPipeline,
  tokenBudget: number
): Promise<RAGResult | null> {
  console.log("🔍 RAG Retrieval Starting...")
  console.log(`  Query: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}"`)
  console.log(`  Video ID: ${videoId}`)
  console.log(`  Token Budget: ${tokenBudget}`)

  if (tokenBudget <= 0) {
    console.warn("❌ Token budget is 0 or negative, skipping RAG")
    return null
  }

  // Calculate how many chunks fit in the budget
  const tokensPerChunk = Math.ceil(RAG_CONFIG.chunkSize / CHARS_PER_TOKEN)
  const numChunks = Math.max(1, Math.floor(tokenBudget / tokensPerChunk))

  console.log(`  Tokens per chunk (estimated): ${tokensPerChunk}`)
  console.log(`  Number of chunks to retrieve: ${numChunks}`)

  try {
    // Embed the user query
    console.log("  📊 Embedding user query...")
    const embeddingStart = performance.now()
    const emb = await embedder(userQuery, { pooling: "mean", normalize: true })
    const queryEmbedding = Array.from(emb.data)
    const embeddingTime = performance.now() - embeddingStart
    console.log(`  ✅ Query embedded in ${embeddingTime.toFixed(2)}ms (${queryEmbedding.length} dimensions)`)

    // Query similarity search
    console.log("  🔎 Querying HNSW index for similar chunks...")
    const searchStart = performance.now()
    const { chunkIds, distances } = await querySimilarChunks(queryEmbedding, numChunks, videoId)
    const searchTime = performance.now() - searchStart
    console.log(`  ✅ Found ${chunkIds.length} chunks in ${searchTime.toFixed(2)}ms`)

    if (chunkIds.length === 0) {
      console.warn("❌ No chunks found in HNSW index")
      return null
    }

    // Log similarity scores
    console.log("  📊 Top chunk similarities:")
    chunkIds.slice(0, 5).forEach((id, idx) => {
      console.log(`    ${idx + 1}. ${id} (distance: ${distances[idx].toFixed(4)})`)
    })

    // Retrieve full chunk text
    console.log("  📥 Fetching full chunk text from IndexedDB...")
    const fetchStart = performance.now()
    const chunks = await getChunks(chunkIds)
    const fetchTime = performance.now() - fetchStart
    console.log(`  ✅ Retrieved ${chunks.length} chunks in ${fetchTime.toFixed(2)}ms`)

    // Log retrieved chunks
    console.log("  📄 Retrieved Chunks:")
    chunks.forEach((chunk, idx) => {
      const preview = chunk.text.substring(0, 100).replace(/\n/g, ' ')
      console.log(`    ${idx + 1}. [Chunk ${chunk.chunkIndex}] ${preview}${chunk.text.length > 100 ? '...' : ''}`)
      console.log(`       Length: ${chunk.text.length} chars (~${estimateTokens(chunk.text)} tokens)`)
    })

    // Format chunks for context
    const header = "Relevant transcript sections:\n\n"
    const formatted = chunks.map(
      c => `[Chunk ${c.chunkIndex}]\n${c.text}`
    ).join("\n\n")

    const result = header + formatted
    const actualTokens = estimateTokens(result)

    console.log(`✅ RAG Retrieval Complete`)
    console.log(`  Total context length: ${result.length} chars`)
    console.log(`  Estimated tokens: ${actualTokens} (budget was ${tokenBudget})`)
    console.log(`  Token usage: ${((actualTokens / tokenBudget) * 100).toFixed(1)}%`)

    return {
      context: result,
      chunks: chunks
    }

  } catch (error) {
    console.error("❌ RAG retrieval failed:", error)
    throw error
  }
}
