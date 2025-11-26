# Video Context Hooks Documentation

This directory contains React hooks that extract and manage YouTube video context (transcript, metadata, chapters).

## Overview

Two main hooks handle video context:

1. **useVideoContext** - Extracts video context from the current YouTube page (used in content script)
2. **useVideoContextForTab** - Retrieves cached video context for a specific browser tab (used in sidepanel)

## Storage Architecture

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

## VideoContext Interface

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

## useVideoContext

**File**: `useVideoContext.ts`

**Purpose**: Extracts video context from the current YouTube page. Used in content scripts when user clicks "Open Chat" button.

### Cache-First Strategy

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

### Cache Cleanup Strategy

**File**: `src/utils/storage.ts` (or similar)

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

## useVideoContextForTab

**File**: `useVideoContextForTab.ts`

**Purpose**: Retrieves the cached video context for the current browser tab. Used in sidepanel to load the correct video data.

### Hook Flow

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

### Data Flow

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

## Video Context Extraction

**File**: `src/utils/yt_extraction/youtubeTranscriptHybrid.ts`

The actual extraction is handled by utility functions in [src/utils/yt_extraction/](../../utils/yt_extraction/CLAUDE.md).

### Hybrid Extraction Method

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

See [src/utils/yt_extraction/CLAUDE.md](../../utils/yt_extraction/CLAUDE.md) for detailed extraction documentation.

## Tab → Video Mapping

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

This is called after video context extraction completes, linking the tab to its video.

## Complete Flow: Opening Chat

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

## Common Patterns When Working Here

### Adding New Video Metadata

1. Update `VideoContext` interface in `src/types/transcript.ts`
2. Extract new field in `extractYouTubeContextHybrid()`
3. Store and retrieve as normal (no cache invalidation needed - uses timestamp)

### Debugging Cache Issues

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

### Handling Extraction Failures

- If transcript extraction fails, `error` field is set in VideoContext
- UI shows error message but still displays video metadata
- User can still interact with chat (but AI won't have transcript context)

### Storage Quota Management

- Chrome local storage limit: 10MB (chrome.storage.local.QUOTA_BYTES)
- Current strategy: Keep 3 most recent videos
- If quota exceeded: Cleanup removes oldest videos automatically
- Monitor with: `chrome.storage.local.getBytesInUse()`

## Related Files

- **Extraction Logic**: [src/utils/yt_extraction/](../../utils/yt_extraction/CLAUDE.md) - Transcript and chapter extraction
- **Background Handlers**: [src/background/](../../background/CLAUDE.md) - Tab lifecycle and message handlers
- **Chat Integration**: [src/hooks/chat/](../chat/CLAUDE.md) - Uses video context for AI sessions
- **UI Components**: [src/components/chat/video-context/](../../components/chat/CLAUDE.md) - Displays video context
