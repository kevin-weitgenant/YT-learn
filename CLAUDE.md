# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Tutor is a Chrome extension that enables interactive chat with YouTube videos using the built-in Gemini Nano AI (Chrome's on-device AI). The extension uses Plasmo framework for Chrome extension development with React 19.

## Development Commands

```bash
# Development (with manifest fix)
pnpm dev

# Development (plain Plasmo)
pnpm dev:plain

# Production build
pnpm build

# Package for distribution
pnpm package

# Clean build artifacts
pnpm clean
```

## Architecture

For detailed architectural documentation, refer to directory-specific CLAUDE.md files:

- **[src/hooks/chat/](src/hooks/chat/CLAUDE.md)** - Chat orchestration, AI session management, message streaming
- **[src/hooks/videoContext/](src/hooks/videoContext/CLAUDE.md)** - Video context extraction and caching strategies
- **[src/stores/](src/stores/CLAUDE.md)** - Zustand state management patterns
- **[src/components/chat/](src/components/chat/CLAUDE.md)** - UI component hierarchy and patterns
- **[src/background/](src/background/CLAUDE.md)** - Background script, message handlers, tab lifecycle
- **[src/utils/yt_extraction/](src/utils/yt_extraction/CLAUDE.md)** - YouTube data extraction (transcripts and chapters)

### Core Flow

1. **Background Script** (`src/background/index.ts`): Manages side panel lifecycle, detecting YouTube URLs and handling video navigation changes
2. **Side Panel** (`src/sidepanel.tsx`): Main UI entry point that orchestrates video context and chat
3. **Chat Orchestrator** (`src/hooks/chat/useChatOrquestrator.ts`): Coordinates model availability, AI session, and message streaming

### State Management (Zustand)

- **chatStore**: Messages, input text, session state, video context, streaming status
- **modelAvailabilityStore**: Gemini Nano availability, download progress, extraction status
- **chapterStore**: YouTube chapter selection state

### AI Session Lifecycle

1. **Model Availability Check** (`useModelAvailability`): Monitors Gemini Nano status (available/downloadable/downloading/unavailable)
2. **Session Creation** (`useAISession`): Creates Chrome AI session with system prompt containing video transcript
3. **System Prompt** (`createSystemPrompt`): Truncates transcript to 80% of input quota if needed, then appends to session
4. **Message Streaming** (`useStreamingResponse`): Handles streaming responses from the AI model

### Video Context Extraction

- **Hybrid Extraction** (`youtubeTranscriptHybrid.ts`): Fast extraction with fallback strategy
- **Caching**: Video contexts stored by videoId in persistent storage
- **Storage Cleanup** (`cleanupVideoStorage`): Maintains only most recent 3 videos

## Storage Architecture

### Two-Tier Strategy

The extension uses a dual storage approach for optimal performance and multi-tab support:

**1. Session Storage** (`chrome.storage.session`)
- **Purpose**: Tab → Video ID mapping
- **Key format**: `${tabId}` → `${videoId}`
- **Lifetime**: Cleared on tab close
- **Enables**: Multi-tab support (each tab has independent video context)
- **Size**: Minimal (just videoId strings)

**2. Local Storage** (`chrome.storage.local`)
- **Purpose**: Video context caching
- **Key format**: `videoContext_${videoId}` → `VideoContext` object
- **Size**: ~50-500KB per video (mostly transcript text)
- **Cleanup**: Maintains most recent 3 videos (prevents quota issues)
- **Enables**: Instant retrieval on revisit (no re-extraction needed)

**Benefits of Two-Tier Approach**:
- Session storage enables multiple tabs with different videos simultaneously
- Local storage caches expensive transcript extractions
- Clean separation: tab-specific vs. video-specific data
- Automatic cleanup on tab close (session) and storage limit (local)

## Key Technical Details

### Chrome AI API (Gemini Nano)

- Type definitions in `src/types/chrome-ai.d.ts`
- Session management: `create()`, `destroy()`, `clone()`, `append()`
- Streaming: `promptStreaming()` with `responseConstraint` for structured JSON output
- Token management: `measureInputUsage()`, `inputUsage`, `inputQuota`

### Plasmo-Specific

- Content script: `src/contents/youtube-action-buttons.tsx` (adds chat button to YouTube UI)
- Messages: Background message handlers in `src/background/messages/`
- Path alias: `~` maps to `src/` (configured in tsconfig.json)

### Build Process

- **dev-with-fix.js**: Wraps Plasmo dev server, watches for manifest.json changes
- **fix-manifest.js**: Post-build script that removes `side_panel` field from manifest (Plasmo auto-adds it, but we manage side panel programmatically)

## Key Design Patterns

### 1. Hook Composition

`useChatOrquestrator` orchestrates multiple specialized hooks, each with single responsibility:
- `useModelAvailability()` - Model check and download
- `useAISession()` - Session creation and management
- `useStreamingResponse()` - Message streaming

**Why**: Clear separation of concerns, easier testing, better code organization.

### 2. Async Action Injection

Hooks create async functions with closures and refs, then inject into Zustand store as actions. Components call these actions from the store.

```typescript
// Hook creates action with ref access
useChatStore.setState({
  sendMessage: async (text) => {
    // Has access to hook's refs and closures
    const stream = await session.promptStreaming(text, {
      signal: abortControllerRef.current.signal
    })
    // ...
  }
})

// Component calls action
const sendMessage = useChatStore(state => state.sendMessage)
await sendMessage("Hello")
```

**Why**: Enables actions to use React refs (abort controllers, throttling) while maintaining centralized state management.

### 3. Throttled Streaming (60 FPS)

Streaming updates throttled to 16ms (60 FPS) to prevent DOM performance issues. AI can stream hundreds of tokens/second; throttling maintains smooth UX.

### 4. Cache-First Extraction

Always check `storage.get<VideoContext>(\`videoContext_${videoId}\`)` before extracting. Only extract on cache miss. Prevents redundant API calls and DOM scraping.

### 5. Session Reset

When resetting chat (clearing messages), destroy old session and create new one. This clears conversation history while maintaining video context.

## Testing

No automated tests currently configured. Manual testing required by loading extension in Chrome with Gemini Nano enabled.
