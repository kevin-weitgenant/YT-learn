# Contributing Guide

This guide explains how to add features and follow existing patterns in the Nano Tutor codebase.

## Code Organization Principles

### 1. Separation of Concerns

- **Hooks** (`src/hooks/`) - Business logic, data fetching, side effects
- **Stores** (`src/stores/`) - Global state management
- **Components** (`src/components/`) - UI rendering, user interactions
- **Utils** (`src/utils/`) - Pure functions, helpers, algorithms

### 2. Hook Composition

Break complex functionality into specialized hooks:

```typescript
// ✅ Good - Single responsibility
useModelAvailability()  // Only checks model
useAISession()          // Only manages session
useStreamingResponse()  // Only handles streaming

// ❌ Bad - Too many responsibilities
useEverything()  // Model + session + streaming + UI state
```

### 3. Async Action Injection

Keep async logic in hooks, inject into stores:

```typescript
// ✅ Good - Hook creates action with refs
function useStreamingResponse() {
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = async (text: string) => {
    // Use refs, access store state
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    // ...
  }

  useChatStore.setState({ sendMessage })
}

// ❌ Bad - Action can't use refs
const store = create((set) => ({
  sendMessage: async (text) => {
    // No access to React refs!
  }
}))
```

### 4. Cache-First Data Fetching

Always check cache before expensive operations:

```typescript
// ✅ Good
const cached = await storage.get(key)
if (cached) return cached

const extracted = await expensiveOperation()
await storage.set(key, extracted)

// ❌ Bad
return await expensiveOperation()  // Always slow
```

## Adding New Features

### Adding a New Message Handler

**Location**: `src/background/messages/`

**Steps**:

1. Create new file: `messages/myHandler.ts`

```typescript
import type { PlasmoMessaging } from "@plasmohq/messaging"

export default async (
  req: PlasmoMessaging.Request<{ data: string }>,
  res: PlasmoMessaging.Response
) => {
  const tabId = req.sender.tab?.id
  const data = req.body.data

  if (!tabId || !data) {
    return res.send({ success: false })
  }

  try {
    // Handle message
    const result = await processData(data)

    res.send({ success: true, result })
  } catch (error) {
    res.send({ success: false, error: error.message })
  }
}
```

2. Plasmo automatically registers the handler

3. Call from content script or sidepanel:

```typescript
import { sendToBackground } from "@plasmohq/messaging"

const response = await sendToBackground({
  name: "myHandler",
  body: { data: "example" }
})

if (response.success) {
  console.log("Result:", response.result)
}
```

### Adding a New Component

**Location**: `src/components/chat/`

**Steps**:

1. Create component file:

```typescript
import { useChatStore } from "~/stores/chatStore"

export function MyComponent() {
  // Subscribe to specific state
  const messages = useChatStore(state => state.messages)

  // Call actions from store
  const sendMessage = useChatStore(state => state.sendMessage)

  return (
    <div>
      {/* UI */}
    </div>
  )
}
```

2. Use selective subscriptions:

```typescript
// ✅ Good - Only re-renders when messages change
const messages = useChatStore(state => state.messages)

// ❌ Bad - Re-renders on any state change
const store = useChatStore()
```

3. Export from index if needed

### Adding State to Stores

**Location**: `src/stores/`

**Steps**:

1. Add to interface:

```typescript
interface ChatStore {
  // Existing state...

  // New state
  newField: string
  setNewField: (value: string) => void
}
```

2. Add to create():

```typescript
export const useChatStore = create<ChatStore>((set, get) => ({
  // Existing state...

  // New state with initial value
  newField: "default",

  // Action to update it
  setNewField: (value) => set({ newField: value })
}))
```

3. Use in components:

```typescript
const newField = useChatStore(state => state.newField)
const setNewField = useChatStore(state => state.setNewField)
```

### Adding a New Hook

**Location**: `src/hooks/`

**Steps**:

1. Create hook file:

```typescript
export function useMyFeature() {
  // Local state
  const [localState, setLocalState] = useState()

  // Refs (for non-reactive values)
  const myRef = useRef()

  // Effects
  useEffect(() => {
    // Side effects
    return () => {
      // Cleanup
    }
  }, [dependencies])

  // Inject actions into store if needed
  useChatStore.setState({
    myAction: async () => {
      // Has access to refs and closures
    }
  })

  return localState
}
```

2. Use hook composition for complex features:

```typescript
export function useComplexFeature() {
  // Compose multiple specialized hooks
  useFeatureA()
  useFeatureB()
  useFeatureC()
}
```

### Adding Video Metadata

**Steps**:

1. Update `VideoContext` interface (`src/types/transcript.ts`):

```typescript
interface VideoContext {
  // Existing fields...

  // New field
  duration?: number  // Video duration in seconds
}
```

2. Extract in `extractYouTubeContextHybrid`:

```typescript
function extractYouTubeContextHybrid() {
  // Existing extraction...

  // New extraction
  const durationElement = document.querySelector(".ytp-time-duration")
  const durationText = durationElement?.textContent // "10:23"
  const duration = parseDuration(durationText) // 623 seconds

  return {
    // Existing fields...
    duration
  }
}
```

3. Use in components:

```typescript
const videoContext = useVideoContextForTab()
console.log("Duration:", videoContext?.duration, "seconds")
```

No cache invalidation needed - uses timestamp for freshness.

## Following Existing Patterns

### Pattern: Throttled Updates

**When to use**: Data arrives faster than ~60 FPS

```typescript
const lastUpdateTimeRef = useRef(0)

function throttledUpdate(data: any, force = false) {
  const now = Date.now()
  const timeSinceLastUpdate = now - lastUpdateTimeRef.current

  if (!force && timeSinceLastUpdate < 16) {
    // Skip this update, schedule later
    setTimeout(() => throttledUpdate(data, true), 16 - timeSinceLastUpdate)
    return
  }

  // Perform update
  updateUI(data)
  lastUpdateTimeRef.current = now
}
```

### Pattern: Selective Zustand Subscriptions

**When to use**: Optimizing component re-renders

```typescript
// ✅ Good - Selective
const messages = useChatStore(state => state.messages)

// ✅ Good - Multiple selective
const { inputText, isStreaming } = useChatStore(state => ({
  inputText: state.inputText,
  isStreaming: state.isStreaming
}))

// ✅ Good - Derived
const hasMessages = useChatStore(state => state.messages.length > 0)

// ❌ Bad - Whole store
const store = useChatStore()
```

### Pattern: Cache Cleanup

**When to use**: Before saving to storage

```typescript
async function saveToStorage(key: string, value: any) {
  // 1. Clean up old entries first
  await cleanupOldEntries()

  // 2. Save new entry
  await storage.set(key, value)
}

async function cleanupOldEntries() {
  const allItems = await storage.getAll()
  const entries = Object.entries(allItems)
    .filter(([key]) => key.startsWith("myPrefix_"))
    .sort((a, b) => b[1].timestamp - a[1].timestamp)

  const MAX_ENTRIES = 3
  const toRemove = entries.slice(MAX_ENTRIES)

  for (const [key] of toRemove) {
    await storage.remove(key)
  }
}
```

### Pattern: Session Reset

**When to use**: Clearing conversation while keeping context

```typescript
async function resetSession() {
  const { session, videoContext } = useChatStore.getState()

  // 1. Destroy old session
  session?.destroy()

  // 2. Clear dependent state
  useChatStore.setState({
    messages: [],
    isSessionReady: false
  })

  // 3. Recreate session
  const newSession = await createSession(videoContext)
}
```

### Pattern: Hybrid with Fallback

**When to use**: Primary method is fast but not 100% reliable

```typescript
async function hybridExtraction() {
  try {
    // Try fast method first
    return await fastMethod()
  } catch (error) {
    console.log("Fast method failed, trying fallback...")
    try {
      // Fall back to reliable but slow method
      return await slowMethod()
    } catch (fallbackError) {
      // Both failed - return partial data or error
      return { error: "Extraction failed" }
    }
  }
}
```

## Code Style Guidelines

### TypeScript

- Use strict mode
- Define interfaces for all data structures
- Avoid `any` - use `unknown` if type is truly unknown
- Use type guards for runtime type checking

```typescript
// ✅ Good
interface VideoContext {
  videoId: string
  transcript?: string
}

function isVideoContext(obj: unknown): obj is VideoContext {
  return typeof obj === "object" && obj !== null && "videoId" in obj
}

// ❌ Bad
function processData(data: any) {
  return data.videoId  // No type safety
}
```

### React Hooks

- Follow Rules of Hooks (only at top level)
- Clean up effects (return cleanup function)
- Use refs for values that don't trigger re-renders
- Memoize expensive calculations with `useMemo`

```typescript
// ✅ Good
useEffect(() => {
  const timer = setTimeout(callback, 1000)
  return () => clearTimeout(timer)  // Cleanup
}, [callback])

// ❌ Bad
useEffect(() => {
  setTimeout(callback, 1000)  // No cleanup
}, [callback])
```

### Zustand Stores

- Keep stores flat (avoid deep nesting)
- Use derived state (selectors) instead of duplicating
- Batch related updates in single `setState`

```typescript
// ✅ Good - Single update
useChatStore.setState({
  messages: [...messages, newMessage],
  inputText: "",
  isStreaming: true
})

// ❌ Bad - Multiple updates (multiple re-renders)
useChatStore.setState({ messages: [...messages, newMessage] })
useChatStore.setState({ inputText: "" })
useChatStore.setState({ isStreaming: true })
```

### Error Handling

- Always catch async errors
- Log errors for debugging
- Show user-friendly messages
- Don't throw in cleanup functions

```typescript
// ✅ Good
try {
  await riskyOperation()
} catch (error) {
  console.error("Operation failed:", error)
  useChatStore.setState({
    error: "Sorry, something went wrong. Please try again."
  })
}

// ❌ Bad
await riskyOperation()  // Uncaught errors crash app
```

## Testing Your Changes

### Manual Testing Checklist

Before submitting changes:

- [ ] Extension loads without errors
- [ ] Feature works on first load (cold start)
- [ ] Feature works after browser restart
- [ ] Feature works with multiple tabs
- [ ] No console errors
- [ ] No memory leaks (check chrome://memory-redirect)
- [ ] Storage cleanup working (check chrome://storage-internals)

### Testing Specific Features

**Storage Changes**:
```typescript
// 1. Save data
await storage.set("test_key", { data: "test" })

// 2. Verify storage
const stored = await storage.get("test_key")
console.log("Stored:", stored)

// 3. Test cleanup
await cleanupFunction()
const remaining = await storage.getAll()
console.log("Remaining keys:", Object.keys(remaining))
```

**Hook Changes**:
```typescript
// 1. Add debug logs
console.log("Hook executing with:", params)

// 2. Test state updates
useEffect(() => {
  console.log("State changed:", state)
}, [state])

// 3. Test cleanup
useEffect(() => {
  return () => {
    console.log("Hook cleaning up")
  }
}, [])
```

**Component Changes**:
```typescript
// 1. Add temporary console logs
console.log("Component rendering with:", props)

// 2. Test different states
const [testState, setTestState] = useState("initial")
// Manually trigger different states

// 3. Test re-render count
const renderCount = useRef(0)
renderCount.current++
console.log("Render count:", renderCount.current)
```

## Common Pitfalls

### Pitfall 1: Forgetting Cleanup

```typescript
// ❌ Bad - Timer leaks
useEffect(() => {
  setInterval(callback, 1000)
}, [])

// ✅ Good - Cleanup
useEffect(() => {
  const timer = setInterval(callback, 1000)
  return () => clearInterval(timer)
}, [])
```

### Pitfall 2: Whole Store Subscription

```typescript
// ❌ Bad - Re-renders on any change
const store = useChatStore()

// ✅ Good - Selective subscription
const messages = useChatStore(state => state.messages)
```

### Pitfall 3: Missing Cache Check

```typescript
// ❌ Bad - Always extracts
const data = await extract()

// ✅ Good - Cache first
const cached = await storage.get(key)
if (cached) return cached
const data = await extract()
await storage.set(key, data)
```

### Pitfall 4: Not Handling Errors

```typescript
// ❌ Bad - Uncaught
const result = await riskyOperation()

// ✅ Good - Caught
try {
  const result = await riskyOperation()
} catch (error) {
  console.error("Operation failed:", error)
  // Handle gracefully
}
```

### Pitfall 5: Mixing Async/Sync Updates

```typescript
// ❌ Bad - Race condition
async function updateState() {
  const current = useChatStore.getState().value
  await asyncOperation()
  useChatStore.setState({ value: current + 1 })  // Stale value!
}

// ✅ Good - Use updater function
async function updateState() {
  await asyncOperation()
  useChatStore.setState(state => ({
    value: state.value + 1  // Always current
  }))
}
```

## Related Documentation

- **[Development Guide](development.md)** - Setup, debugging, testing
- **[Architecture Overview](../architecture/overview.md)** - System design
- **[Design Patterns](../architecture/design-patterns.md)** - Patterns used
- **[React Hooks](../components/hooks.md)** - Hook implementations
- **[Zustand Stores](../components/stores.md)** - Store patterns
