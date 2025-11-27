# Storage Architecture

This document details Nano Tutor's two-tier storage strategy for managing video contexts and tab-video mappings.

## Overview

The extension uses a dual storage approach optimized for:
- **Multi-tab support** - Each tab can have independent video context
- **Fast retrieval** - Cached video contexts load instantly
- **Storage efficiency** - Automatic cleanup prevents quota issues

## Two-Tier Storage Strategy

### Tier 1: Session Storage (Temporary)

**API**: `chrome.storage.session`

**Purpose**: Maps browser tabs to video IDs

**Key Format**:
```typescript
`${tabId}` → `${videoId}`

// Example:
"12345" → "dQw4w9WgXcQ"
```

**Characteristics**:
- **Lifetime**: Cleared when tab closes
- **Scope**: Per-tab
- **Size**: Minimal (just videoId strings, ~20 bytes each)
- **Use Case**: Multi-tab support

**Operations**:
```typescript
// Set mapping
await sessionStorage.set(tabId.toString(), videoId)

// Get mapping
const videoId = await sessionStorage.get(tabId.toString())

// Remove mapping
await sessionStorage.remove(tabId.toString())
```

**Why Session Storage?**
- Enables multiple tabs with different videos simultaneously
- Automatically cleaned up on tab close (no manual cleanup needed)
- Lightweight mapping layer between tabs and video contexts

### Tier 2: Local Storage (Persistent)

**API**: `chrome.storage.local`

**Purpose**: Caches complete video context objects

**Key Format**:
```typescript
`videoContext_${videoId}` → VideoContext

// Example:
"videoContext_dQw4w9WgXcQ" → {
  videoId: "dQw4w9WgXcQ",
  transcript: "...",  // 50-500KB
  title: "Never Gonna Give You Up",
  channel: "Rick Astley",
  chapters: [...],
  timestamp: 1704067200000
}
```

**Characteristics**:
- **Lifetime**: Persists across browser restarts
- **Scope**: Global (all tabs can access)
- **Size**: ~50-500KB per video (mostly transcript text)
- **Use Case**: Caching expensive transcript extractions

**Operations**:
```typescript
// Set video context
await storage.set(`videoContext_${videoId}`, videoContext)

// Get video context
const context = await storage.get<VideoContext>(`videoContext_${videoId}`)

// Remove video context
await storage.remove(`videoContext_${videoId}`)
```

**Why Local Storage?**
- Transcript extraction is expensive (1-10 seconds)
- Caching allows instant loading on revisit
- Persists across sessions (user can close browser and return)
- Storage limit (10MB) is sufficient for ~20-200 videos

## VideoContext Interface

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

## Cache Strategy

### Cache-First Approach

Always check cache before extracting:

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

  // 3. Clean up old videos before saving
  await cleanupVideoStorage()

  // 4. Store in cache
  await storage.set(`videoContext_${extracted.videoId}`, extracted)

  return extracted
}
```

**Benefits**:
- Instant retrieval on cache hit (0ms vs. 1-10 seconds)
- Reduces YouTube API calls
- Improves user experience

### Cache Cleanup Strategy

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
    .sort((a, b) => b.context.timestamp - a.context.timestamp) // Newest first

  // Keep only most recent 3 videos
  const MAX_CACHED_VIDEOS = 3
  const toRemove = videoContextEntries.slice(MAX_CACHED_VIDEOS)

  for (const entry of toRemove) {
    await storage.remove(entry.key)
    console.log(`Removed old video: ${entry.context.title}`)
  }
}
```

**Cleanup Triggers**:
- Before saving a new video context
- Ensures storage doesn't exceed quota

**Why 3 Videos?**
- Balance between cache hit rate and storage usage
- Users typically revisit recent videos
- 3 videos = ~150KB-1.5MB (well within 10MB limit)
- Higher limit could be used, but 3 provides good balance

## Storage Quota Management

### Chrome Storage Limits

```typescript
// Local storage limit
chrome.storage.local.QUOTA_BYTES  // 10MB (10,485,760 bytes)

// Session storage limit
chrome.storage.session.QUOTA_BYTES  // 10MB (but we use minimal data)
```

### Size Calculations

**Video Context Sizes**:
- Minimal (no transcript): ~500 bytes
- Small transcript (5 min video): ~50KB
- Large transcript (2 hour video): ~500KB
- Typical: ~100-200KB

**Storage Capacity**:
- With 100KB average: ~100 videos
- With 200KB average: ~50 videos
- With 500KB average: ~20 videos

**Current Strategy** (keep 3 videos):
- Worst case: 3 × 500KB = 1.5MB (15% of quota)
- Typical case: 3 × 150KB = 450KB (4.5% of quota)
- Plenty of headroom for future features

### Monitoring Storage Usage

```typescript
// Check bytes in use
const bytesInUse = await chrome.storage.local.getBytesInUse()
console.log(`Storage used: ${bytesInUse} / ${chrome.storage.local.QUOTA_BYTES}`)

// Check specific keys
const videoContextBytes = await chrome.storage.local.getBytesInUse(
  Object.keys(await storage.getAll()).filter(k => k.startsWith("videoContext_"))
)
```

## Multi-Tab Support

### How It Works

```
Tab 1 (Video A)         Tab 2 (Video B)
    |                        |
    v                        v
sessionStorage:          sessionStorage:
"123" → "videoA"         "456" → "videoB"
    |                        |
    +----------+-------------+
               |
               v
         localStorage:
    "videoContext_videoA" → {...}
    "videoContext_videoB" → {...}
```

### Benefits

1. **Independent Contexts**: Each tab maintains its own video
2. **Shared Cache**: Both tabs benefit from cached video contexts
3. **No Conflicts**: Session storage prevents tab confusion
4. **Automatic Cleanup**: Tab closes remove session mapping only

### Example Scenario

```
1. User opens Tab 1 on Video A
   - sessionStorage: "tab1" → "videoA"
   - localStorage: "videoContext_videoA" → {...}

2. User opens Tab 2 on Video B
   - sessionStorage: "tab2" → "videoB"
   - localStorage: "videoContext_videoB" → {...}

3. User switches to Tab 1
   - Sidepanel retrieves: sessionStorage["tab1"] → "videoA"
   - Then: localStorage["videoContext_videoA"]
   - Shows Video A context

4. User closes Tab 1
   - sessionStorage["tab1"] deleted
   - localStorage["videoContext_videoA"] remains (for future use)

5. User reopens Tab 1 on Video A later
   - Cache hit! Instant retrieval from localStorage
```

## Storage Flow Diagrams

### Saving Video Context

```
YouTube Page
    ↓
Extract video context (1-10 seconds)
    ↓
Check current storage size
    ↓
Run cleanup if needed (remove old videos)
    ↓
Save to localStorage: videoContext_${videoId}
    ↓
Map tab to video: sessionStorage[tabId] = videoId
    ↓
Done (context cached for future use)
```

### Retrieving Video Context

```
Sidepanel opens
    ↓
Get active tab ID: chrome.tabs.query()
    ↓
Lookup video ID: sessionStorage.get(tabId)
    ↓
Retrieve context: storage.get('videoContext_${videoId}')
    ↓
Initialize chapter store
    ↓
Return VideoContext to UI
```

## Tab Lifecycle Management

### Tab Created/Opened
- No action needed (session storage empty for new tab)

### Video Context Extracted
```typescript
// Save video context
await storage.set(`videoContext_${videoId}`, context)

// Map tab to video
await sessionStorage.set(tabId.toString(), videoId)
```

### Tab Navigates to Different Video
```typescript
// Background script detects navigation
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  const newVideoId = new URL(details.url).searchParams.get("v")
  const oldVideoId = await sessionStorage.get(details.tabId.toString())

  if (newVideoId !== oldVideoId) {
    // Clear old mapping
    await sessionStorage.remove(details.tabId.toString())

    // Reset sidepanel (toggle disable/enable)
    // User will need to click "Open Chat" again
  }
})
```

### Tab Closed
```typescript
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Remove tab→video mapping
  await sessionStorage.remove(tabId.toString())

  // Note: Video context stays in localStorage (video-centric caching)
})
```

## Debugging Storage

### Inspect Current Storage

```typescript
// Check all session storage
const allSession = await chrome.storage.session.getAll()
console.log("Session storage:", allSession)

// Check all local storage
const allLocal = await chrome.storage.local.getAll()
console.log("Local storage:", allLocal)

// Check video contexts only
const videoContexts = Object.entries(allLocal)
  .filter(([key]) => key.startsWith("videoContext_"))
  .map(([key, value]) => ({
    key,
    title: value.title,
    size: JSON.stringify(value).length,
    timestamp: new Date(value.timestamp).toLocaleString()
  }))
console.table(videoContexts)
```

### Clear Storage (for testing)

```typescript
// Clear all video contexts
const keys = Object.keys(await storage.getAll())
  .filter(k => k.startsWith("videoContext_"))

for (const key of keys) {
  await storage.remove(key)
}

// Clear session storage
await chrome.storage.session.clear()
```

## Common Patterns

### Pattern 1: Check Before Extract

```typescript
// ✅ Good - cache-first
const cached = await storage.get(`videoContext_${videoId}`)
if (cached) return cached

const extracted = await extract()
await storage.set(`videoContext_${videoId}`, extracted)

// ❌ Bad - always extracts (slow, wasteful)
return await extract()
```

### Pattern 2: Cleanup Before Save

```typescript
// ✅ Good - prevents quota issues
await cleanupVideoStorage()
await storage.set(`videoContext_${videoId}`, context)

// ❌ Bad - could exceed quota
await storage.set(`videoContext_${videoId}`, context)
```

### Pattern 3: Session Mapping

```typescript
// ✅ Good - clean separation
await sessionStorage.set(tabId.toString(), videoId)  // Tab mapping
await storage.set(`videoContext_${videoId}`, context)  // Video cache

// ❌ Bad - mixing concerns
await sessionStorage.set(tabId.toString(), context)  // Too much data in session
```

## Related Documentation

- **[Architecture Overview](overview.md)** - System architecture
- **[Background Script](../components/background.md)** - Storage management implementation
- **[Video Context Hooks](../components/hooks.md)** - Context retrieval and extraction
- **[YouTube Extraction](../components/yt-extraction.md)** - What gets cached
