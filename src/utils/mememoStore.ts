import { HNSW } from "mememo"
import type { TranscriptChunk } from "~types/transcript"

// Singleton HNSW index instance
let hnswIndex: HNSW | null = null

/**
 * Get or create the HNSW vector index
 */
const getHNSWIndex = (): HNSW => {
  if (!hnswIndex) {
    hnswIndex = new HNSW({
      distanceFunction: 'cosine',
      useIndexedDB: true,  // Persist embeddings in IndexedDB
      m: 16,               // Good default for 384-dim embeddings
      efConstruction: 100  // Balance between speed and accuracy
    })
  }
  return hnswIndex
}

/**
 * Check if embeddings exist for a video by querying for any chunk
 * We store chunk keys as: {videoId}-chunk-{index}
 */
export async function checkEmbeddingsExist(
  videoId: string
): Promise<boolean> {
  const index = getHNSWIndex()
  
  // Check if any chunk exists for this video
  // We'll query all keys and check if any match our videoId pattern
  try {
    const allKeys = await index.nodes.keys()
    const prefix = `${videoId}-chunk-`
    return allKeys.some(key => key.startsWith(prefix))
  } catch {
    return false
  }
}

/**
 * Save transcript chunks with embeddings to the HNSW index
 */
export async function saveEmbeddings(
  chunks: TranscriptChunk[],
  videoId: string
): Promise<void> {
  const index = getHNSWIndex()
  
  // Filter chunks that have embeddings
  const chunksWithEmbeddings = chunks.filter(chunk => chunk.embedding)
  
  if (chunksWithEmbeddings.length === 0) {
    return
  }
  
  // Prepare keys and values for bulk insert
  const keys = chunksWithEmbeddings.map(chunk => chunk.id)
  const values = chunksWithEmbeddings.map(chunk => chunk.embedding!)
  
  // Bulk insert into HNSW index
  await index.bulkInsert(keys, values)
}

/**
 * Query similar chunks using an embedding vector
 * Returns chunk IDs ranked by similarity
 */
export async function querySimilarChunks(
  queryEmbedding: number[],
  topK: number = 5,
  videoId?: string
): Promise<{ chunkIds: string[]; distances: number[] }> {
  const index = getHNSWIndex()
  
  // Query the index for k-nearest neighbors
  const { keys, distances } = await index.query(queryEmbedding, topK * 2)
  
  // Filter by videoId if provided
  let filteredKeys = keys
  let filteredDistances = distances
  
  if (videoId) {
    const prefix = `${videoId}-chunk-`
    const filtered = keys.reduce((acc, key, idx) => {
      if (key.startsWith(prefix)) {
        acc.keys.push(key)
        acc.distances.push(distances[idx])
      }
      return acc
    }, { keys: [] as string[], distances: [] as number[] })
    
    filteredKeys = filtered.keys.slice(0, topK)
    filteredDistances = filtered.distances.slice(0, topK)
  } else {
    filteredKeys = keys.slice(0, topK)
    filteredDistances = distances.slice(0, topK)
  }
  
  return {
    chunkIds: filteredKeys,
    distances: filteredDistances
  }
}

/**
 * Clear all embeddings for a specific video
 */
export async function clearVideoEmbeddings(videoId: string): Promise<void> {
  const index = getHNSWIndex()
  const allKeys = await index.nodes.keys()
  const prefix = `${videoId}-chunk-`
  
  // Mark all matching chunks as deleted
  for (const key of allKeys) {
    if (key.startsWith(prefix)) {
      await index.markDeleted(key)
    }
  }
}
