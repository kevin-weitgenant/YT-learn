<!-- 87131bc9-f2bd-4c5f-a87f-8be02b7c3c71 64865a6b-751c-4d7c-8ec4-a27e780dffe2 -->
# Storage Optimization Plan

## Overview

Optimize storage architecture for better performance and memory management by moving temporary data to session storage and switching to video-centric persistent storage.

---

## Part 1: Move Embedding Progress to Session Storage

### What & Why

Move `embeddingProgress-${videoId}` from local storage to session storage because it's temporary UI feedback that should auto-clean when browser closes.

### Files Modified

**`src/background/messages/embedTranscript.ts`** (2 changes)

- Change storage initialization in main handler (line 38) from local to session area
- Change storage initialization in error handler (line 153) from local to session area

**`README.md`** (documentation update)

- Update storage architecture section to reflect that embedding progress now lives in session storage instead of local storage

### Benefits

- Automatic cleanup on browser close (no orphaned progress data)
- Faster read/writes (RAM instead of disk)
- Semantically correct (progress is ephemeral)

---

## Part 2: Video-Centric Persistent Storage

### What & Why

Switch from tab-centric storage (`videoContext_${tabId}`) to video-centric storage (`videoContext_${videoId}`). Videos are cached permanently and shared across all tabs. No deletion except when storage quota is exceeded.

### Architecture

- **Session storage**: Already stores `${tabId} → videoId` mapping (via existing `setVideoForTab`)
- **Local storage**: Will store `videoContext_${videoId}` persistently (new approach)
- **Sidepanel**: Reads tab ID, looks up video ID from session storage, then reads video context from local storage

### Files Modified

#### 1. `src/contents/youtube-chat-button.tsx`

**Changes:**

- Extract video ID from current page URL
- Check if video context already exists in storage for this video ID
- If exists: reuse it (instant, no transcript extraction)
- If not: extract transcript and save under video ID key
- Keep existing call to `setVideoForTab` (it handles session storage mapping)

**Detailed Implementation:**

```typescript
const handleOpenChat = async () => {
  setIsLoading(true)
  setError(null)

  try {
    // Open side panel - get tab ID (existing)
    const response = await sendToBackground({ name: "openSidePanel" })
    const tabId = response?.tabId
    if (!tabId) throw new Error("Could not determine tab ID")

    // NEW: Extract videoId from URL
    const videoId = new URL(window.location.href).searchParams.get("v")
    if (!videoId) throw new Error("Could not determine video ID")

    // NEW: Check if video context already exists (cache check)
    let videoContext = await storage.get(`videoContext_${videoId}`)
    
    if (!videoContext) {
      // Cache miss - extract fresh context
      console.log("📥 Extracting fresh video context for", videoId)
      videoContext = await extractYouTubeContext()
      
      // NEW: Store with videoId key (persistent)
      await storage.set(`videoContext_${videoId}`, videoContext)
    } else {
      // Cache hit - instant!
      console.log("✅ Using cached video context for", videoId)
    }

    // KEEP: Set video for tab (session storage mapping - already implemented)
    await sendToBackground({
      name: "setVideoForTab",
      body: { videoId: videoContext.videoId }
    })
    
  } catch (err) {
    // Error handling (unchanged)
  } finally {
    setIsLoading(false)
    setTimeout(() => setError(null), 5000)
  }
}
```

#### 2. `src/sidepanel.tsx`

**Changes:**

- Keep existing logic to get current tab ID
- Add new hook to read video ID from session storage (uses existing `setVideoForTab` infrastructure)
- Change video context hook to read from video-centric key instead of tab-centric key
- Remove old `videoContext_${tabId}` reference

**Detailed Implementation:**

```typescript
function SidePanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [usingRAG, setUsingRAG] = useState(false)

  // KEEP: Get current tab ID (unchanged)
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]?.id) {
        setCurrentTabId(tabs[0].id)
      }
    })
  }, [])

  // NEW: Get videoId from session storage (tab → videoId mapping)
  const sessionStorage = new Storage({ area: "session" })
  const [videoId] = useStorage<string>({
    key: currentTabId?.toString() || null,
    instance: sessionStorage
  })

  // CHANGED: Read from video-centric key instead of tab-centric
  const [videoContext] = useStorage<VideoContext>({
    key: videoId ? `videoContext_${videoId}` : null,  // Changed from videoContext_${currentTabId}
    instance: storage
  })

  // Rest of component (unchanged)
  // ... model availability, AI session, message handling, etc.
}
```

#### 3. `src/background/index.ts`

**Changes:**

- Simplify tab removal cleanup: only remove session storage mapping, don't touch video contexts
- Simplify navigation cleanup: only remove session storage mapping on video change
- Video contexts persist indefinitely in local storage

**Before (lines 83-87):**

```typescript
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabId.toString())
  chrome.storage.local.remove(`videoContext_${tabId}`)  // ← Remove this line
})
```

**After:**

```typescript
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabId.toString())
  // videoContext_${videoId} stays persistent (not deleted)
})
```

**Before (line 76):**

```typescript
await chrome.storage.local.remove(`videoContext_${details.tabId}`)  // ← Remove this line
```

**After:**

```typescript
// Just remove session mapping, video context stays persistent
```

#### 4. `README.md`

**Changes:**

- Update storage architecture documentation to reflect video-centric approach
- Explain that video contexts are persistent (not deleted with tabs)
- Document storage quota handling strategy

### Benefits

- ✅ **Zero cleanup complexity** - no reference counting, no deletion logic
- ✅ **Ultimate performance** - second tab with same video is instant (no extraction)
- ✅ **Simple architecture** - one video context per video, shared across all tabs
- ✅ **Natural expiry** - session storage auto-cleans tab mappings on browser close
- ✅ **Persistent cache** - revisiting a video weeks later is instant

### Storage Management

- **Typical capacity**: 100-200 videos (at ~50-100KB each within 10MB limit)
- **Cleanup strategy**: Only clean up when quota exceeded (LRU eviction of oldest 5-10 videos)
- **Privacy**: All data is local-only, never synced (same as browser history)

### Trade-offs

- **Storage grows over time** - but Chrome has 10MB+ limit (plenty for typical usage)
- **No auto-cleanup** - but most users won't hit 100+ videos, and quota exceeded is handled gracefully
- **Stale transcripts possible** - if creator updates captions, old version is cached (rare edge case)

---

## Summary

**Part 1**: Move temporary embedding progress to session storage (2 line changes)

**Part 2**: Switch to video-centric persistent storage using existing session infrastructure (4 files)

**Total changes**: 5 files modified

**Risk level**: Low (additive changes, uses existing infrastructure)

**Performance gain**: Instant for cached videos (no transcript extraction)

### To-dos

- [ ] Move embedding progress to session storage in embedTranscript.ts (2 locations)
- [ ] Update README.md to document embedding progress in session storage
- [ ] Modify youtube-chat-button.tsx to use video-centric storage with cache check
- [ ] Update sidepanel.tsx to read videoId from session storage and use video-centric key
- [ ] Simplify background/index.ts cleanup logic (remove video context deletion)
- [ ] Update README.md to document video-centric persistent storage architecture
- [ ] Test: session storage cleanup, video caching, multi-tab performance, storage quota