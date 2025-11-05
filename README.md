<div align="center">

<img src="assets/icon.png" alt="chrome extension logo" width="256" />

# Nano Tutor

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Plasmo](https://img.shields.io/badge/Plasmo-0b8fe9?logo=googlechrome&logoColor=white)](https://docs.plasmo.com/)
[![Chrome AI](https://img.shields.io/badge/Chrome%20AI-Gemini%20Nano-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/ai/)
[![Transformers v3](https://img.shields.io/badge/Transformers%20v3-Xenova%2Fall--MiniLM--L6--v2-FFD21E?logo=huggingface)](https://huggingface.co/docs/transformers.js/index)

**Transform YouTube videos into interactive learning experiences—completely free, completely private.**

Chat with any video, generate quizzes, and test your understanding using Gemini Nano running entirely on your device.

**No servers. No API costs. No data leaves your browser.**

</div>

## Demo

https://github.com/user-attachments/assets/6a443983-efea-4431-b5d4-6a69cf46a3d3

## Why This Exists

I previously built [videolearnai.com](https://videolearnai.com) but ran into frustrating limitations: proxies needed for YouTube transcripts, expensive API costs, and a clunky user experience. When Gemini Nano became available locally in Chrome, I saw an opportunity to rebuild the entire concept—no backend, no bills, just a browser extension that runs AI directly on your machine.

Built in 12 days for the Google Chrome Built-in AI Challenge.

## Features

### 💬 Chat with Videos

Ask questions about any YouTube video and get instant, context-aware answers based on the transcript. Gemini Nano understands the content and provides accurate responses—even for long-form videos.

**Smart RAG Pipeline**: For longer videos, the extension automatically uses embeddings and vector search to retrieve the most relevant sections, ensuring answers stay accurate even when transcripts exceed the model's context window.

### 📝 Interactive Quizzes *(Prototype)*

> **Note**: The quiz feature is an experimental prototype currently in active development.

- **AI-Powered Concept Extraction**: Automatically identifies key concepts from video transcripts
- **True/False Questions**: Generates 5-8 contextual questions for each concept with explanations
- **Progress Tracking**: Track completion and scores across concepts
- **Editable Concepts**: Review, edit, or remove concepts before starting quizzes
- **Persistent Storage**: Concepts and quiz results are saved locally per video

### 🔒 Privacy First

- **100% local processing**—all AI computations happen on your device
- **No API keys required**—no OpenAI, no external services
- **No data transmission**—transcripts, embeddings, and chats never leave Chrome
- **Works offline** after initial model download

### ⚡ Performance & Efficiency

- **Local-first caching**: Instant revisits with zero network calls
- **WebGPU-accelerated embeddings**: Fast semantic search using Transformers.js v3
- **Lightweight RAG**: Only activates chunking and embeddings when needed
- **Persistent vector store**: IndexedDB-backed HNSW search for efficient retrieval

## Prerequisites

Before installing, ensure you have:

1. **Chrome Dev/Canary 128+** ([download here](https://www.google.com/chrome/dev/))

2. **Chrome AI Enabled**:
   - Navigate to `chrome://flags/#optimization-guide-on-device-model`
   - Set to **"Enabled BypassPerfRequirement"**
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to **"Enabled"**
   - Restart Chrome

3. **pnpm Package Manager**:
   ```bash
   npm install -g pnpm
   ```

4. **Node.js 18+** (recommended)

## Installation

### For Users

1. Download or clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm build
   ```
4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `build/chrome-mv3-prod` directory

### For Developers

```bash
pnpm install
pnpm dev
```

Load `build/chrome-mv3-dev` into Chrome as an unpacked extension. Edit any component (e.g., `src/sidepanel.tsx`) and Plasmo will hot-reload changes.

### First-Time Setup

When you first use the Chat or Quiz feature:
1. Gemini Nano will download automatically (~1-2GB, one-time only)
2. Wait for the download and extraction to complete (progress shown in UI)
3. Once ready, the extension will work offline

## Usage

### Chat with a Video

1. Navigate to any **YouTube video with captions**
2. Click the **Chat** button (appears inline with Like/Share buttons)
3. Chrome's side panel opens with video context loaded
4. Ask questions about the video content
5. Get AI-powered answers based on the transcript

**Example questions:**
- "What are the main points discussed?"
- "Summarize the section about X"
- "What did they say about Y?"

### Generate Quizzes *(Prototype)*

1. Navigate to any **YouTube video with captions**
2. Click the **Quiz** button (next to the Chat button)
3. Wait as AI extracts key concepts in real-time (streaming)
4. Review the concept list—edit titles/descriptions or delete irrelevant ones
5. Click **Start Quiz** to begin
6. Answer True/False questions for each concept
7. View explanations and your score after each quiz
8. Retake quizzes or return to concept selection

**Quiz sessions and concepts are saved locally per video.**

## Technical Deep-Dive

### RAG Status & Performance

- **Current approach**: A first-pass, intentionally naive implementation used to test GPU-backed embeddings in the browser. It works for demos but will be replaced by a more robust retrieval strategy.

- **Embedding timing (Chrome on GPU)**:
  - 6 min video → **5.2s total** (chunking 0.01s · embedding 5.2s · 45 chunks ≈ 116ms each)
  - 2h 28min video → **46s total** (chunking 0.26s · embedding 45.9s · 729 chunks ≈ 63ms each)

## Storage Architecture

This extension uses multiple storage systems to manage transcripts, embeddings, and session state. Everything lives inside the user's Chrome profile.

### 1. Transformers v3 Embedding Model (`Xenova/all-MiniLM-L6-v2`)

- **Storage Type**: Browser **Cache Storage API**
- **Location**: Automatically managed by `@huggingface/transformers`
- **Stored Assets**: ONNX model files for text embeddings
- **Lifecycle**: Downloaded on first use, then cached for reuse
- **Inspect via**: Chrome DevTools → Application → Cache Storage

### 2. Chrome Local Storage (`chrome.storage.local`)

- **Data**: `videoContext_${videoId}` objects (title, transcript, channel, URL)
- **Capacity**: ~10 MB (enough for ~100–200 videos)
- **Lifecycle**: Persistent cache with automatic LRU cleanup (drops oldest 10 when limit reached)
- **Disk Path**:

  ```
  C:\Users\{Username}\AppData\Local\Google\Chrome\User Data\Default\Extensions\{extension-id}\
  ```

### 3. Chrome Session Storage (`chrome.storage.session`)

- **Data**: Temporary tab → video mapping (`${tabId}` → `videoId`) plus `embeddingProgress-${videoId}` entries
- **Lifecycle**: In-memory; cleared when the browser closes

### 4. IndexedDB Vector Store

- **Stores**: `TranscriptChunk[]` items (text + metadata) and 384-dim embeddings for HNSW similarity search
- **Chunking**: 512 characters with 100-character overlap (`{videoId}-chunk-{index}`)
- **Benefits**: Fast semantic lookups with persistent storage
- **Disk Path**:

  ```
  C:\Users\{Username}\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\chrome-extension_{extension-id}_0.indexeddb.leveldb\
  ```

### 5. Gemini Nano (Chrome managed)

- **Usage**: Accessed via the `LanguageModel` Prompt API; extension cannot read files directly
- **Disk Path (approx)**:

  ```
  C:\Users\{Username}\AppData\Local\Google\Chrome\User Data\OptimizationGuide\models\
  ```

#### Storage Summary

| Component | Storage Type | Location | What's Stored | Persistent? |
|-----------|-------------|----------|---------------|-------------|
| Embedding Model | Cache Storage API | Browser cache | ONNX model files | Yes |
| Video Context | `chrome.storage.local` | Extension storage | Video metadata + transcripts | Yes |
| Tab ↔ Video & Progress | `chrome.storage.session` | RAM | Session mappings | No |
| Transcript Chunks & Vectors | IndexedDB | Browser database | 512-char chunks + 384D vectors (HNSW) | Yes |
| Gemini Nano | Chrome managed | Internal | Language model | Yes |

### RAG Flow (Current)

1. **Decision Stage**: On session start, transcripts are compared against 80% of the model's context window (`RAG_CONFIG.threshold`).
2. **Full Transcript Mode**: For smaller transcripts—typically up to ~30 minutes of video when the token density stays reasonable—Gemini Nano can ingest the entire transcript in the system prompt, so no embeddings or extra storage hops are needed.
3. **RAG Mode**: Longer or denser transcripts are chunked (512 chars · 100 char overlap), embedded, stored in IndexedDB, and queried through an HNSW index.
4. **First Message Retrieval**: Only the initial user prompt triggers a vector search. Available tokens are split 50/50 between chunk budget and assistant responses, yielding deterministic chunk counts.
5. **Follow-up Messages**: Skip retrieval and rely on established context.

Expect upcoming iterations to incorporate better chunk selection, re-ranking, and conversational memory.

### Transformers v3 × Plasmo Build System

Bundling `@huggingface/transformers@3` into a Manifest V3 service worker requires a few workarounds:

- **URL resolution patches**: `postbuild/sed.js` replaces `new URL(import.meta.url)` with `new URL(self.location.href)` so ONNX assets resolve inside the service worker sandbox.
- **Manifest cleanup**: `postbuild/fix-manifest.js` strips the generated `side_panel` entry that conflicts with Chrome's side panel permission model in this setup.
- **Dev convenience**: `scripts/dev-with-fix.js` wraps `plasmo dev`, waits for the first build, applies the manifest patch, and keeps watching for regenerations.

These scripts keep the build stable today, but upstream improvements or a different bundler strategy could remove the need for manual patches.

### Key Technical Observations

- **Transformers v3 inside Plasmo**: The combination works, but only after patching URL resolution and pruning Plasmo's generated manifest. Without the post-build script, model assets fail to resolve in the service worker.
- **Plasmo side panel ergonomics**: Plasmo treats the side panel as a global definition, so the generated manifest always declares it. To keep the extension scoped to YouTube we rely on a `manifest.json` fix script—otherwise the side panel surfaces everywhere.

### Video-Centric Storage Model

- Each video stores one persistent context record (`videoContext_${videoId}`) for instant reloads.
- Session storage tracks which tab belongs to which video, so duplicate tabs skip re-processing.
- Everything stays on-device; nothing leaves the Chrome profile.

## Development

### Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Production build
- `pnpm test` - Run tests (if configured)

### Architecture Overview

- **Content Scripts**: Inject Chat and Quiz buttons into YouTube's DOM
- **Side Panel**: React-based chat interface using Chrome's native side panel API
- **Background Service Worker**: Manages Transformers.js embeddings, storage, and session state
- **Quiz Components**: Modal-based UI for concept extraction and quiz generation

## Troubleshooting

### Chat/Quiz buttons don't appear
- Ensure you're on a YouTube video page (not the homepage)
- Check that the video has captions available
- Refresh the page after installing the extension

### "Chrome AI is not available"
- Verify Chrome flags are enabled (see Prerequisites)
- Restart Chrome after enabling flags
- Ensure you're on Chrome 128+ Dev/Canary

### Gemini Nano download stuck
- Check your internet connection
- Wait a few minutes—download is ~1-2GB
- Check `chrome://on-device-internals/` for model status

### "No captions available for this video"
- The video must have auto-generated or manual captions
- Check YouTube's CC button—if unavailable there, the extension can't use it

## Roadmap

### Near-term
- ✅ ~~Chat with video transcripts~~
- ✅ ~~True/False quiz generation (prototype)~~
- ✅ ~~Local embeddings with Transformers.js v3~~
- 🚧 Improved RAG with re-ranking and conversational memory
- 🚧 Token-level streaming (currently object-level streaming)

### Future Vision
- **Enhanced Quiz Formats**: Multiple choice, fill-in-the-blank, open-ended questions
- **Visual Context**: Extract and analyze key frames from videos
- **Voice Interaction**: Speak questions instead of typing
- **Hybrid AI Options**: Allow users to opt into cloud models for advanced features
- **Progress Dashboard**: Track learning across multiple videos
- **Spaced Repetition**: Smart quiz scheduling based on retention curves

## License

Distributed under the [MIT License](./LICENSE).

---

<div align="center">

**Built with Gemini Nano, Plasmo, and Transformers.js v3**



</div>

