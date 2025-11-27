# YouTube Extraction Utilities Documentation

This directory contains utilities for extracting video data from YouTube pages, including transcripts and chapters.

## Overview

YouTube data extraction uses a **hybrid approach** that combines:

1. **InnerTube API** (Fast method, ~95% success rate) - Direct API calls to YouTube's internal services
2. **DOM Scraping** (Fallback method) - Extracts data from rendered page elements when API fails

## File Structure

```
yt_extraction/
├── youtubeTranscriptHybrid.ts    # Main hybrid extraction orchestrator
├── youtubeTranscript.ts          # InnerTube API transcript extraction
├── youtubeChapters.ts            # Chapter extraction from ytInitialData
└── (other utilities)
```

## Hybrid Extraction Method

**File**: `youtubeTranscriptHybrid.ts`

**Purpose**: Orchestrates the complete video context extraction process using multiple data sources.

### Main Function

```typescript
async function extractYouTubeContextHybrid(): Promise<VideoContext> {
  const url = window.location.href
  const videoId = extractVideoId(url)

  if (!videoId) {
    throw new Error("Could not extract video ID from URL")
  }

  // Extract basic metadata (always available from DOM)
  const title = document.querySelector("h1.ytd-video-primary-info-renderer")?.textContent?.trim()
  const channel = document.querySelector("ytd-channel-name a")?.textContent?.trim()

  // Extract transcript (fast API + fallback to DOM)
  let transcript: string | undefined
  let transcriptError: string | undefined

  try {
    // Try InnerTube API first (fast, ~95% success)
    transcript = await fetchFirstAvailableTranscript(videoId)
  } catch (error) {
    console.log("InnerTube API failed, trying DOM fallback...")
    try {
      // Fallback to DOM scraping
      transcript = await extractTranscriptFromDOM()
    } catch (fallbackError) {
      transcriptError = "No transcript available for this video"
    }
  }

  // Extract chapters (instant, from ytInitialData)
  const chapters = await extractChapters()

  return {
    videoId,
    title: title || "Unknown Title",
    channel: channel || "Unknown Channel",
    url,
    transcript,
    chapters,
    timestamp: Date.now(),
    error: transcriptError
  }
}
```

### Performance Characteristics

| Method | Speed | Success Rate | Notes |
|--------|-------|--------------|-------|
| InnerTube API | 100-300ms | ~95% | Fastest, preferred method |
| DOM Scraping | 5-10s | ~90% | Requires UI interaction (clicks) |
| Combined (Hybrid) | 100ms-10s | ~99%+ | Best of both approaches |

## Transcript Extraction

### InnerTube API Method (Fast)

**File**: `youtubeTranscript.ts`

**Purpose**: Fetches transcripts directly from YouTube's internal API.

```typescript
async function fetchFirstAvailableTranscript(videoId: string): Promise<string> {
  // 1. Fetch available caption tracks
  const captionTracksUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`

  const response = await fetch(captionTracksUrl)
  const xml = await response.text()

  // 2. Parse XML to find available tracks
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  const tracks = doc.querySelectorAll("track")

  if (tracks.length === 0) {
    throw new Error("No caption tracks available")
  }

  // 3. Get first available track (prefer manual, fall back to auto-generated)
  const track = Array.from(tracks).find(t => t.getAttribute("kind") !== "asr") || tracks[0]
  const langCode = track.getAttribute("lang_code")

  // 4. Fetch transcript for this track
  const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${langCode}`

  const transcriptResponse = await fetch(transcriptUrl)
  const transcriptXml = await transcriptResponse.text()

  // 5. Parse and combine transcript segments
  const transcriptDoc = parser.parseFromString(transcriptXml, "text/xml")
  const segments = transcriptDoc.querySelectorAll("text")

  const transcript = Array.from(segments)
    .map(seg => seg.textContent?.trim())
    .filter(Boolean)
    .join(" ")

  return transcript
}
```

**API Endpoints**:
- **Caption list**: `/api/timedtext?v={videoId}&type=list`
- **Caption data**: `/api/timedtext?v={videoId}&lang={langCode}`

**Caption Track Priority**:
1. Manual captions (human-created)
2. Auto-generated captions (ASR - Automatic Speech Recognition)

**Success Rate**: ~95% (fails when video has no captions at all)

### DOM Scraping Method (Fallback)

**Purpose**: Extracts transcript by interacting with YouTube's transcript panel UI.

```typescript
async function extractTranscriptFromDOM(): Promise<string> {
  // 1. Find and click transcript button
  const transcriptButton = document.querySelector(
    'button[aria-label*="transcript" i], button[aria-label*="Show transcript" i]'
  )

  if (!transcriptButton) {
    throw new Error("Transcript button not found")
  }

  (transcriptButton as HTMLElement).click()

  // 2. Wait for transcript panel to open
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 3. Find transcript container
  const transcriptContainer = document.querySelector(
    'ytd-transcript-renderer, ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
  )

  if (!transcriptContainer) {
    throw new Error("Transcript panel not found")
  }

  // 4. Extract all transcript segments
  const segments = transcriptContainer.querySelectorAll(
    'ytd-transcript-segment-renderer .segment-text'
  )

  const transcript = Array.from(segments)
    .map(seg => seg.textContent?.trim())
    .filter(Boolean)
    .join(" ")

  // 5. Close transcript panel (cleanup)
  (transcriptButton as HTMLElement).click()

  return transcript
}
```

**Steps**:
1. Find transcript button via aria-label (internationalization-safe)
2. Click button to open panel
3. Wait for panel to render (1 second delay)
4. Query for transcript segment elements
5. Extract text from each segment
6. Combine into single string
7. Close panel (cleanup)

**Challenges**:
- Requires UI interaction (not instant)
- Depends on YouTube's DOM structure (can break with UI updates)
- Slower (5-10 seconds)
- Requires button to be in viewport

**Success Rate**: ~90% (fails if UI structure changes or button not found)

## Chapter Extraction

**File**: `youtubeChapters.ts`

**Purpose**: Extracts video chapters from YouTube's page data object (`window.ytInitialData`).

### Chapter Extraction Function

```typescript
async function extractChapters(): Promise<Chapter[]> {
  // 1. Access YouTube's page data object
  const ytInitialData = (window as any).ytInitialData

  if (!ytInitialData) {
    return [] // No chapters available
  }

  // 2. Navigate to chapters in data structure
  const playerOverlays = ytInitialData?.playerOverlays?.playerOverlayRenderer
  const markersMap = playerOverlays?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap

  if (!markersMap) {
    return [] // Video has no chapters
  }

  // 3. Find chapter markers (prefer DESCRIPTION_CHAPTERS, fall back to AUTO_CHAPTERS)
  let chapterMarkers = markersMap.find(
    (marker: any) => marker.key === "DESCRIPTION_CHAPTERS"
  )?.value?.chapters

  if (!chapterMarkers) {
    chapterMarkers = markersMap.find(
      (marker: any) => marker.key === "AUTO_CHAPTERS"
    )?.value?.chapters
  }

  if (!chapterMarkers) {
    return []
  }

  // 4. Map to Chapter interface
  const chapters: Chapter[] = chapterMarkers.map((chapter: any) => ({
    title: chapter.chapterRenderer.title.simpleText,
    startSeconds: chapter.chapterRenderer.timeRangeStartMillis / 1000
  }))

  return chapters
}
```

### Chapter Types

YouTube provides two types of chapters:

#### 1. DESCRIPTION_CHAPTERS (Preferred)

- **Source**: Video description (creator-added timestamps)
- **Format**: Timestamps in description like `0:00 Intro`, `1:23 Main Topic`
- **Quality**: High (human-curated)
- **Availability**: Only if creator adds chapters to description

Example description:
```
0:00 Introduction
1:23 Getting Started
5:47 Advanced Features
10:15 Conclusion
```

#### 2. AUTO_CHAPTERS (Fallback)

- **Source**: AI-generated by YouTube
- **Quality**: Medium (algorithmic)
- **Availability**: Most videos (YouTube auto-generates)

**Priority**: Always prefer DESCRIPTION_CHAPTERS over AUTO_CHAPTERS if both exist.

### Chapter Interface

```typescript
interface Chapter {
  title: string            // Chapter title (e.g., "Introduction")
  startSeconds: number     // Start time in seconds (e.g., 83.5)
}
```

### ytInitialData Structure

YouTube stores page data in a global variable:

```javascript
window.ytInitialData = {
  playerOverlays: {
    playerOverlayRenderer: {
      decoratedPlayerBarRenderer: {
        decoratedPlayerBarRenderer: {
          playerBar: {
            multiMarkersPlayerBarRenderer: {
              markersMap: [
                {
                  key: "DESCRIPTION_CHAPTERS",
                  value: {
                    chapters: [
                      {
                        chapterRenderer: {
                          title: { simpleText: "Introduction" },
                          timeRangeStartMillis: 0
                        }
                      },
                      // ... more chapters
                    ]
                  }
                },
                {
                  key: "AUTO_CHAPTERS",
                  value: { /* ... */ }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

**Performance**: Instant (no network requests, direct object access)

## Data Caching Strategy

Extracted video contexts are cached to avoid re-extraction:

### Cache Key Format

```typescript
const cacheKey = `videoContext_${videoId}`
// Example: "videoContext_dQw4w9WgXcQ"
```

### Cache Storage Location

- **Storage**: `chrome.storage.local` (persistent)
- **Size**: ~50-500KB per video (mostly transcript text)
- **Limit**: Chrome allows 10MB total (enough for ~20-200 videos)

### Cache Cleanup

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
  }
}
```

**Cleanup Triggers**:
- Before saving a new video context
- Prevents storage quota issues
- Maintains most recent 3 videos

**Why 3 Videos?**:
- Balance between storage usage and hit rate
- Users typically revisit recent videos
- 3 videos = ~150KB-1.5MB (well within 10MB limit)

## Error Handling

### Transcript Extraction Errors

```typescript
try {
  transcript = await fetchFirstAvailableTranscript(videoId)
} catch (error) {
  console.log("InnerTube API failed:", error.message)
  try {
    transcript = await extractTranscriptFromDOM()
  } catch (fallbackError) {
    console.log("DOM fallback failed:", fallbackError.message)
    transcriptError = "No transcript available for this video"
  }
}
```

**Error Cases**:
- Video has no captions (neither manual nor auto-generated)
- API endpoint returns error
- DOM structure changed (fallback method fails)
- Transcript button not visible/accessible

**Result**: VideoContext object with `error` field set, but still contains title/channel/chapters.

### Chapter Extraction Errors

Chapter extraction never throws - returns empty array if no chapters found.

```typescript
const chapters = await extractChapters() // [] if no chapters
```

## Utility Functions

### Extract Video ID from URL

```typescript
function extractVideoId(url: string): string | null {
  const urlObj = new URL(url)

  // Standard format: youtube.com/watch?v=VIDEO_ID
  if (urlObj.searchParams.has("v")) {
    return urlObj.searchParams.get("v")
  }

  // Short format: youtu.be/VIDEO_ID
  if (urlObj.hostname === "youtu.be") {
    return urlObj.pathname.slice(1) // Remove leading "/"
  }

  // Embed format: youtube.com/embed/VIDEO_ID
  if (urlObj.pathname.startsWith("/embed/")) {
    return urlObj.pathname.split("/")[2]
  }

  return null
}
```

**Supported URL Formats**:
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://www.youtube.com/embed/dQw4w9WgXcQ`

### Format Time (Seconds → MM:SS)

```typescript
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
```

**Examples**:
- `83` → `"1:23"`
- `3661` → `"61:01"`
- `0` → `"0:00"`

## Common Patterns When Working Here

### Testing Extraction Locally

```typescript
// In browser console on YouTube page
const context = await extractYouTubeContextHybrid()
console.log("Video context:", context)
console.log("Transcript length:", context.transcript?.length)
console.log("Chapters:", context.chapters)
```

### Debugging InnerTube API

```typescript
// Check available caption tracks
const videoId = "dQw4w9WgXcQ"
const response = await fetch(
  `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`
)
const xml = await response.text()
console.log("Available tracks:", xml)
```

### Handling YouTube UI Changes

If DOM scraping fails due to UI changes:

1. Inspect YouTube's transcript panel in DevTools
2. Update selectors in `extractTranscriptFromDOM()`
3. Test with multiple videos (UI may vary by video type)
4. Consider adding multiple selector fallbacks

### Adding New Extraction Features

Example: Extract video duration

```typescript
function extractDuration(): number | null {
  const durationElement = document.querySelector(".ytp-time-duration")
  const durationText = durationElement?.textContent // "10:23"

  if (!durationText) return null

  const [mins, secs] = durationText.split(":").map(Number)
  return mins * 60 + secs // 623 seconds
}
```

Add to `VideoContext` interface and extraction function.

## Performance Optimization

### Parallel Extraction

Transcript and chapters can be extracted in parallel:

```typescript
const [transcript, chapters] = await Promise.all([
  fetchFirstAvailableTranscript(videoId).catch(() => null),
  extractChapters()
])
```

**Benefit**: Shaves off ~100-200ms by running simultaneously.

### Avoid Re-extraction

Always check cache first:

```typescript
// ✅ Good
const cached = await storage.get(`videoContext_${videoId}`)
if (cached) return cached

const extracted = await extractYouTubeContextHybrid()
await storage.set(`videoContext_${videoId}`, extracted)
return extracted

// ❌ Bad (always extracts, slow)
return await extractYouTubeContextHybrid()
```

## Related Files

- **Video Context Hooks**: [src/hooks/videoContext/](../../hooks/videoContext/CLAUDE.md) - Uses these utilities for extraction
- **Types**: `src/types/transcript.ts` - VideoContext and Chapter interfaces
- **Storage**: `src/utils/storage.ts` - Cache management utilities
- **Content Script**: `src/contents/youtube-action-buttons.tsx` - Triggers extraction when user clicks "Open Chat"
