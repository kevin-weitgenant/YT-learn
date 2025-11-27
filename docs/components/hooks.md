# React Hooks Documentation

This document covers all React hooks used in Nano Tutor, organized by category: Chat hooks and Video Context hooks.

## Overview

Hooks are organized into two main categories:

1. **Chat Hooks** (`src/hooks/chat/`) - Manage AI session and message streaming
2. **Video Context Hooks** (`src/hooks/videoContext/`) - Extract and retrieve video data

## Chat Hooks

### Hook Composition Pattern

`useChatOrquestrator.ts` orchestrates multiple specialized hooks, each handling a specific responsibility:

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

**Why This Design?**
- **Single Responsibility**: Each hook handles one specific concern
- **Composability**: Hooks can be tested and reasoned about independently
- **Clear Dependencies**: Data flow is explicit through parameters

### useModelAvailability

**File**: `src/hooks/chat/useModelAvailability.ts`

**Purpose**: Manages the Chrome built-in AI model (Gemini Nano) availability and download process.

#### Availability States

```typescript
type Availability =
  | "available"      // Model ready to use
  | "downloadable"   // Model can be downloaded
  | "downloading"    // Download in progress
  | "unavailable"    // Model not supported
  | null            // Not checked yet
```

#### Check Availability (on mount)

```typescript
useEffect(() => {
  async function checkAvailability() {
    // Check if Prompt API exists
    const apiAvailable = "ai" in self && "languageModel" in self.ai
    if (!apiAvailable) {
      useChatStore.setState({
        availability: "unavailable",
        apiAvailable: false
      })
      return
    }

    // Check model status
    const status = await self.ai.languageModel.availability()
    useChatStore.setState({
      availability: status,
      apiAvailable: true
    })
  }

  checkAvailability()
}, [])
```

#### Model Download Function

```typescript
async function startDownload() {
  useChatStore.setState({ availability: "downloading" })

  try {
    // Create session with progress monitoring
    const session = await self.ai.languageModel.create({
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          // Update progress bar (0-1)
          useChatStore.setState({
            downloadProgress: e.loaded / e.total
          })
        })
      }
    })

    // Model downloaded and extracting
    useChatStore.setState({ isExtracting: true })
    await session.ready

    // Cleanup and mark as available
    session.destroy()
    useChatStore.setState({
      availability: "available",
      isExtracting: false
    })
  } catch (error) {
    useChatStore.setState({ availability: "downloadable" })
  }
}

// Inject download function into store
useChatStore.setState({ startDownload })
```

**Integration**: The `ModelDownload` component uses this state to show download UI.

### useAISession

**File**: `src/hooks/chat/useAISession.ts`

**Purpose**: Creates and manages the Chrome AI LanguageModel session, including system prompt injection and token tracking.

#### Session Creation Process

```typescript
async function createSession(context?: VideoContext) {
  // 1. Create base session
  const session = await self.ai.languageModel.create({
    temperature: 1,
    topK: 3
  })

  // 2. Build system prompt from video context
  const systemPrompt = await createSystemPrompt(context, session)

  // 3. Measure system prompt tokens
  const systemTokens = await session.measureInputUsage(systemPrompt)
  const inputQuota = session.maxTokens

  // 4. Update store with session and token info
  useChatStore.setState({
    session,
    isSessionReady: true,
    tokenInfo: {
      systemTokens,
      conversationTokens: 0,
      totalTokens: systemTokens,
      inputQuota,
      percentageUsed: (systemTokens / inputQuota) * 100
    }
  })

  return session
}
```

#### System Prompt Building

**File**: `src/utils/systemPrompt.ts`

The system prompt includes the video transcript and is carefully managed to fit within token limits:

```typescript
async function createSystemPrompt(
  context: VideoContext | undefined,
  session: LanguageModelSession
): Promise<string> {
  if (!context?.transcript) {
    return "You are a helpful assistant."
  }

  const transcript = context.transcript

  // 1. Estimate tokens (rough: 4 chars = 1 token)
  const estimatedTokens = Math.ceil(transcript.length / 4)

  // 2. Calculate 80% of available quota (leave room for conversation)
  const maxSystemTokens = Math.floor(session.maxTokens * 0.8)

  // 3. Truncate if necessary
  let finalTranscript = transcript
  if (estimatedTokens > maxSystemTokens) {
    const ratio = maxSystemTokens / estimatedTokens
    const maxLength = Math.floor(transcript.length * ratio)
    finalTranscript = transcript.slice(0, maxLength) +
                      "\n\n[Transcript truncated due to length]"
  }

  // 4. Build prompt
  const prompt = `You are an assistant that answers questions about the video: "${context.title}".

Here is the transcript:

${finalTranscript}`

  // 5. Append to session (session maintains context)
  await session.append([{ role: "system", content: prompt }])

  return prompt
}
```

**Token Management Strategy**:
- Use 80% of context window for system prompt (video transcript)
- Reserve 20% for conversation (user + assistant messages)
- Truncate transcript if it exceeds quota
- Visual progress indicator in UI

#### Session Reset

```typescript
async function resetSession() {
  // 1. Destroy old session
  session?.destroy()

  // 2. Clear messages
  useChatStore.setState({
    messages: [],
    isSessionReady: false
  })

  // 3. Create new session
  const newSession = await createSession(videoContext)

  // Session is ready again with fresh context
}

// Inject reset function into store
useChatStore.setState({ handleResetSession: resetSession })
```

**When to Reset**: Reset when conversation tokens approach the limit (visible via circular progress indicator on reset button).

### useStreamingResponse

**File**: `src/hooks/chat/useStreamingResponse.ts`

**Purpose**: Handles sending user messages and streaming AI responses with real-time updates.

#### Core Streaming Flow

```typescript
async function sendMessage(text: string, options?: { displayText?: string }) {
  const session = useChatStore.getState().session
  if (!session) return

  // 1. Add user message to chat
  const userMessage: Message = {
    id: Date.now(),
    text: options?.displayText || text,
    sender: "user"
  }
  addMessage(userMessage)

  // 2. Clear input and set streaming state
  useChatStore.setState({
    inputText: "",
    isStreaming: true
  })

  // 3. Create abort controller (for stop button)
  const abortController = new AbortController()
  abortControllerRef.current = abortController

  // 4. Start streaming
  try {
    const stream = await session.promptStreaming(text, {
      signal: abortController.signal
    })

    // 5. Add empty bot message
    const botMessage: Message = {
      id: Date.now() + 1,
      text: "",
      sender: "bot"
    }
    addMessage(botMessage)

    // 6. Accumulate and update message
    streamingMessageRef.current = ""

    for await (const chunk of stream) {
      // Get incremental chunk
      const newChunk = chunk.slice(streamingMessageRef.current.length)
      streamingMessageRef.current = chunk

      // Throttled update (max 60 FPS)
      updateStreamingMessage()
    }

    // 7. Final update (force)
    updateStreamingMessage(true)

    // 8. Update token tracking
    const conversationTokens = session.inputUsage
    const systemTokens = useChatStore.getState().tokenInfo.systemTokens
    const totalTokens = systemTokens + conversationTokens

    useChatStore.setState({
      tokenInfo: {
        systemTokens,
        conversationTokens,
        totalTokens,
        inputQuota: session.maxTokens,
        percentageUsed: (totalTokens / session.maxTokens) * 100
      }
    })

  } catch (error) {
    if (error.name === "AbortError") {
      // User clicked stop button
      updateStreamingMessage(true) // Finalize partial response
    } else {
      // Error occurred
      addMessage({
        id: Date.now() + 1,
        text: "Sorry, an error occurred.",
        sender: "bot"
      })
    }
  } finally {
    useChatStore.setState({ isStreaming: false })
    abortControllerRef.current = null
  }
}
```

#### Throttled Updates (60 FPS Optimization)

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

**Why Throttle?**
- AI can stream very fast (hundreds of tokens per second)
- Updating DOM on every chunk causes performance issues
- 60 FPS (16ms) is smooth enough for human perception
- Force-update at the end ensures final accuracy

#### Stop Streaming

```typescript
function stopStreaming() {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort()
  }
}

// Inject actions into store
useChatStore.setState({
  sendMessage,
  stopStreaming
})
```

### Async Action Injection Pattern

A key pattern used throughout chat hooks is **async action injection**:

1. **Hook creates async functions** with access to refs and closures
2. **Functions injected into Zustand store** as actions
3. **Components call actions from store**, getting strongly-typed signatures

```typescript
// Inside hook
useChatStore.setState({
  sendMessage: async (text) => {
    // Function has access to hook's refs and state
    const stream = await session.promptStreaming(text)
    // ...
  }
})

// In component
const sendMessage = useChatStore(state => state.sendMessage)
await sendMessage("Hello")
```

**Benefits**:
- Actions can use React refs (abort controllers, throttling timers)
- Actions automatically have access to latest store state
- Type-safe action signatures through TypeScript
- Separates business logic (hooks) from UI (components)

## Video Context Hooks

### Storage Architecture

The video context system uses Chrome's storage APIs with a **two-tier strategy**:

```
Session Storage (chrome.storage.session) - Temporary
┌─────────────────────────────────────────┐
│ Key: tabId (string)                     │
│ Value: videoId (string)                 │
│                                         │
│ Example: "12345" → "dQw4w9WgXcQ"       │
│                                         │
│ Lifetime: Cleared on tab close         │
│ Purpose: Maps tabs to videos           │
└─────────────────────────────────────────┘

Local Storage (chrome.storage.local) - Persistent
┌─────────────────────────────────────────┐
│ Key: "videoContext_{videoId}"           │
│ Value: VideoContext object              │
│                                         │
│ Example:                                │
│ "videoContext_dQw4w9WgXcQ" → {         │
│   videoId: "dQw4w9WgXcQ",              │
│   transcript: "...",                    │
│   title: "Never Gonna Give You Up",    │
│   chapters: [...],                      │
│   ...                                   │
│ }                                       │
│                                         │
│ Size: ~50-500KB per video              │
│ Lifetime: Persistent until cleanup     │
│ Purpose: Cache video data              │
└─────────────────────────────────────────┘
```

**Why Two Layers?**
- **Session Storage**: Enables multi-tab support - each tab can have its own video
- **Local Storage**: Enables video caching - revisiting videos loads instantly

### VideoContext Interface

**File**: `src/types/transcript.ts`

```typescript
interface VideoContext {
  videoId: string           // YouTube video ID (e.g., "dQw4w9WgXcQ")
  transcript?: string       // Full transcript text (50-500KB)
  title: string            // Video title
  url: string              // Full YouTube URL
  channel: string          // Channel name
  timestamp: number        // Extraction timestamp (Date.now())
  error?: string           // Error message if transcript unavailable
  chapters?: Chapter[]     // Array of video chapters (if available)
}

interface Chapter {
  title: string            // Chapter title
  startSeconds: number     // Timestamp in seconds
}
```

**Size**: Typically 50-500KB per video (mostly transcript text)

### useVideoContext

**File**: `src/hooks/videoContext/useVideoContext.ts`

**Purpose**: Extracts video context from the current YouTube page. Used in content scripts when user clicks "Open Chat" button.

#### Cache-First Strategy

```typescript
async function getVideoContext(): Promise<VideoContext | null> {
  const url = window.location.href
  const videoId = extractVideoId(url)

  if (!videoId) return null

  // 1. Check cache first
  const cachedContext = await storage.get<VideoContext>(
    `videoContext_${videoId}`
  )

  if (cachedContext) {
    console.log("Video context found in cache")
    return cachedContext
  }

  // 2. Cache miss - extract from page
  console.log("Extracting video context...")
  const videoContext = await extractYouTubeContextHybrid()

  if (videoContext) {
    // 3. Clean up old videos before saving
    await cleanupVideoStorage()

    // 4. Store in cache
    await storage.set(`videoContext_${videoContext.videoId}`, videoContext)
  }

  return videoContext
}
```

#### Cache Cleanup Strategy

```typescript
async function cleanupVideoStorage() {
  const allItems = await storage.getAll()

  // Find all video context entries
  const videoContextEntries = Object.entries(allItems)
    .filter(([key]) => key.startsWith("videoContext_"))
    .map(([key, value]) => ({
      key,
      context: value as VideoContext
    }))
    .sort((a, b) => b.context.timestamp - a.context.timestamp) // Sort by newest first

  // Keep only most recent 3 videos
  const MAX_CACHED_VIDEOS = 3
  const toRemove = videoContextEntries.slice(MAX_CACHED_VIDEOS)

  for (const entry of toRemove) {
    await storage.remove(entry.key)
  }
}
```

**Storage Management**:
- Chrome's local storage has a 10MB limit
- Each video is ~50-500KB
- Keep most recent 3 videos cached
- Prevents storage quota issues

### useVideoContextForTab

**File**: `src/hooks/videoContext/useVideoContextForTab.ts`

**Purpose**: Retrieves the cached video context for the current browser tab. Used in sidepanel to load the correct video data.

#### Hook Flow

```typescript
export function useVideoContextForTab() {
  const [videoContext, setVideoContext] = useState<VideoContext | null>(null)

  useEffect(() => {
    async function loadVideoContext() {
      // 1. Get the current active tab ID
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      const tabId = tab?.id

      if (!tabId) return

      // 2. Look up videoId for this tab (session storage)
      const videoId = await sessionStorage.get(tabId.toString())

      if (!videoId) return

      // 3. Retrieve full VideoContext using videoId (local storage)
      const context = await storage.get<VideoContext>(
        `videoContext_${videoId}`
      )

      if (!context) return

      // 4. Initialize chapter store with chapters from context
      if (context.chapters) {
        useChapterStore.getState().setChapters(context.chapters)
      }

      setVideoContext(context)
    }

    loadVideoContext()
  }, [])

  return videoContext
}
```

#### Data Flow

```
User opens sidepanel
        ↓
useVideoContextForTab executes
        ↓
chrome.tabs.query() → Get active tabId
        ↓
sessionStorage.get(tabId) → Get videoId
        ↓
storage.get(`videoContext_${videoId}`) → Get full VideoContext
        ↓
chapterStore.setChapters() → Initialize chapters
        ↓
Return VideoContext to sidepanel
```

### Video Context Extraction

The actual extraction is handled by utility functions in `src/utils/yt_extraction/`.

#### Hybrid Extraction Method

```typescript
async function extractYouTubeContextHybrid(): Promise<VideoContext> {
  const videoId = extractVideoId(window.location.href)

  // Extract metadata (always available)
  const title = document.querySelector("h1.ytd-video-primary-info-renderer")?.textContent
  const channel = document.querySelector("ytd-channel-name")?.textContent

  // Extract transcript (InnerTube API + DOM fallback)
  let transcript: string | undefined
  try {
    transcript = await fetchFirstAvailableTranscript(videoId) // Fast method
  } catch {
    transcript = await extractTranscriptFromDOM() // Fallback method
  }

  // Extract chapters (from ytInitialData)
  const chapters = await extractChapters()

  return {
    videoId,
    title,
    channel,
    url: window.location.href,
    transcript,
    chapters,
    timestamp: Date.now(),
    error: transcript ? undefined : "No transcript available"
  }
}
```

See [yt-extraction.md](yt-extraction.md) for detailed extraction documentation.

### Tab → Video Mapping

The mapping between tabs and videos is managed by the background script's message handler:

**File**: `src/background/messages/setVideoForTab.ts`

```typescript
export default async (
  req: PlasmoMessaging.Request<{ videoId: string }>,
  res: PlasmoMessaging.Response
) => {
  const tabId = req.sender.tab?.id
  const videoId = req.body.videoId

  if (!tabId || !videoId) {
    return res.send({ success: false })
  }

  // Map tab → video in session storage
  await sessionStorage.set(tabId.toString(), videoId)

  res.send({ success: true })
}
```

### Complete Flow: Opening Chat

```
1. User on YouTube page clicks "Open Chat" button
        ↓
2. useOpenChat.ts: handleOpenChat()
        ↓
3. useVideoContext.ts: getVideoContext()
   - Check cache: storage.get(`videoContext_${videoId}`)
   - If cache hit → return cached context
   - If cache miss → extract with extractYouTubeContextHybrid()
   - Save to cache: storage.set(`videoContext_${videoId}`, context)
        ↓
4. Send message: openSidePanel → background script
        ↓
5. Send message: setVideoForTab(videoId) → background script
   - sessionStorage.set(tabId, videoId)
        ↓
6. Sidepanel opens
        ↓
7. useVideoContextForTab.ts executes
   - Get tabId from chrome.tabs.query()
   - Get videoId from sessionStorage.get(tabId)
   - Get context from storage.get(`videoContext_${videoId}`)
   - Initialize chapter store
        ↓
8. VideoContext loaded in sidepanel
```

## Common Patterns

### Pattern 1: Adding New Video Metadata

1. Update `VideoContext` interface in `src/types/transcript.ts`
2. Extract new field in `extractYouTubeContextHybrid()`
3. Store and retrieve as normal (no cache invalidation needed - uses timestamp)

### Pattern 2: Debugging Cache Issues

```typescript
// Check what's in cache
const allItems = await storage.getAll()
console.log("Cached videos:",
  Object.keys(allItems).filter(k => k.startsWith("videoContext_"))
)

// Check tab mapping
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
const videoId = await sessionStorage.get(tab.id.toString())
console.log("Tab", tab.id, "mapped to video", videoId)

// Clear cache for testing
await storage.remove(`videoContext_${videoId}`)
```

### Pattern 3: Handling Extraction Failures

- If transcript extraction fails, `error` field is set in VideoContext
- UI shows error message but still displays video metadata
- User can still interact with chat (but AI won't have transcript context)

### Pattern 4: Debugging Token Issues

- Check `tokenInfo` in chatStore for current usage
- System tokens should be ~80% of quota max
- Conversation tokens grow with each message
- Use reset when approaching 100% usage

### Pattern 5: Handling Streaming Errors

- All streaming errors caught in `sendMessage` try/catch
- AbortError = user stopped streaming (expected)
- Other errors = show error message to user
- Always set `isStreaming: false` in finally block

## Related Documentation

- **[State Management](stores.md)** - Zustand stores used by these hooks
- **[UI Components](ui-components.md)** - Components that consume chat state
- **[Background Script](background.md)** - Message handlers and tab lifecycle
- **[YouTube Extraction](yt-extraction.md)** - Detailed extraction documentation
- **[Design Patterns](../architecture/design-patterns.md)** - Patterns used throughout
