# Development Guide

This guide covers setup, development workflows, debugging, and troubleshooting for Nano Tutor.

## Development Setup

### Prerequisites

- **Node.js**: 18+ recommended
- **pnpm**: Package manager (`npm install -g pnpm`)
- **Chrome**: Version 114+ (for sidepanel API)
- **Gemini Nano**: Enabled in Chrome (see below)

### Enable Gemini Nano in Chrome

1. Open `chrome://flags`
2. Enable:
   - **Prompt API for Gemini Nano** → Enabled
   - **Enables optimization guide on device** → Enabled BypassPerfRequirement
3. Relaunch Chrome
4. Wait for model download (check `chrome://components` for "Optimization Guide On Device Model")

### Install Dependencies

```bash
cd nano-tutor
pnpm install
```

## Development Commands

Note for assistants: The AI must never run `pnpm dev`, `pnpm dev:plain`, `pnpm build`, `pnpm package`, or `pnpm clean`. The repository owner runs development and build commands locally; do not execute or suggest running these commands. The commands below describe what the user should run on their machine.


## Build Process

### Plasmo-Specific

The extension uses custom build scripts to work around Plasmo limitations:

**dev-with-fix.js**:
- Wraps Plasmo dev server
- Watches for manifest.json changes
- Automatically runs fix-manifest.js on changes

**fix-manifest.js**:
- Post-build script
- Removes `side_panel` field from manifest
- Required because Plasmo auto-adds it, but we manage sidepanel programmatically

### Why the Fix?

Plasmo automatically adds `side_panel` configuration to manifest.json, but this conflicts with programmatic sidepanel management (enabling/disabling per tab). The fix script removes this field after each build.

### Build Output

```
build/
├── chrome-mv3-dev/          # Development build
├── chrome-mv3-prod/         # Production build
└── [extension-name].zip     # Package output
```

## Loading the Extension

### Development

1. Run `pnpm dev`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `build/chrome-mv3-dev` directory

### Production

1. Run `pnpm build && pnpm package`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Drag and drop the `.zip` file

## Testing

### Current Approach

**Manual testing only** - No automated tests currently configured.

### Testing Workflow

1. **Load Extension**: Load unpacked in Chrome
2. **Navigate to YouTube**: Open any video with transcript
3. **Click "Open Chat"**: Test button injection
4. **Check Sidepanel**: Verify it opens
5. **Test Chat**: Send messages, check streaming
6. **Test Features**:
   - Model download (if not available)
   - Chapter selection
   - Reset button (token tracking)
   - Stop button (during streaming)
   - Multi-tab support (open multiple videos)

### Test Scenarios

#### Scenario 1: First-Time User

1. Install extension (Gemini Nano not available)
2. Navigate to YouTube video
3. Click "Open Chat"
4. Should see model download UI
5. Click "Download AI Model"
6. Wait for download progress
7. Model ready → Chat interface appears

#### Scenario 2: Regular Usage

1. Navigate to YouTube video (with transcript)
2. Click "Open Chat"
3. Sidepanel opens instantly (cached context)
4. Send message
5. Receive streaming response
6. Check token usage indicator

#### Scenario 3: Multi-Tab Support

1. Open Tab 1 with Video A → Click "Open Chat"
2. Open Tab 2 with Video B → Click "Open Chat"
3. Switch between tabs
4. Verify each sidepanel shows correct video context

#### Scenario 4: Error Handling

1. Navigate to YouTube video without transcript
2. Click "Open Chat"
3. Should see error message: "No available transcripts"
4. Chat input should still work (but AI has no context)

### Testing Edge Cases

- Videos without transcripts
- Videos without chapters
- Very long transcripts (>500KB)
- Navigating between videos in same tab
- Closing and reopening tabs
- Browser restart (cache persistence)

## Debugging

### Chrome DevTools

#### Background Script

1. Open `chrome://extensions`
2. Find Nano Tutor extension
3. Click "Inspect views: service worker"
4. View console logs, breakpoints, network

#### Sidepanel

1. Open sidepanel
2. Right-click in sidepanel → "Inspect"
3. View React components, state, network

#### Content Script

1. Open YouTube page
2. Right-click → "Inspect"
3. Content script logs appear in page console

### Debugging Storage

```typescript
// Check session storage (tab mappings)
const allSession = await chrome.storage.session.getAll()
console.log("Session storage:", allSession)

// Check local storage (video contexts)
const allLocal = await chrome.storage.local.getAll()
console.log("Local storage:", allLocal)

// Check specific video context
const context = await storage.get<VideoContext>('videoContext_dQw4w9WgXcQ')
console.log("Video context:", context)

// Clear all video contexts
const keys = Object.keys(await storage.getAll())
  .filter(k => k.startsWith("videoContext_"))
for (const key of keys) {
  await storage.remove(key)
}
```

### Debugging AI Session

```typescript
// Check model availability
const status = await self.ai.languageModel.availability()
console.log("Model status:", status)

// Check session state
const { session, isSessionReady, tokenInfo } = useChatStore.getState()
console.log("Session:", session)
console.log("Ready:", isSessionReady)
console.log("Tokens:", tokenInfo)

// Measure prompt tokens
const tokens = await session?.measureInputUsage(prompt)
console.log("Prompt tokens:", tokens)
```

### Debugging Extraction

```typescript
// Test transcript extraction
const videoId = "dQw4w9WgXcQ"
try {
  const transcript = await fetchFirstAvailableTranscript(videoId)
  console.log("API extraction success:", transcript.length, "chars")
} catch (error) {
  console.error("API extraction failed:", error)
  // Try DOM fallback
  try {
    const transcript = await extractTranscriptFromDOM()
    console.log("DOM extraction success:", transcript.length, "chars")
  } catch (fallbackError) {
    console.error("DOM extraction failed:", fallbackError)
  }
}

// Test chapter extraction
const chapters = await extractChapters()
console.log("Chapters:", chapters)
```

### Common Debug Flags

```typescript
// Enable verbose logging
localStorage.setItem('DEBUG', 'nano-tutor:*')

// Log all store updates
useChatStore.subscribe(state => {
  console.log('Chat store updated:', state)
})
```

## Troubleshooting

### Sidepanel Not Opening

**Symptoms**: Click "Open Chat" button, nothing happens

**Possible Causes**:
1. Not on YouTube (check URL)
2. Background service worker crashed
3. Tab ID not available
4. Manifest permissions missing

**Solutions**:
```bash
# 1. Check background service worker
chrome://extensions → Inspect views: service worker

# 2. Check manifest permissions
# Ensure these are present in manifest.json:
"permissions": ["sidePanel", "tabs", "storage", "webNavigation"]

# 3. Check background logs
console.log("Tab ID:", req.sender.tab?.id)
```

### Wrong Video Context Loaded

**Symptoms**: Sidepanel shows different video's context

**Possible Causes**:
1. Session storage mapping incorrect
2. User navigated to new video (SPA navigation)
3. Tab→video mapping not updated

**Solutions**:
```typescript
// Check tab mapping
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
const videoId = await sessionStorage.get(tab.id.toString())
console.log("Tab", tab.id, "→ Video", videoId)

// Clear and remap
await sessionStorage.remove(tab.id.toString())
// User must click "Open Chat" again
```

### Transcript Extraction Fails

**Symptoms**: Error message "No transcript available"

**Possible Causes**:
1. Video has no captions (neither manual nor auto-generated)
2. YouTube API changed
3. DOM structure changed

**Solutions**:
```typescript
// Test API extraction
try {
  const transcript = await fetchFirstAvailableTranscript(videoId)
  console.log("✅ API works")
} catch (error) {
  console.log("❌ API failed:", error.message)
  // Update API endpoint or selectors
}

// Test DOM extraction
try {
  const transcript = await extractTranscriptFromDOM()
  console.log("✅ DOM works")
} catch (error) {
  console.log("❌ DOM failed:", error.message)
  // Update DOM selectors in extractTranscriptFromDOM()
}
```

### Model Not Available

**Symptoms**: Shows "Model not supported on this device"

**Possible Causes**:
1. Gemini Nano not enabled in Chrome flags
2. Chrome version too old (need 114+)
3. Device doesn't support on-device AI

**Solutions**:
1. Check `chrome://flags` - Enable Gemini Nano flags
2. Check `chrome://components` - Wait for model download
3. Update Chrome to latest version
4. Some devices may not support on-device AI

### Streaming Not Working

**Symptoms**: Message sent but no response, or response freezes

**Possible Causes**:
1. Session not ready (`isSessionReady: false`)
2. Abort signal triggered accidentally
3. Network or API error

**Solutions**:
```typescript
// Check session state
const { session, isSessionReady } = useChatStore.getState()
console.log("Session ready:", isSessionReady)
console.log("Session exists:", !!session)

// Check streaming state
const { isStreaming, messages } = useChatStore.getState()
console.log("Is streaming:", isStreaming)
console.log("Last message:", messages[messages.length - 1])

// Manually reset session
const { handleResetSession } = useChatStore.getState()
await handleResetSession()
```

### Memory Leaks

**Symptoms**: Extension slows down over time, high memory usage

**Possible Causes**:
1. Video contexts not cleaned up
2. Event listeners not removed
3. Timers not cleared
4. Sessions not destroyed

**Solutions**:
```bash
# Check memory usage
chrome://memory-redirect

# Clean up video storage
await cleanupVideoStorage()

# Clear all contexts
const keys = Object.keys(await storage.getAll())
  .filter(k => k.startsWith("videoContext_"))
for (const key of keys) {
  await storage.remove(key)
}

# Ensure cleanup on unmount
useEffect(() => {
  return () => {
    // Clear timers
    clearTimeout(timeoutRef.current)
    // Destroy session
    session?.destroy()
    // Remove listeners
    // ...
  }
}, [])
```

### Token Limit Reached

**Symptoms**: Cannot send more messages, context window full

**Possible Causes**:
1. Long conversation (many messages)
2. Large transcript (uses 80% of quota)
3. No reset after many exchanges

**Solutions**:
- Click reset button (circular progress indicator)
- Token usage shown in tooltip on hover
- System: ~80%, Conversation: ~20%
- Reset creates new session with fresh context

## Performance Monitoring

### Storage Usage

```typescript
const bytesInUse = await chrome.storage.local.getBytesInUse()
const quota = chrome.storage.local.QUOTA_BYTES
console.log(`Storage: ${bytesInUse} / ${quota} (${(bytesInUse / quota * 100).toFixed(1)}%)`)
```

### Streaming Performance

```typescript
// Measure streaming latency
const startTime = Date.now()
const stream = await session.promptStreaming(text)
let firstChunkTime = 0

for await (const chunk of stream) {
  if (!firstChunkTime) {
    firstChunkTime = Date.now() - startTime
    console.log("Time to first chunk:", firstChunkTime, "ms")
  }
}

const totalTime = Date.now() - startTime
console.log("Total streaming time:", totalTime, "ms")
```

### Extraction Performance

```typescript
const startTime = Date.now()
const context = await extractYouTubeContextHybrid()
const duration = Date.now() - startTime
console.log("Extraction took:", duration, "ms")
console.log("Transcript size:", context.transcript?.length || 0, "chars")
```

## Related Documentation

- **[Contributing Guide](contributing.md)** - Adding features and following patterns
- **[Architecture Overview](../architecture/overview.md)** - System design
- **[Background Script](../components/background.md)** - Background implementation
- **[React Hooks](../components/hooks.md)** - Hook usage
