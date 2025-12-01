# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Tutor is a Chrome extension that enables interactive chat with YouTube videos using the built-in Gemini Nano AI (Chrome's on-device AI). The extension uses Plasmo framework for Chrome extension development with React 19.

**Key Technologies:**

- **Framework**: Plasmo (Chrome extension framework)
- **UI**: React 19
- **State Management**: Zustand
- **AI**: Chrome's Gemini Nano (on-device)
- **Platform**: Chrome 114+ (sidepanel API required)

## Development Commands

For safety and consistency, the AI must never run `pnpm dev`, `pnpm dev:plain`, or `pnpm build`. The repository owner prefers to run development and build commands locally; the assistant should not execute or suggest running these commands and should instead instruct the user to run them on their machine.

## Architecture Overview

### Core Components

| Component          | Path                                    | Purpose                             |
| ------------------ | --------------------------------------- | ----------------------------------- |
| Background Script  | `src/background/index.ts`               | Sidepanel lifecycle, tab management |
| Sidepanel          | `src/sidepanel.tsx`                     | Main UI entry point                 |
| Chat Orchestrator  | `src/hooks/chat/useChatOrquestrator.ts` | Coordinates AI session & streaming  |
| Video Context Hook | `src/hooks/videoContext/`               | Extract/retrieve video data         |
| Chat Store         | `src/stores/chatStore.ts`               | Messages, session, model state      |
| Chapter Store      | `src/stores/chapterStore.ts`            | Chapter selection state             |

### Storage Strategy

**Two-Tier Approach:**

- **Session Storage** (`chrome.storage.session`): Tab → Video ID mapping (cleared on tab close)
- **Local Storage** (`chrome.storage.local`): Video context caching (~50-500KB per video, keeps most recent 3)

This enables multi-tab support (each tab has independent video) and instant retrieval on revisit.

### AI Session Lifecycle

1. **Model Availability Check** → Download if needed
2. **Session Creation** → Chrome AI session with video transcript as system prompt
3. **Message Streaming** → Real-time responses with 60 FPS throttling
4. **Token Tracking** → System (80% quota) + Conversation (20% quota) usage monitoring

### Core Flow

```
User clicks "Open Chat" → Extract/cache video context → Open sidepanel
→ Retrieve video context for tab → Initialize AI session → Chat interface ready
```

See [docs/architecture/overview.md](docs/architecture/overview.md) for detailed flow diagrams.

## Documentation Guide

**For detailed documentation, see the [docs/](docs/) directory.**

### Architecture

- **[overview.md](docs/architecture/overview.md)** - System architecture, data flow, sequence diagrams
- **[storage.md](docs/architecture/storage.md)** - Two-tier storage strategy, caching, cleanup
- **[design-patterns.md](docs/architecture/design-patterns.md)** - Hook composition, async action injection, streaming

### Components

- **[background.md](docs/components/background.md)** - Background script, event listeners, message handlers
- **[hooks.md](docs/components/hooks.md)** - Chat & video context hooks, orchestration patterns
- **[stores.md](docs/components/stores.md)** - Zustand stores, action injection, subscriptions
- **[ui-components.md](docs/components/ui-components.md)** - Component hierarchy, UI patterns
- **[yt-extraction.md](docs/components/yt-extraction.md)** - Transcript/chapter extraction, hybrid approach

### Guides

- **[development.md](docs/guides/development.md)** - Setup, debugging, testing, troubleshooting
- **[contributing.md](docs/guides/contributing.md)** - Adding features, following patterns, code organization

## Quick Reference

### Chrome AI API (Gemini Nano)

```typescript
// Type definitions
src/types/chrome-ai.d.ts

// Session management
const session = await self.ai.languageModel.create({ temperature: 1, topK: 3 })
session.destroy()
session.append([{ role: "system", content: prompt }])

// Streaming
const stream = await session.promptStreaming(text, { signal })
for await (const chunk of stream) { /* ... */ }

// Token tracking
const tokens = await session.measureInputUsage(prompt)
const usage = session.inputUsage
const quota = session.maxTokens
```

### Plasmo Framework

- **Path alias**: `~` maps to `src/` (configured in tsconfig.json)
- **Content script**: `src/contents/youtube-action-buttons.tsx` (adds chat button to YouTube UI)
- **Messages**: Background message handlers in `src/background/messages/`
- **Build scripts**: `dev-with-fix.js` (wraps dev server), `fix-manifest.js` (removes auto-added `side_panel` field)

### Storage Keys

```typescript
// Tab → Video mapping (session storage)
`${tabId}` → `${videoId}`

// Video context cache (local storage)
`videoContext_${videoId}` → VideoContext object
```

## Key Design Principles

1. **Hook Composition** - `useChatOrquestrator` orchestrates specialized hooks (model availability, AI session, streaming)
2. **Async Action Injection** - Hooks create functions with refs/closures, inject into Zustand stores
3. **Cache-First** - Always check `storage.get('videoContext_${videoId}')` before extracting
4. **Throttled Streaming** - 60 FPS (16ms) updates prevent DOM performance issues
5. **Two-Tier Storage** - Session (tab-specific) + Local (video-specific) for multi-tab support

Details: [docs/architecture/design-patterns.md](docs/architecture/design-patterns.md)

## State Management Patterns

**CRITICAL: Follow these patterns to prevent unnecessary rerenders and maintain clean component architecture.**

### Zustand Store Subscriptions

1. **Never subscribe in parent and pass as props**
   ```typescript
   // ❌ BAD: Subscribing in parent and passing down
   export function ParentComponent() {
     const data = useStore((state) => state.data)
     return <ChildComponent data={data} />
   }

   // ✅ GOOD: Child subscribes directly
   export function ParentComponent() {
     return <ChildComponent />
   }

   export function ChildComponent() {
     const data = useStore((state) => state.data)
     // Use data here
   }
   ```

2. **Subscribe as low in the component tree as possible**
   - Extract child components to isolate store subscriptions
   - Parent components should subscribe to minimal state
   - Only subscribe to the exact data you need

3. **Keep selectors simple and primitive**
   ```typescript
   // ✅ GOOD: Simple selectors for primitive values
   const count = useStore((state) => state.items.length)
   const isActive = useStore((state) => state.active)

   // ❌ BAD: Returning new objects creates infinite loops
   const data = useStore((state) => ({
     count: state.items.length,
     isActive: state.active
   }))
   ```

4. **Use separate subscriptions instead of combining**
   ```typescript
   // ✅ GOOD: Separate subscriptions
   const isSelected = useStore((state) => state.selectedIds.includes(id))
   const handleToggle = useStore((state) => state.handleToggle)

   // ❌ BAD: Combined selector returns new object each time
   const { isSelected, handleToggle } = useStore((state) => ({
     isSelected: state.selectedIds.includes(id),
     handleToggle: state.handleToggle
   }))
   ```

5. **Use `getState()` for stable action handlers**
   ```typescript
   // ❌ BAD: Subscribes to action function (unnecessary)
   const handleClick = useStore((state) => state.handleClick)

   // ✅ GOOD: Access action directly without subscription
   const handleClick = () => {
     useStore.getState().handleClick()
   }
   ```

### Component Splitting Strategy

When a component subscribes to multiple store values, consider splitting it:

```typescript
// ❌ BAD: Header rerenders when any store value changes
export function Header() {
  const valueA = useStore((state) => state.valueA)
  const valueB = useStore((state) => state.valueB)
  const valueC = useStore((state) => state.valueC)

  return (
    <div>
      <ButtonGroup /> {/* Rerenders unnecessarily */}
      <DisplayA value={valueA} />
      <DisplayB value={valueB} />
      <DisplayC value={valueC} />
    </div>
  )
}

// ✅ GOOD: Each component subscribes to only what it needs
export function Header() {
  return (
    <div>
      <ButtonGroup /> {/* Never rerenders from store changes */}
      <DisplayA />
      <DisplayB />
      <DisplayC />
    </div>
  )
}

function DisplayA() {
  const valueA = useStore((state) => state.valueA)
  return <span>{valueA}</span>
}

function DisplayB() {
  const valueB = useStore((state) => state.valueB)
  return <span>{valueB}</span>
}

function DisplayC() {
  const valueC = useStore((state) => state.valueC)
  return <span>{valueC}</span>
}
```

### Examples

See chapter selection components for reference implementation:
- **ChapterSelectionPanel** (`src/components/chat/chapters/ChapterSelectionPanel.tsx`) - Subscribes only to chapters array for mapping
- **ChapterPanelHeader** (`src/components/chat/chapters/components/ChapterPanelHeader.tsx`) - No store subscriptions, uses getState() for actions
- **ChapterRangeInput** (`src/components/chat/chapters/components/ChapterRangeInput.tsx`) - Isolated subscriptions for range input state
- **ChapterListItem** (`src/components/chat/chapters/components/ChapterListItem.tsx`) - Separate simple selectors
- **SelectedCountDisplay** (`src/components/chat/chapters/components/SelectedCountDisplay.tsx`) - Simple selectors for primitive lengths

##

## Testing

- **Current approach**: Manual testing only
- **Requirements**: Chrome with Gemini Nano enabled
- **How to test**: Load unpacked extension via chrome://extensions

See [docs/guides/development.md](docs/guides/development.md#testing) for testing procedures.

## Getting Help

- Start with [docs/README.md](docs/README.md) for navigation
- Architecture questions → [docs/architecture/](docs/architecture/)
- Implementation questions → [docs/components/](docs/components/)
- How-to guides → [docs/guides/](docs/guides/)
