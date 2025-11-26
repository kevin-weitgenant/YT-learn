# Chat UI Components Documentation

This directory contains all React components that make up the chat interface in the sidepanel.

## Component Hierarchy

```
SidePanel (src/sidepanel.tsx) - Root
├── VideoContextHeader (video-context/)
│   └── Displays video title, channel, transcript errors
│
├── ChatArea (.)
│   ├── availability !== "available"
│   │   └── ModelDownload (model_init/)
│   │       ├── Download Button
│   │       └── Progress Bar
│   │
│   └── availability === "available"
│       ├── MessageList (messages/)
│       │   └── MessageItem[] (messages/)
│       │       └── ReactMarkdown
│       │
│       └── ChatInput (.)
│           ├── ChapterSelectionHeader (chapters/)
│           ├── Textarea (auto-resize)
│           ├── Reset Button (with token circle)
│           ├── Stop Button (during streaming)
│           └── Send Button / Loading Spinner
│
└── ChapterOverlay (chapters/)
    └── ChapterSelectionPanel (chapters/)
        ├── Header (Select All/None buttons)
        ├── Range Input (e.g., "1-3,5-8")
        └── Chapter List (checkboxes)
```

## Component Organization

Components are organized into subdirectories by feature:

- **`video-context/`** - Video metadata display
- **`messages/`** - Message list and individual message items
- **`model_init/`** - Model download and initialization UI
- **`chapters/`** - Chapter selection components
- **`ui/`** - Shared UI primitives (if any)

## Core Components

### VideoContextHeader

**File**: `video-context/VideoContextHeader.tsx`

**Purpose**: Displays video metadata at the top of the sidepanel.

**State**:
- Uses `useVideoContextForTab()` hook to get video data
- Shows loading spinner while loading
- Shows error message if transcript extraction failed

```typescript
function VideoContextHeader() {
  const videoContext = useVideoContextForTab()

  if (!videoContext) {
    return <Spinner>Waiting for video context...</Spinner>
  }

  return (
    <div className="video-context-header">
      <h2>{videoContext.title}</h2>
      <p className="channel">{videoContext.channel}</p>

      {videoContext.error && (
        <div className="error-message">
          Sorry, no available transcripts for this video.
        </div>
      )}
    </div>
  )
}
```

**States**:
- **Loading**: Shows spinner with "Waiting for video context..."
- **Success**: Shows title + channel name
- **Error**: Shows title + channel + error message (transcript unavailable)

### ChatArea

**File**: `ChatArea.tsx`

**Purpose**: Container that switches between model download UI and chat interface based on model availability.

```typescript
function ChatArea() {
  const availability = useChatStore(state => state.availability)

  if (availability !== "available") {
    return <ModelDownload />
  }

  return (
    <div className="chat-area">
      <MessageList />
      <ChatInput />
    </div>
  )
}
```

**Conditional Rendering**:
- `availability === "available"` → Show chat interface
- `availability === "downloadable"` → Show download button
- `availability === "downloading"` → Show progress bar
- `availability === "unavailable"` → Show error message

### ModelDownload

**File**: `model_init/ModelDownload.tsx`

**Purpose**: Handles model download UI with progress tracking.

**States**:

```typescript
function ModelDownload() {
  const { availability, downloadProgress, isExtracting, startDownload } =
    useChatStore()

  // Model not supported
  if (availability === "unavailable") {
    return (
      <div className="error">
        Model not supported on this device
      </div>
    )
  }

  // Downloading or extracting
  if (availability === "downloading" || isExtracting) {
    return (
      <div className="download-progress">
        <ProgressBar value={downloadProgress} />
        <p>
          {isExtracting
            ? "Extracting model..."
            : `Downloading: ${Math.round(downloadProgress * 100)}%`
          }
        </p>
      </div>
    )
  }

  // Downloadable - show button
  return (
    <button className="download-button" onClick={startDownload}>
      Download AI Model
    </button>
  )
}
```

**Download Flow**:
1. User clicks "Download AI Model" button
2. `startDownload()` action called (from chatStore)
3. Progress bar shows download percentage (0-100%)
4. "Extracting model..." shown after download completes
5. Component unmounts when `availability === "available"`
6. ChatArea renders chat interface

### MessageList

**File**: `messages/MessageList.tsx`

**Purpose**: Renders chat history with auto-scroll behavior.

```typescript
function MessageList() {
  const messages = useChatStore(state => state.messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="message-list">
      {messages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}
```

**Auto-Scroll Behavior**:
- Scrolls to bottom when new messages added
- Smooth scrolling animation
- Ref placed at end of message list

**Performance**:
- Only re-renders when `messages` array changes
- Uses `key={message.id}` for efficient React reconciliation

### MessageItem

**File**: `messages/MessageItem.tsx`

**Purpose**: Renders individual message with Markdown support.

```typescript
function MessageItem({ message }: { message: Message }) {
  return (
    <div className={`message message-${message.sender}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={['script', 'iframe', 'object', 'embed']}
      >
        {message.text}
      </ReactMarkdown>
    </div>
  )
}
```

**Markdown Support**:
- Uses `react-markdown` for rendering
- Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
- Disallows dangerous elements (script, iframe, etc.) for security
- Renders code blocks with syntax highlighting

**Styling**:
- **User messages**: `.message-user` - Blue background, right-aligned
- **Bot messages**: `.message-bot` - White background with border, left-aligned

**Message Interface**:

```typescript
interface Message {
  id: number           // Unique identifier (Date.now())
  text: string         // Message content (supports Markdown)
  sender: "user" | "bot"
}
```

### ChatInput

**File**: `ChatInput.tsx`

**Purpose**: Input area with send/reset/stop buttons and token usage indicator.

```typescript
function ChatInput() {
  const {
    inputText,
    isStreaming,
    isSessionReady,
    hasUserMessages,
    tokenInfo,
    sendMessage,
    stopStreaming,
    handleResetSession,
    setInputText
  } = useChatStore()

  const chapters = useChapterStore(state => state.chapters)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isStreaming) return
    await sendMessage(inputText)
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      {/* Chapter selection header (if chapters available) */}
      {chapters.length > 0 && (
        <ChapterSelectionHeader variant="compact" />
      )}

      {/* Textarea */}
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Ask a question about the video..."
        rows={3}
        disabled={!isSessionReady || isStreaming}
      />

      <div className="button-row">
        {/* Reset button with token progress circle */}
        {hasUserMessages && (
          <Tooltip content={
            `Context Window Usage:\n` +
            `System: ${tokenInfo.systemTokens} tokens\n` +
            `Conversation: ${tokenInfo.conversationTokens} tokens\n` +
            `Total: ${tokenInfo.totalTokens} / ${tokenInfo.inputQuota} ` +
            `(${tokenInfo.percentageUsed.toFixed(1)}%)`
          }>
            <button
              type="button"
              onClick={handleResetSession}
              className="reset-button"
            >
              <CircularProgress value={tokenInfo.percentageUsed} />
              <RotateCcw />
            </button>
          </Tooltip>
        )}

        {/* Stop button (during streaming) */}
        {isStreaming && (
          <button type="button" onClick={stopStreaming}>
            <Pause />
          </button>
        )}

        {/* Send button / Loading spinner */}
        {!isSessionReady ? (
          <LoadingSpinner />
        ) : (
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
          >
            <Send />
          </button>
        )}
      </div>
    </form>
  )
}
```

**Features**:

1. **Auto-resize textarea** - Grows with content (minimum 3 rows)
2. **Token usage indicator** - Circular progress bar around reset button
3. **Conditional buttons**:
   - Reset button: Shows only after user sends first message
   - Stop button: Shows only while streaming
   - Send button: Disabled while streaming or session not ready
4. **Chapter selection integration** - Shows header if chapters available
5. **Keyboard shortcuts** - Enter to send (Shift+Enter for new line)

**Token Progress Tooltip**:
- Hover over reset button to see detailed token usage
- Shows system tokens (transcript)
- Shows conversation tokens (messages)
- Shows total and percentage used

### ChapterSelectionHeader

**File**: `chapters/ChapterSelectionHeader.tsx`

**Purpose**: Compact button showing selected chapter count, opens chapter selection panel.

```typescript
function ChapterSelectionHeader({
  variant = "default"
}: {
  variant?: "default" | "compact" | "micro" | "auto"
}) {
  const { chapters, selectedCount, togglePanel } = useChapterStore()

  // Auto variant: measure available space and choose label
  const [label, setLabel] = useState("full")
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (variant !== "auto") return

    const measure = () => {
      const containerWidth = measureRef.current?.offsetWidth ?? 0

      if (containerWidth < 100) setLabel("micro")    // "3/8"
      else if (containerWidth < 200) setLabel("short") // "3 of 8 selected"
      else setLabel("full")                            // "3 of 8 chapters selected"
    }

    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [variant])

  const text =
    label === "micro"
      ? `${selectedCount()}/${chapters.length}`
      : label === "short"
      ? `${selectedCount()} of ${chapters.length} selected`
      : `${selectedCount()} of ${chapters.length} chapters selected`

  return (
    <button
      className="chapter-selection-header"
      onClick={togglePanel}
      ref={measureRef}
    >
      <List />
      {text}
    </button>
  )
}
```

**Responsive Text**:
- **Micro**: "3/8" (< 100px width)
- **Short**: "3 of 8 selected" (< 200px width)
- **Full**: "3 of 8 chapters selected" (≥ 200px width)
- **Auto**: Automatically measures container width and adjusts

**Usage**:
- Placed in ChatInput above textarea
- Shows how many chapters are currently selected
- Clicking opens ChapterOverlay

### ChapterOverlay

**File**: `chapters/ChapterOverlay.tsx`

**Purpose**: Full-screen backdrop and container for chapter selection panel.

```typescript
function ChapterOverlay() {
  const { showPanel, togglePanel } = useChapterStore()

  if (!showPanel) return null

  return (
    <div
      className="chapter-overlay"
      onClick={togglePanel} // Close on backdrop click
    >
      <ChapterSelectionPanel
        onClick={(e) => e.stopPropagation()} // Prevent close on panel click
      />
    </div>
  )
}
```

**Behavior**:
- Only renders when `showPanel === true`
- Clicking backdrop closes panel
- Clicking panel itself keeps it open (stopPropagation)

### ChapterSelectionPanel

**File**: `chapters/ChapterSelectionPanel.tsx`

**Purpose**: Slide-in panel with chapter selection controls.

```typescript
function ChapterSelectionPanel({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  const {
    chapters,
    selectedChapters,
    rangeInput,
    toggleChapter,
    selectAll,
    deselectAll,
    setRangeInput,
    applyRange,
    isAllSelected
  } = useChapterStore()

  return (
    <div className="chapter-selection-panel" onClick={onClick}>
      {/* Header */}
      <div className="header">
        <h3>Select Chapters</h3>
        <div className="actions">
          <button onClick={selectAll}>Select All</button>
          <button onClick={deselectAll}>None</button>
        </div>
      </div>

      {/* Range Input */}
      <div className="range-input-section">
        <input
          type="text"
          value={rangeInput}
          onChange={(e) => setRangeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyRange()}
          placeholder="e.g., 1-3,5-8"
        />
        <button onClick={() => applyRange()}>Apply Range</button>
      </div>

      {/* Chapter List */}
      <div className="chapter-list">
        {chapters.map((chapter, index) => (
          <label key={index} className="chapter-item">
            <input
              type="checkbox"
              checked={selectedChapters.includes(index)}
              onChange={() => toggleChapter(index)}
            />
            <span className="chapter-title">{chapter.title}</span>
            <span className="timestamp">
              {formatTime(chapter.startSeconds)}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
```

**Features**:

1. **Select All / None** - Quick bulk actions
2. **Range Input** - Bulk selection with syntax like "1-3,5-8"
   - Supports ranges: `1-3` = chapters 1, 2, 3
   - Supports comma-separated: `1,3,5` = chapters 1, 3, 5
   - Supports combinations: `1-3,5-8,10`
3. **Individual Checkboxes** - Fine-grained control
4. **Timestamp Display** - Shows chapter start time (e.g., "1:23")
5. **Visual Feedback** - Selected chapters highlighted

**Current Status**: UI-only feature. Selected chapters don't yet filter the transcript sent to AI. See [Future Enhancements](#future-enhancements) below.

## Store Subscription Patterns

### Pattern 1: Single Selector

```typescript
// Component only re-renders when messages change
function MessageList() {
  const messages = useChatStore(state => state.messages)
  // ...
}
```

### Pattern 2: Multiple Selectors

```typescript
// Component re-renders when any selected value changes
function ChatInput() {
  const {
    inputText,
    isStreaming,
    sendMessage
  } = useChatStore(state => ({
    inputText: state.inputText,
    isStreaming: state.isStreaming,
    sendMessage: state.sendMessage
  }))
  // ...
}
```

### Pattern 3: Derived State

```typescript
// Compute derived values in selector (no extra re-renders)
const hasMessages = useChatStore(state => state.messages.length > 0)
```

## Styling Architecture

Components use CSS modules or scoped styles (depending on project setup).

**Key CSS Classes**:
- `.message-user` - User message styling
- `.message-bot` - Bot message styling
- `.chat-area` - Main chat container
- `.chat-input` - Input form container
- `.chapter-overlay` - Backdrop for chapter panel
- `.chapter-selection-panel` - Slide-in panel

## Common Patterns When Working Here

### Adding New Components

1. Create component file in appropriate subdirectory
2. Import store hooks for state access
3. Use selective subscriptions to minimize re-renders
4. Export component from index file if needed

### Accessing Chat State

```typescript
// Subscribe to specific state
const messages = useChatStore(state => state.messages)

// Call actions from store
const sendMessage = useChatStore(state => state.sendMessage)
await sendMessage("Hello")
```

### Handling User Input

```typescript
// Controlled input
<input
  value={inputText}
  onChange={(e) => setInputText(e.target.value)}
/>

// Form submission
<form onSubmit={handleSubmit}>
  {/* Prevent default, validate, call action */}
</form>
```

### Conditional Rendering

```typescript
// Based on state flags
{isStreaming && <StopButton />}
{!isSessionReady && <LoadingSpinner />}
{availability !== "available" && <ModelDownload />}
```

## Future Enhancements

### Chapter Filtering

Currently, chapter selection is UI-only. To implement filtering:

1. **Modify System Prompt Builder** (`src/utils/systemPrompt.ts`):
   ```typescript
   function filterTranscriptByChapters(
     transcript: string,
     chapters: Chapter[],
     selectedIndices: number[]
   ): string {
     // Split transcript by chapter timestamps
     // Return only selected chapter sections
   }
   ```

2. **Pass Selected Chapters to AI Session**:
   ```typescript
   // In useAISession.ts
   const selectedChapters = useChapterStore.getState().selectedChapters
   const filteredTranscript = filterTranscriptByChapters(
     videoContext.transcript,
     videoContext.chapters,
     selectedChapters
   )
   ```

3. **Update System Prompt**:
   ```typescript
   const prompt = `You are an assistant for the video: "${context.title}".

   Here is the transcript for chapters ${formatSelectedChapters(selectedChapters)}:

   ${filteredTranscript}`
   ```

This would allow users to focus AI responses on specific video sections.

## Related Files

- **Chat Hooks**: [src/hooks/chat/](../../hooks/chat/CLAUDE.md) - Business logic for chat functionality
- **Stores**: [src/stores/](../../stores/CLAUDE.md) - State management with Zustand
- **Video Context**: [src/hooks/videoContext/](../../hooks/videoContext/CLAUDE.md) - Video data extraction
- **Types**: `src/types/message.ts`, `src/types/transcript.ts` - Type definitions
