import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { getEmbedder } from "~background"
import { chunkTranscript } from "~utils/textChunking"
import { extractVideoId } from "~utils/youtubeTranscript"
import { saveEmbeddings } from "~utils/mememoStore"
import { saveChunks } from "~utils/chunkStore"
import type { TranscriptChunk, EmbeddingProgress } from "~types/transcript"

export type RequestBody = {
  transcript: string
  url: string
  videoTitle: string
}

export type ResponseBody = {
  success: boolean
  chunkCount: number
  totalTimeMs: number
  avgTimePerChunk: number
}

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (req, res) => {
  const startTime = performance.now()

  try {
    const { transcript, url, videoTitle } = req.body

    console.log("🔄 Starting chunking and embedding process...")
    console.log(`📝 Transcript length: ${transcript.length} characters`)

    // Extract video ID
    const videoId = extractVideoId(url)
    console.log(`🎬 Video ID: ${videoId}`)

    // Initialize storage for progress tracking
    const storage = new Storage({ area: "session" })
    const progressKey = `embeddingProgress-${videoId}`

    // Step 1: Chunk the transcript
    const chunkingStart = performance.now()
    const chunks = await chunkTranscript(transcript, videoId)
    const chunkingTime = performance.now() - chunkingStart
    console.log(
      `✂️  Chunked into ${chunks.length} chunks in ${chunkingTime.toFixed(2)}ms`
    )

    // Step 2: Get embedder
    const embedder = await getEmbedder()

    // Step 3: Write initial progress
    await storage.set(progressKey, {
      status: "embedding",
      progress: 0,
      currentStep: "Starting embedding...",
      currentChunk: 0,
      totalChunks: chunks.length,
      lastUpdated: Date.now()
    } as EmbeddingProgress)

    // Step 4: Embed each chunk
    const embeddingStart = performance.now()
    const embeddedChunks: TranscriptChunk[] = []
    let lastWrittenProgress = 0 // Track last progress % written to storage

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkStart = performance.now()

      // Generate embedding
      const output = await embedder(chunk.text, {
        pooling: "mean",
        normalize: true
      })

      // Convert to array and attach to chunk
      chunk.embedding = Array.from(output.data)

      const chunkTime = performance.now() - chunkStart
      console.log(
        `  ⚡ Chunk ${i + 1}/${chunks.length}: ${chunkTime.toFixed(2)}ms (${chunk.text.length} chars)`
      )

      embeddedChunks.push(chunk)

      // Update progress only every 10% or on last chunk to reduce storage writes
      const currentProgress = Math.round(((i + 1) / chunks.length) * 100)
      const isLastChunk = i === chunks.length - 1
      const progressIncrement = currentProgress - lastWrittenProgress

      if (progressIncrement >= 10 || isLastChunk) {
        await storage.set(progressKey, {
          status: "embedding",
          progress: currentProgress,
          currentStep: `Embedding chunk ${i + 1}/${chunks.length}`,
          currentChunk: i + 1,
          totalChunks: chunks.length,
          lastUpdated: Date.now()
        } as EmbeddingProgress)
        lastWrittenProgress = currentProgress
      }
    }

    const embeddingTime = performance.now() - embeddingStart
    
    // Step 5: Save embeddings to MeMemo
    console.log("💾 Saving embeddings to MeMemo...")
    await saveEmbeddings(embeddedChunks, videoId)
    console.log("✅ Embeddings saved to MeMemo")
    
    // Step 6: Save chunks to IndexedDB
    console.log("💾 Saving chunks to IndexedDB...")
    await saveChunks(embeddedChunks, videoId)
    console.log("✅ Chunks saved to IndexedDB")
    
    const totalTime = performance.now() - startTime

    // Log summary
    console.log("\n📊 Embedding Summary:")
    console.log(`  Total chunks: ${chunks.length}`)
    console.log(`  Chunking time: ${chunkingTime.toFixed(2)}ms`)
    console.log(`  Embedding time: ${embeddingTime.toFixed(2)}ms`)
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`)
    console.log(
      `  Avg per chunk: ${(embeddingTime / chunks.length).toFixed(2)}ms`
    )
    console.log(`  Embedding dimensions: ${embeddedChunks[0].embedding?.length}`)

    // Mark embedding as complete
    await storage.set(progressKey, {
      status: "ready",
      progress: 100,
      currentStep: "Complete!",
      currentChunk: chunks.length,
      totalChunks: chunks.length,
      lastUpdated: Date.now()
    } as EmbeddingProgress)

    // Schedule cleanup after 5 seconds
    setTimeout(async () => {
      await storage.remove(progressKey)
      console.log("🧹 Cleaned up progress notification")
    }, 5000)

    res.send({
      success: true,
      chunkCount: chunks.length,
      totalTimeMs: totalTime,
      avgTimePerChunk: embeddingTime / chunks.length
    })
  } catch (error) {
    console.error("❌ Embedding failed:", error)

    // Write error status to storage
    const { url } = req.body
    const videoId = extractVideoId(url)
    const storage = new Storage({ area: "session" })
    const progressKey = `embeddingProgress-${videoId}`

    await storage.set(progressKey, {
      status: "error",
      progress: 0,
      currentStep: "Embedding failed",
      error: error instanceof Error ? error.message : "Unknown error",
      lastUpdated: Date.now()
    } as EmbeddingProgress)

    // Clean up error message after 10 seconds
    setTimeout(async () => {
      await storage.remove(progressKey)
    }, 10000)

    res.send({
      success: false,
      chunkCount: 0,
      totalTimeMs: performance.now() - startTime,
      avgTimePerChunk: 0
    })
  }
}

export default handler
