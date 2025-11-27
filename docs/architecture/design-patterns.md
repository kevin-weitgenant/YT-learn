# Design Patterns

This document explains the key design patterns used throughout the Nano Tutor codebase.

## 1. Hook Composition

### Pattern Description

`useChatOrquestrator` orchestrates multiple specialized hooks, each with a single responsibility.

### Implementation

```typescript
function useChatOrquestrator(videoContext: VideoContext | null) {
  const transcript = videoContext?.transcript

  // 1. Check model availability (download if needed)
  const availability = useModelAvailability()

  // 2. Create AI session with video context
  useAISession({
    videoContext,
    shouldInitialize: availability === "available" && !!transcript
  })

  // 3. Set up message streaming handlers
  useStreamingResponse()

  // 4. Update derived state
  useEffect(() => {
    const hasUserMessages = messages.some(m => m.sender === "user")
    const hasTranscriptError = !transcript && !!videoContext
    useChatStore.setState({ hasUserMessages, hasTranscriptError })
  }, [messages, transcript, videoContext])
}
```

### Sub-Hooks

1. **useModelAvailability** - Model check and download
2. **useAISession** - Session creation and management
3. **useStreamingResponse** - Message streaming

### Benefits

- **Clear separation of concerns** - Each hook handles one specific task
- **Easier testing** - Hooks can be tested independently
- **Better code organization** - Related logic grouped together
- **Composability** - Hooks can be reused in different contexts

### When to Use

Use hook composition when:
- A feature involves multiple distinct responsibilities
- Logic can be cleanly separated into independent units
- You want to enable testing of individual concerns
- Multiple components might need subsets of the functionality

## 2. Async Action Injection

### Pattern Description

Hooks create async functions with closures and refs, then inject them into Zustand store as actions. Components call these actions from the store.

### Implementation

```typescript
// Inside useStreamingResponse hook
function useStreamingResponse() {
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingMessageRef = useRef("")

  const sendMessage = async (text: string) => {
    // Function has access to hook's refs and closures
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const session = useChatStore.getState().session
    const stream = await session.promptStreaming(text, {
      signal: abortController.signal
    })

    streamingMessageRef.current = ""
    for await (const chunk of stream) {
      streamingMessageRef.current = chunk
      updateStreamingMessage()
    }
  }

  // Inject into store
  useChatStore.setState({ sendMessage })
}
```

```typescript
// In component
function ChatInput() {
  const sendMessage = useChatStore(state => state.sendMessage)

  const handleSubmit = async () => {
    await sendMessage("Hello")
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### Why This Pattern?

**Problem**: Traditional Zustand actions (defined in `create()`) can't access React refs.

**Solution**: Create actions in hooks (which have refs), then inject into store.

### Benefits

- Actions can use React refs (abort controllers, throttling timers)
- Actions automatically see latest state via `getState()`
- Type-safe action signatures through TypeScript
- Separates business logic (hooks) from UI (components)
- Centralized state management with distributed logic creation

### When to Use

Use async action injection when:
- Actions need access to React refs (timers, abort controllers)
- Actions require closures over hook-specific state
- You want to keep complex logic out of components
- Actions need to be shared across multiple components

### Common Use Cases

1. **Streaming with Abort**: Use ref to store AbortController
2. **Throttled Updates**: Use ref to store last update time
3. **Cleanup Functions**: Use ref to store cleanup callbacks
4. **Complex State Transitions**: Use hook state + store state together

## 3. Throttled Streaming (60 FPS)

### Pattern Description

Streaming updates throttled to 16ms (60 FPS) to prevent DOM performance issues. AI can stream hundreds of tokens/second; throttling maintains smooth UX.

### Implementation

```typescript
const lastUpdateTimeRef = useRef(0)
const updateTimeoutRef = useRef<NodeJS.Timeout>()

function updateStreamingMessage(force = false) {
  const now = Date.now()
  const timeSinceLastUpdate = now - lastUpdateTimeRef.current

  // Throttle to 60 FPS (16ms between updates)
  if (!force && timeSinceLastUpdate < 16) {
    // Schedule deferred update
    clearTimeout(updateTimeoutRef.current)
    updateTimeoutRef.current = setTimeout(() => {
      updateStreamingMessage(true)
    }, 16 - timeSinceLastUpdate)
    return
  }

  // Update last message with accumulated text
  const text = streamingMessageRef.current
  updateLastMessage(text)

  lastUpdateTimeRef.current = now
}
```

### Why 16ms?

- **60 FPS** = 1000ms / 60 = 16.67ms per frame
- Human eye perceives ~60 FPS as smooth
- Higher FPS wastes CPU/DOM updates
- Lower FPS feels choppy

### Benefits

- Prevents performance issues from rapid DOM updates
- Maintains smooth user experience
- Reduces unnecessary React re-renders
- Still captures all text (accumulated in ref)

### When to Use

Use throttled updates when:
- Data arrives faster than ~60 FPS
- DOM updates are expensive
- Exact timing isn't critical (final update captures all)
- User perceives continuous flow (not discrete events)

## 4. Cache-First Extraction

### Pattern Description

Always check `storage.get<VideoContext>(\`videoContext_${videoId}\`)` before extracting. Only extract on cache miss. Prevents redundant API calls and DOM scraping.

### Implementation

```typescript
async function getVideoContext(): Promise<VideoContext | null> {
  const videoId = extractVideoId(window.location.href)

  if (!videoId) return null

  // 1. Check cache first
  const cached = await storage.get<VideoContext>(`videoContext_${videoId}`)

  if (cached) {
    console.log("✅ Cache hit - instant return")
    return cached
  }

  // 2. Cache miss - extract
  console.log("❌ Cache miss - extracting...")
  const extracted = await extractYouTubeContextHybrid()

  // 3. Clean up before saving
  await cleanupVideoStorage()

  // 4. Store in cache
  await storage.set(`videoContext_${extracted.videoId}`, extracted)

  return extracted
}
```

### Benefits

- **Instant retrieval** - Cache hit returns in ~0ms vs. 1-10 seconds
- **Reduced API calls** - Less load on YouTube's servers
- **Better user experience** - No waiting on revisit
- **Bandwidth savings** - No re-downloading transcript data

### When to Use

Use cache-first when:
- Data extraction is expensive (time, API calls, bandwidth)
- Data doesn't change frequently (video transcripts are immutable)
- Storage space is available
- User likely to revisit same data

### Cache Invalidation

For Nano Tutor, cache is **never invalidated** because:
- Video transcripts don't change after publish
- Video metadata rarely changes
- Storage cleanup removes old videos automatically

If you need cache invalidation:
```typescript
// Invalidate specific video
await storage.remove(`videoContext_${videoId}`)

// Invalidate all
const keys = Object.keys(await storage.getAll())
  .filter(k => k.startsWith("videoContext_"))
for (const key of keys) {
  await storage.remove(key)
}
```

## 5. Session Reset

### Pattern Description

When resetting chat (clearing messages), destroy old session and create new one. This clears conversation history while maintaining video context.

### Implementation

```typescript
async function resetSession() {
  const { session, videoContext } = useChatStore.getState()

  // 1. Destroy old session
  session?.destroy()

  // 2. Clear messages and mark session as not ready
  useChatStore.setState({
    messages: [],
    isSessionReady: false
  })

  // 3. Create new session with same video context
  const newSession = await createSession(videoContext)

  // Session is ready again with fresh context
  // Token counter resets to system tokens only
}
```

### Why Reset?

- **Token limit approaching** - Conversation fills context window
- **User wants fresh start** - Clear old messages
- **Context corruption** - Session in bad state

### Benefits

- Clears conversation history
- Maintains video context (transcript still available)
- Resets token counter
- Fixes any session corruption

### When to Use

Provide session reset when:
- Token usage approaches quota (show visual indicator)
- User explicitly requests clear (reset button)
- Session errors occur
- Context window management is critical

## 6. Zustand Subscription Patterns

### Pattern 1: Selective Subscription

**Optimized for performance** - Component only re-renders when selected state changes.

```typescript
function MessageList() {
  // Only re-renders when messages array changes
  const messages = useChatStore(state => state.messages)

  return <div>{messages.map(m => <Message key={m.id} {...m} />)}</div>
}
```

### Pattern 2: Multiple Selectors

**When you need multiple values** - Component re-renders when any selected value changes.

```typescript
function ChatInput() {
  const {
    inputText,
    isStreaming,
    isSessionReady,
    sendMessage
  } = useChatStore(state => ({
    inputText: state.inputText,
    isStreaming: state.isStreaming,
    isSessionReady: state.isSessionReady,
    sendMessage: state.sendMessage
  }))

  // Component re-renders when any of these change
}
```

### Pattern 3: Derived State

**Compute values in selector** - No extra re-renders.

```typescript
const hasMessages = useChatStore(state => state.messages.length > 0)
const isContextReady = useChatStore(state =>
  state.isSessionReady && !!state.videoContext
)
```

### Pattern 4: Direct Store Updates (Outside React)

**For hooks or non-React code**.

```typescript
// Hooks can update store directly
useChatStore.setState({
  availability: "downloading",
  downloadProgress: 0.5
})

// Access state without subscription
const currentMessages = useChatStore.getState().messages
```

### Anti-Pattern: Whole Store Subscription

```typescript
// ❌ Bad: Component re-renders on ANY state change
const store = useChatStore()

// ✅ Good: Only re-renders when messages change
const messages = useChatStore(state => state.messages)
```

## 7. Hybrid Extraction with Fallback

### Pattern Description

Try fast method first (InnerTube API), fall back to slow method (DOM scraping) on failure. Combines speed with reliability.

### Implementation

```typescript
async function extractYouTubeContextHybrid(): Promise<VideoContext> {
  const videoId = extractVideoId(window.location.href)

  // Extract transcript (fast API + fallback to DOM)
  let transcript: string | undefined
  let transcriptError: string | undefined

  try {
    // Try InnerTube API first (fast, ~95% success)
    transcript = await fetchFirstAvailableTranscript(videoId)
  } catch (error) {
    console.log("InnerTube API failed, trying DOM fallback...")
    try {
      // Fallback to DOM scraping (slow, ~90% success)
      transcript = await extractTranscriptFromDOM()
    } catch (fallbackError) {
      transcriptError = "No transcript available for this video"
    }
  }

  // Extract chapters (always works, instant)
  const chapters = await extractChapters()

  return { videoId, transcript, chapters, error: transcriptError, ... }
}
```

### Success Rates

| Method | Speed | Success Rate |
|--------|-------|--------------|
| InnerTube API | 100-300ms | ~95% |
| DOM Scraping | 5-10s | ~90% |
| **Combined** | **100ms-10s** | **~99%+** |

### Benefits

- **Speed when possible** - Most requests complete in ~100-300ms
- **Reliability when needed** - Fallback covers edge cases
- **Graceful degradation** - Returns partial data (chapters only) if transcript fails
- **Better UX** - Fast in common case, works in rare case

### When to Use

Use hybrid extraction when:
- Primary method is fast but not 100% reliable
- Fallback method is slower but more reliable
- Partial success is acceptable (chapters without transcript)
- User shouldn't see errors in common cases

## Related Documentation

- **[Architecture Overview](overview.md)** - System architecture
- **[Storage](storage.md)** - Storage patterns
- **[React Hooks](../components/hooks.md)** - Hook implementations
- **[Zustand Stores](../components/stores.md)** - Store implementations
- **[YouTube Extraction](../components/yt-extraction.md)** - Extraction patterns
