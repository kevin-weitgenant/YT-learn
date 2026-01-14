# YT Learn

**Chat with YouTube videos for FREE using Chrome's built-in AI.**

Select specific chapters to focus on the parts you care about.

<a href="https://chromewebstore.google.com/detail/yt-learn/kilhldjihchdppcmkknhnccmahjjffgk">
  <img src="https://img.shields.io/chrome-web-store/v/kilhldjihchdppcmkknhnccmahjjffgk?label=Chrome%20Web%20Store" alt="Chrome Web Store">
</a>

## Demo

https://github.com/user-attachments/assets/5b4d663f-c09c-4124-95bf-83e9b1195d51

[Watch on YouTube](https://www.youtube.com/watch?v=5KM-zwCP6eI)

## Features

- **Free** - Uses Chrome's built-in Gemini Nano AI. No API keys, no subscriptions.
- **Chapter Selection** - Select only the chapters you want to discuss. Focus on what matters.
- **Private** - On-device AI. Your data stays on your machine, nothing sent to external servers.
- **Multi-tab Support** - Each tab maintains its own video context. Chat with multiple videos simultaneously.

## Requirements

- **Chrome 127+** with Gemini Nano enabled
- Windows, macOS, or Linux

### Enabling Gemini Nano

1. Open `chrome://flags` in Chrome
2. Search for "Prompt API for Gemini Nano"
3. Set it to **Enabled**
4. Relaunch Chrome
5. Open `chrome://components` and check "Optimization Guide On Device Model" is downloaded

## Installation

### Chrome Web Store (Recommended)

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/yt-learn/kilhldjihchdppcmkknhnccmahjjffgk).

### Manual Installation

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build: `pnpm build`
4. Open `chrome://extensions`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `build/chrome-mv3-prod` folder

## Tech Stack

- [Plasmo](https://www.plasmo.com/) - Chrome extension framework
- [React 19](https://react.dev/) - UI library
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Gemini Nano](https://developer.chrome.com/docs/ai/built-in) - Chrome's on-device AI

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

See the [docs](docs/) folder for detailed documentation on architecture, components, and contributing.

