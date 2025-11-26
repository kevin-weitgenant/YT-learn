# State Management (Zustand Stores)

This directory contains Zustand stores that manage global application state.

## Overview

The extension uses Zustand for state management with two main stores:

1. **chatStore** - Chat messages, AI session, model availability, token tracking
2. **chapterStore** - Chapter selection state for filtering video sections

## Why Zustand?

- **No Provider Wrapper**: Direct store access without React context
- **Minimal Boilerplate**: Simple API with `create()` and `setState()`
- **Selective Subscriptions**: Components re-render only when selected state changes
- **DevTools Support**: Built-in Redux DevTools integration
- **TypeScript-First**: Excellent type inference

## chatStore

**File**: `chatStore.ts`

**Purpose**: Central state for all chat functionality, AI session management, and model availability.

### Store Interface

```typescript
interface ChatStore {
  // === Message State ===
  messages: Message[]               // Chat history
  inputText: string                 // Current input value

  // === Session State ===
  session: LanguageModelSession | null  // AI session instance
  isSessionReady: boolean           // Session initialized
  isStreaming: boolean              // Currently streaming response

  // === Model Availability ===
  availability: Availability | null  // Model status
  downloadProgress: number          // Download progress (0-1)
  isExtracting: boolean             // Extracting after download
  apiAvailable: boolean | null      // Prompt API available

  // === Token Tracking ===
  tokenInfo: {
    systemTokens: number            // System prompt tokens
    conversationTokens: number      // User + assistant tokens
    totalTokens: number             // Sum of above
    inputQuota: number              // Max tokens allowed
    percentageUsed: number          // 0-100%
  }

  // === UI State ===
  hasUserMessages: boolean          // User has sent at least one message
  hasTranscriptError: boolean       // Transcript extraction failed
  isOpeningChat: boolean            // Opening chat from YouTube
  openChatError: string | null      // Error opening chat

  // === Actions (Injected by Hooks) ===
  sendMessage: (text: string, options?: { displayText?: string }) => Promise<void>
  handleResetSession: () => Promise<void>
  stopStreaming: () => void
  startDownload: () => Promise<void>

  // === Basic Actions ===
  setInputText: (text: string) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateLastMessage: (text: string) => void
}
```

### Async Action Injection Pattern

A key pattern in this codebase: **Hooks create async functions and inject them into the store**.

#### Why This Pattern?

Actions need access to:
- React refs (abort controllers, throttling timers)
- Closures (current state at function creation time)
- Latest store state (via `getState()`)

Traditional Zustand actions (defined in `create()`) can't access React refs.

#### How It Works

```typescript
// Inside useStreamingResponse hook
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
```

```typescript
// In component
const sendMessage = useChatStore(state => state.sendMessage)
await sendMessage("Hello")
```

**Benefits**:
- Actions use React refs (abort controllers, throttling)
- Actions automatically see latest state via `getState()`
- Type-safe action signatures
- Separates business logic (hooks) from UI (components)

### Store Usage Patterns

#### Pattern 1: Selective Subscription (Optimized)

```typescript
// Component only re-renders when messages change
function MessageList() {
  const messages = useChatStore(state => state.messages)
  return <div>{messages.map(m => <Message key={m.id} {...m} />)}</div>
}
```

#### Pattern 2: Multiple Selectors

```typescript
function ChatInput() {
  const {
    inputText,
    isStreaming,
    isSessionReady,
    sendMessage,
    setInputText
  } = useChatStore(state => ({
    inputText: state.inputText,
    isStreaming: state.isStreaming,
    isSessionReady: state.isSessionReady,
    sendMessage: state.sendMessage,
    setInputText: state.setInputText
  }))

  // Component re-renders when any of these change
}
```

#### Pattern 3: Direct Store Updates (Outside React)

```typescript
// Hooks can update store directly
useChatStore.setState({
  availability: "downloading",
  downloadProgress: 0.5
})
```

#### Pattern 4: Accessing State Without Subscription

```typescript
// Get current state without causing re-renders
const currentMessages = useChatStore.getState().messages
```

### State Update Flow

```
Hook executes
    ↓
Hook calls: useChatStore.setState({ ... })
    ↓
Store updates state
    ↓
All subscribed components re-render
    (only if their selected state changed)
```

## chapterStore

**File**: `chapterStore.ts`

**Purpose**: Manages chapter selection state for filtering which parts of the video to include in chat context.

### Store Interface

```typescript
interface ChapterStore {
  // === Chapter Data ===
  chapters: Chapter[]               // All available chapters
  selectedChapters: number[]        // Indices of selected chapters

  // === UI State ===
  showPanel: boolean                // Chapter selection overlay visible
  rangeInput: string                // Range input value (e.g., "1-3,5-8")

  // === Actions ===
  setChapters: (chapters: Chapter[]) => void
  togglePanel: () => void
  toggleChapter: (index: number) => void
  selectAll: () => void
  deselectAll: () => void
  setRangeInput: (value: string) => void
  applyRange: (range?: string) => void
  reset: () => void

  // === Derived State (Computed) ===
  isAllSelected: () => boolean
  selectedCount: () => number
}
```

### Default Behavior

When chapters are loaded, all are selected by default:

```typescript
setChapters: (chapters) => {
  // Select all chapters by default
  const allIndices = chapters.map((_, i) => i)
  set({
    chapters,
    selectedChapters: allIndices
  })
}
```

### Range Selection

Supports bulk selection with range syntax:

```typescript
applyRange: (range?: string) => {
  // Parse range like "1-3,5-8" or "1,3,5"
  const rangeStr = range ?? get().rangeInput
  const indices = parseRangeInput(rangeStr, get().chapters.length)

  set({ selectedChapters: indices })
}

// Example: "1-3,5-8" → [0,1,2,4,5,6,7] (zero-indexed)
// Example: "1,3,5" → [0,2,4]
```

**Range Format**:
- `1-3` = chapters 1, 2, 3
- `1,3,5` = chapters 1, 3, 5
- `1-3,5-8` = chapters 1, 2, 3, 5, 6, 7, 8
- Numbers are 1-indexed (user-facing), converted to 0-indexed internally

### Derived State Pattern

Zustand supports computed values as functions:

```typescript
isAllSelected: () => {
  const state = get()
  return state.selectedChapters.length === state.chapters.length
}

selectedCount: () => {
  return get().selectedChapters.length
}
```

Used in components:

```typescript
const isAllSelected = useChapterStore(state => state.isAllSelected())
const selectedCount = useChapterStore(state => state.selectedCount())
```

### Integration with Chat

**Current State**: Chapter selection is UI-only and doesn't filter the transcript sent to AI.

**Future Enhancement**: Could filter transcript to only include selected chapters:

```typescript
// Potential implementation
function buildFilteredTranscript(
  transcript: string,
  chapters: Chapter[],
  selectedIndices: number[]
): string {
  const selectedChapters = selectedIndices.map(i => chapters[i])

  // Split transcript by chapter timestamps
  // Return only selected chapter sections
  // ...
}
```

This would allow users to focus AI responses on specific video sections.

## Store Initialization

Stores are created once and persist for the lifetime of the extension:

```typescript
// chatStore.ts
export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  messages: [],
  inputText: "",
  session: null,
  isSessionReady: false,
  // ...

  // Basic actions (defined in create)
  setInputText: (text) => set({ inputText: text }),
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message]
  })),
  // ...

  // Async actions (injected by hooks later)
  sendMessage: async () => {}, // Placeholder
  handleResetSession: async () => {}, // Placeholder
}))
```

**Note**: Async actions like `sendMessage` are placeholders initially, then overwritten by hooks via `setState()`.

## DevTools Integration

Enable Redux DevTools for debugging:

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      // ... store implementation
    }),
    { name: 'ChatStore' }
  )
)
```

**Usage**:
1. Install Redux DevTools browser extension
2. Open DevTools → Redux tab
3. See all state changes with time-travel debugging

## Common Patterns When Working Here

### Adding New State

1. Add field to store interface
2. Add to initial state in `create()`
3. Create action if state needs to be updated
4. Use in components via selector

```typescript
// 1. Interface
interface ChatStore {
  newField: string
}

// 2. Initial state
const store = create<ChatStore>((set) => ({
  newField: "default",

  // 3. Action
  setNewField: (value: string) => set({ newField: value })
}))

// 4. Component usage
const newField = useChatStore(state => state.newField)
```

### Avoiding Unnecessary Re-renders

```typescript
// ❌ Bad: Component re-renders on ANY state change
const store = useChatStore()

// ✅ Good: Only re-renders when messages change
const messages = useChatStore(state => state.messages)
```

### Updating Nested State

```typescript
// Update tokenInfo
useChatStore.setState(state => ({
  tokenInfo: {
    ...state.tokenInfo,
    conversationTokens: newValue
  }
}))
```

### Resetting Store

```typescript
// Reset to initial state
const resetChatStore = () => {
  useChatStore.setState({
    messages: [],
    inputText: "",
    isStreaming: false,
    hasUserMessages: false
    // ...
  })
}
```

## Related Files

- **Chat Hooks**: [src/hooks/chat/](../hooks/chat/CLAUDE.md) - Inject actions into chatStore
- **Video Context Hooks**: [src/hooks/videoContext/](../hooks/videoContext/CLAUDE.md) - Use stores for state
- **UI Components**: [src/components/chat/](../components/chat/CLAUDE.md) - Subscribe to store state
- **Types**: `src/types/message.ts`, `src/types/transcript.ts` - Type definitions used in stores
