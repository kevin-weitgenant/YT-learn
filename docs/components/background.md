# Background Script Documentation

This directory contains the Chrome extension background script and message handlers that manage the sidepanel lifecycle and inter-component communication.

## Overview

The background script serves as the coordinator between:
- **Content scripts** (YouTube page) - Send requests to open sidepanel
- **Sidepanel** - Queries for video context mapped to current tab
- **Chrome APIs** - Manages sidepanel state and tab lifecycle

## File Structure

```
background/
├── index.ts                    # Main background script (event listeners)
└── messages/
    ├── openSidePanel.ts       # Opens sidepanel for a tab
    └── setVideoForTab.ts      # Maps tab ID to video ID
```

## Background Script (index.ts)

**File**: `index.ts`

**Purpose**: Main background service worker that manages sidepanel lifecycle based on YouTube navigation.

### Event Listeners

#### 1. Enable/Disable Sidepanel Based on URL

```typescript
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = new URL(tab.url)

    if (url.origin === "https://www.youtube.com") {
      // Enable sidepanel for YouTube
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: true
      })
    } else {
      // Disable for other sites
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      })
    }
  }
})
```

**Behavior**:
- Sidepanel only available on YouTube pages
- Automatically enabled when user navigates to YouTube
- Automatically disabled when leaving YouTube
- Per-tab enablement (one tab on YouTube doesn't enable sidepanel for all tabs)

#### 2. Handle Video Navigation (History State Changes)

```typescript
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  // User navigated to different video without page reload
  const newUrl = new URL(details.url)
  const newVideoId = newUrl.searchParams.get("v")

  // Check if video changed
  const currentVideoId = await sessionStorage.get(details.tabId.toString())

  if (currentVideoId && currentVideoId !== newVideoId) {
    // Video changed - reset sidepanel by toggling
    await chrome.sidePanel.setOptions({
      tabId: details.tabId,
      enabled: false
    })
    await chrome.sidePanel.setOptions({
      tabId: details.tabId,
      enabled: true
    })

    // Clear old tab→video mapping
    await sessionStorage.remove(details.tabId.toString())
  }
})
```

**Why This Matters**:
- YouTube is a Single Page Application (SPA)
- Navigating between videos doesn't trigger full page reload
- `onHistoryStateUpdated` fires when URL changes via History API
- Resetting sidepanel prevents showing old video's context for new video

**How It Works**:
1. User watches Video A, opens sidepanel (context for Video A loaded)
2. User clicks another video (Video B) on same tab
3. `onHistoryStateUpdated` fires with new URL
4. Extract new videoId from URL params
5. Compare with stored videoId in session storage
6. If different, toggle sidepanel (disables then re-enables)
7. Clear old tab→video mapping
8. When sidepanel reopens, it will load Video B's context

#### 3. Cleanup on Tab Close

```typescript
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Remove tab→video mapping from session storage
  await sessionStorage.remove(tabId.toString())

  // Note: Video context stays in local storage
  // (video-centric caching, not tab-centric)
})
```

**Storage Cleanup**:
- Session storage: Cleared (tab-specific mapping removed)
- Local storage: NOT cleared (video context persists for future visits)

**Why Keep Video Context?**:
- Video contexts are expensive to extract (1-10 seconds)
- Caching allows instant loading on revisit
- Storage cleanup handled separately (maintains most recent 3 videos)

## Message Handlers

Chrome extension messages use Plasmo's messaging API for type-safe communication between extension components.

### openSidePanel Handler

**File**: `messages/openSidePanel.ts`

**Purpose**: Opens the sidepanel for a specific tab when requested by content script.

```typescript
import type { PlasmoMessaging } from "@plasmohq/messaging"

export default async (
  req: PlasmoMessaging.Request,
  res: PlasmoMessaging.Response
) => {
  const tabId = req.sender.tab?.id

  if (!tabId) {
    return res.send({ success: false, error: "No tab ID" })
  }

  try {
    // Open sidepanel for this tab
    await chrome.sidePanel.open({ tabId })

    // Return tab ID for caller to use
    res.send({ success: true, tabId })
  } catch (error) {
    res.send({ success: false, error: error.message })
  }
}
```

**Usage** (from content script):

```typescript
// In hooks/useOpenChat.ts or content script
const response = await sendToBackground({
  name: "openSidePanel"
})

if (response.success) {
  console.log("Sidepanel opened for tab", response.tabId)
} else {
  console.error("Failed to open sidepanel:", response.error)
}
```

**Response Format**:

```typescript
// Success
{ success: true, tabId: number }

// Error
{ success: false, error: string }
```

### setVideoForTab Handler

**File**: `messages/setVideoForTab.ts`

**Purpose**: Maps a tab ID to a video ID in session storage, enabling the sidepanel to retrieve the correct video context.

```typescript
import type { PlasmoMessaging } from "@plasmohq/messaging"

export default async (
  req: PlasmoMessaging.Request<{ videoId: string }>,
  res: PlasmoMessaging.Response
) => {
  const tabId = req.sender.tab?.id
  const videoId = req.body.videoId

  if (!tabId || !videoId) {
    return res.send({ success: false })
  }

  try {
    // Map tab → video in session storage
    await sessionStorage.set(tabId.toString(), videoId)

    res.send({ success: true })
  } catch (error) {
    res.send({ success: false })
  }
}
```

**Usage** (from content script):

```typescript
// After extracting video context
const videoContext = await getVideoContext() // { videoId: "dQw4w9WgXcQ", ... }

await sendToBackground({
  name: "setVideoForTab",
  body: { videoId: videoContext.videoId }
})
```

**Storage Key Format**:
- Key: `${tabId}` (e.g., `"12345"`)
- Value: `${videoId}` (e.g., `"dQw4w9WgXcQ"`)
- Storage: Session storage (cleared on tab close)

## Data Flow: Opening Chat

```
1. User on YouTube clicks "Open Chat" button
        ↓
2. Content script: useOpenChat.ts
        ↓
3. Extract video context (or use cached)
        ↓
4. Send message: "openSidePanel"
        ↓
5. Background: messages/openSidePanel.ts
   - chrome.sidePanel.open({ tabId })
   - Return tabId to sender
        ↓
6. Send message: "setVideoForTab"
   - body: { videoId }
        ↓
7. Background: messages/setVideoForTab.ts
   - sessionStorage.set(tabId, videoId)
        ↓
8. Sidepanel opens
        ↓
9. Sidepanel: useVideoContextForTab.ts
   - chrome.tabs.query() → get tabId
   - sessionStorage.get(tabId) → get videoId
   - storage.get(`videoContext_${videoId}`) → get context
        ↓
10. Video context loaded in sidepanel
```

## Storage Architecture

Background script manages two storage layers:

### Session Storage (chrome.storage.session)

**Purpose**: Temporary tab→video mapping

```typescript
// Set mapping
await sessionStorage.set(tabId.toString(), videoId)

// Get mapping
const videoId = await sessionStorage.get(tabId.toString())

// Remove mapping
await sessionStorage.remove(tabId.toString())
```

**Characteristics**:
- **Lifetime**: Cleared when tab closes
- **Scope**: Per-tab
- **Size**: Small (just videoId strings)
- **Use Case**: Multi-tab support (each tab has independent video)

### Local Storage (chrome.storage.local)

**Purpose**: Persistent video context caching

```typescript
// Set video context
await storage.set(`videoContext_${videoId}`, videoContext)

// Get video context
const context = await storage.get<VideoContext>(`videoContext_${videoId}`)

// Remove video context
await storage.remove(`videoContext_${videoId}`)
```

**Characteristics**:
- **Lifetime**: Persists across browser restarts
- **Scope**: Global (all tabs can access)
- **Size**: ~50-500KB per video
- **Use Case**: Caching expensive transcript extractions

## Plasmo Messaging API

The extension uses Plasmo's type-safe messaging API:

### Sending Messages

```typescript
import { sendToBackground } from "@plasmohq/messaging"

// Simple message
const response = await sendToBackground({
  name: "openSidePanel"
})

// Message with body
const response = await sendToBackground({
  name: "setVideoForTab",
  body: { videoId: "dQw4w9WgXcQ" }
})
```

### Message Handler Type Safety

```typescript
// Handler with no body
export default async (
  req: PlasmoMessaging.Request,
  res: PlasmoMessaging.Response
) => {
  // req.sender.tab contains tab info
  // res.send() sends response back
}

// Handler with typed body
export default async (
  req: PlasmoMessaging.Request<{ videoId: string }>,
  res: PlasmoMessaging.Response
) => {
  const videoId = req.body.videoId // Type-safe!
}
```

## Common Patterns When Working Here

### Adding New Message Handlers

1. Create file in `messages/` directory: `messages/myHandler.ts`
2. Define handler function with request/response types
3. Export as default
4. Plasmo automatically registers handler
5. Call from content script or sidepanel:
   ```typescript
   await sendToBackground({ name: "myHandler", body: {...} })
   ```

### Accessing Tab Information

```typescript
// In message handler
const tabId = req.sender.tab?.id
const tabUrl = req.sender.tab?.url
const frameId = req.sender.frameId
```

### Managing Sidepanel State

```typescript
// Enable sidepanel for tab
await chrome.sidePanel.setOptions({ tabId, enabled: true })

// Disable sidepanel for tab
await chrome.sidePanel.setOptions({ tabId, enabled: false })

// Open sidepanel programmatically
await chrome.sidePanel.open({ tabId })

// Set sidepanel path (if different panels)
await chrome.sidePanel.setOptions({
  tabId,
  path: "/sidepanel.html",
  enabled: true
})
```

### Debugging Background Script

```typescript
// Background scripts run in service worker context
console.log("Background script initialized")

// View logs in chrome://extensions → "Inspect views: service worker"

// Check session storage
const allSession = await sessionStorage.getAll()
console.log("Session storage:", allSession)

// Check local storage
const allLocal = await storage.getAll()
console.log("Local storage:", allLocal)
```

## Sidepanel vs. Popup

This extension uses **sidepanel** (not popup):

**Sidepanel**:
- Stays open while browsing
- Persists across page navigations
- Better for chat interface (context preserved)
- Chrome 114+ required

**Popup**:
- Closes when clicking outside
- Resets on each open
- Better for quick actions
- Works in older Chrome versions

## Chrome APIs Used

### chrome.sidePanel

```typescript
// Set options
chrome.sidePanel.setOptions({ tabId, enabled: true })

// Open programmatically
chrome.sidePanel.open({ tabId })
```

### chrome.tabs

```typescript
// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {})

// Listen for tab closes
chrome.tabs.onRemoved.addListener((tabId) => {})

// Query tabs
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
```

### chrome.webNavigation

```typescript
// Listen for history state changes (SPA navigation)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  // details.url, details.tabId, details.frameId
})
```

### chrome.storage

```typescript
// Session storage (cleared on browser close)
chrome.storage.session.set({ key: value })
chrome.storage.session.get("key")
chrome.storage.session.remove("key")

// Local storage (persists)
chrome.storage.local.set({ key: value })
chrome.storage.local.get("key")
chrome.storage.local.remove("key")
```

## Troubleshooting

### Sidepanel Not Opening

1. Check if tab is on YouTube (only enabled for YouTube)
2. Check background service worker logs (chrome://extensions)
3. Verify `openSidePanel` message handler responds with `success: true`
4. Check manifest permissions: `sidePanel`, `tabs`, `storage`

### Wrong Video Context Loaded

1. Check session storage mapping: `sessionStorage.get(tabId)`
2. Check video navigation listener is clearing old mapping
3. Verify `setVideoForTab` was called after video context extraction
4. Check local storage has correct video context: `storage.get(`videoContext_${videoId}`)`

### Memory Leaks

1. Ensure `onRemoved` listener clears session storage
2. Verify video context cleanup runs (keeps only 3 recent)
3. Check for orphaned listeners (use `removeListener` when needed)
4. Monitor memory in Task Manager (chrome://memory-redirect)

## Related Files

- **Video Context Hooks**: [src/hooks/videoContext/](../hooks/videoContext/CLAUDE.md) - Extract and retrieve video context
- **Chat Hooks**: [src/hooks/chat/](../hooks/chat/CLAUDE.md) - Use video context for AI sessions
- **Content Script**: `src/contents/youtube-action-buttons.tsx` - Injects "Open Chat" button
- **Sidepanel**: `src/sidepanel.tsx` - Entry point when sidepanel opens
- **Storage Utilities**: `src/utils/storage.ts` - Storage helper functions
