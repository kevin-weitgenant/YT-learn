import { chunkTranscript, shouldUseRAG } from "../src/utils/textChunking"

async function testChunking() {
  // Create a sample transcript (~2500 chars)
  const sampleText = `
    This is a sample YouTube video transcript. It contains multiple sentences
    and paragraphs to simulate a real video transcript. The content discusses
    various topics related to web development, React, and JavaScript.

    We need enough text to create multiple chunks and test the overlap functionality.
    Each chunk should be around 512 characters, with 100 characters of overlap
    between adjacent chunks to maintain context continuity.

    The RecursiveCharacterTextSplitter will try to split on sentence boundaries
    to preserve semantic meaning. This is important for embedding quality because
    embeddings work better when text chunks represent complete thoughts rather than
    being cut mid-sentence.

    Let's add more content to ensure we have enough text for multiple chunks.
    React hooks are a powerful feature that allows function components to use state
    and lifecycle features. The useState hook is the most common one for managing
    component state. The useEffect hook handles side effects like API calls.

    When building Chrome extensions with Plasmo, you can use modern React patterns
    including hooks, context, and more. Plasmo handles the build configuration
    automatically so you can focus on building features instead of wrestling with
    webpack configurations and manifest files.
  `.repeat(20) // Repeat to get ~2500 chars

  console.log("=== Chunking Test ===")
  console.log(`Input length: ${sampleText.length} characters`)
  console.log(`Should use RAG: ${shouldUseRAG(sampleText)}`)

  // Test chunking
  const chunks = await chunkTranscript(sampleText, "test-video-123")

  console.log(`\nCreated ${chunks.length} chunks\n`)

  // Display first chunk
  console.log("First chunk:")
  console.log(`  ID: ${chunks[0].id}`)
  console.log(`  Video ID: ${chunks[0].videoId}`)
  console.log(`  Index: ${chunks[0].chunkIndex}`)
  console.log(`  Length: ${chunks[0].text.length} chars`)
  console.log(`  Text preview: "${chunks[0].text.slice(0, 100)}..."`)

  // Display last chunk
  const lastChunk = chunks[chunks.length - 1]
  console.log("\nLast chunk:")
  console.log(`  ID: ${lastChunk.id}`)
  console.log(`  Video ID: ${lastChunk.videoId}`)
  console.log(`  Index: ${lastChunk.chunkIndex}`)
  console.log(`  Length: ${lastChunk.text.length} chars`)

  // Check overlap between first two chunks
  if (chunks.length > 1) {
    const chunk0End = chunks[0].text.slice(-100)
    const chunk1Start = chunks[1].text.slice(0, 100)

    console.log("\n=== Checking Overlap ===")
    console.log("Chunk 0 ending (last 100 chars):")
    console.log(`  "${chunk0End}"`)
    console.log("\nChunk 1 starting (first 100 chars):")
    console.log(`  "${chunk1Start}"`)

    // Simple overlap check - see if chunk 1 contains any text from chunk 0's end
    const overlapText = chunk0End.slice(-50)
    const hasOverlap = chunk1Start.includes(overlapText.trim())
    console.log(`\nHas overlap: ${hasOverlap ? "✅ Yes" : "❌ No"}`)

    if (hasOverlap) {
      console.log(`Overlap text: "${overlapText.trim()}"`)
    }
  }

  // Verify all chunks have correct structure
  console.log("\n=== Verifying Chunk Structure ===")
  const allValid = chunks.every(
    (chunk) =>
      chunk.id &&
      chunk.videoId === "test-video-123" &&
      typeof chunk.chunkIndex === "number" &&
      chunk.text &&
      chunk.text.length > 0
  )
  console.log(`All chunks valid: ${allValid ? "✅ Yes" : "❌ No"}`)

  // Check chunk sizes
  const chunkSizes = chunks.map((c) => c.text.length)
  const avgSize = chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length
  const minSize = Math.min(...chunkSizes)
  const maxSize = Math.max(...chunkSizes)

  console.log("\n=== Chunk Size Statistics ===")
  console.log(`  Average: ${Math.round(avgSize)} chars`)
  console.log(`  Min: ${minSize} chars`)
  console.log(`  Max: ${maxSize} chars`)
  console.log(`  Target: 512 chars (with some variation expected)`)

  console.log("\n=== Test Complete ===")
}

// Run test
testChunking().catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
