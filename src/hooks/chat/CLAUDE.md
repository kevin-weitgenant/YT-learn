# Chat Hooks Documentation

This directory contains React hooks that manage the chat functionality with Chrome's built-in AI (Gemini Nano).

## Overview

The chat system uses a composition pattern where `useChatOrquestrator.ts` orchestrates multiple specialized hooks, each handling a specific responsibility:

1. **useModelAvailability** - Checks and downloads the AI model
2. **useAISession** - Creates and manages the AI session
3. **useStreamingResponse** - Handles message streaming

## Hook Composition Pattern

```typescript
// useChatOrquestrator.ts
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

## useModelAvailability

**File**: `useModelAvailability.ts`

**Purpose**: Manages the Chrome built-in AI model (Gemini Nano) availability and download process.

### Availability States

```typescript
type Availability =
  | "available"      // Model ready to use
  | "downloadable"   // Model can be downloaded
  | "downloading"    // Download in progress
  | "unavailable"    // Model not supported
  | null            // Not checked yet
```

### Key Functions

#### 1. Check Availability (on mount)

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

#### 2. Model Download Function

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

**Integration**: The `ModelDownload` component (src/components/chat/model_init/) uses this state to show download UI.

## useAISession

**File**: `useAISession.ts`

**Purpose**: Creates and manages the Chrome AI LanguageModel session, including system prompt injection and token tracking.

### Session Creation Process

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

### System Prompt Building

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
- Visual progress indicator in UI (src/components/chat/ChatInput.tsx)

### Session Reset

When the user clicks the reset button, the session is destroyed and recreated:

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

## useStreamingResponse

**File**: `useStreamingResponse.ts`

**Purpose**: Handles sending user messages and streaming AI responses with real-time updates.

### Core Streaming Flow

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

### Throttled Updates (60 FPS Optimization)

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

### Stop Streaming

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

## Async Action Injection Pattern

A key pattern used throughout these hooks is **async action injection**:

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

## Related Files

- **State Management**: [src/stores/chatStore.ts](../stores/CLAUDE.md) - Zustand store used by these hooks
- **UI Components**: [src/components/chat/](../components/chat/CLAUDE.md) - Components that consume chat state
- **System Prompt**: `src/utils/systemPrompt.ts` - Prompt building utility
- **Video Context**: [src/hooks/videoContext/](../videoContext/CLAUDE.md) - Extraction of video data

## Common Patterns When Working Here

### Adding New Chat Functionality

1. Determine which hook should own the logic
2. Create async function with refs if needed
3. Inject function into chatStore via `setState()`
4. Add function signature to ChatStore interface
5. Components can now call the function from the store

### Debugging Token Issues

- Check `tokenInfo` in chatStore for current usage
- System tokens should be ~80% of quota max
- Conversation tokens grow with each message
- Use reset when approaching 100% usage

### Handling Streaming Errors

- All streaming errors caught in `sendMessage` try/catch
- AbortError = user stopped streaming (expected)
- Other errors = show error message to user
- Always set `isStreaming: false` in finally block
