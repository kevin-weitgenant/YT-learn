# Nano Tutor Documentation

Welcome to the Nano Tutor documentation! This directory contains detailed technical documentation organized by topic.

## Quick Links

- **[Architecture Overview](architecture/overview.md)** - Start here for system understanding
- **[Development Guide](guides/development.md)** - Setup and debugging
- **[Contributing Guide](guides/contributing.md)** - Adding features

## Architecture

Understand the system design and core patterns.

- **[Overview](architecture/overview.md)** - System architecture, data flow, sequence diagrams
- **[Storage](architecture/storage.md)** - Two-tier storage strategy, caching, cleanup
- **[Design Patterns](architecture/design-patterns.md)** - Hook composition, async actions, streaming

## Components

Detailed documentation for each major component.

- **[Background Script](components/background.md)** - Sidepanel lifecycle, message handlers, tab management
- **[React Hooks](components/hooks.md)** - Chat orchestration, AI session, video context extraction
- **[Zustand Stores](components/stores.md)** - State management, action injection, subscriptions
- **[UI Components](components/ui-components.md)** - Component hierarchy, rendering patterns
- **[YouTube Extraction](components/yt-extraction.md)** - Transcript/chapter extraction, hybrid approach

## Guides

Practical guides for development and contribution.

- **[Development](guides/development.md)** - Commands, debugging, testing, troubleshooting
- **[Contributing](guides/contributing.md)** - Adding features, following patterns, code organization

## Finding What You Need

### "How do I...?"

- **Add a new feature** → [Contributing Guide](guides/contributing.md)
- **Debug an issue** → [Development Guide](guides/development.md)
- **Understand data flow** → [Architecture Overview](architecture/overview.md)
- **Work with storage** → [Storage Documentation](architecture/storage.md)
- **Modify the UI** → [UI Components](components/ui-components.md)
- **Extract YouTube data** → [YouTube Extraction](components/yt-extraction.md)
- **Add message handlers** → [Background Script](components/background.md)
- **Create new hooks** → [React Hooks](components/hooks.md)

### "What is...?"

- **The overall architecture** → [Architecture Overview](architecture/overview.md)
- **Hook composition pattern** → [Design Patterns](architecture/design-patterns.md)
- **Async action injection** → [Design Patterns](architecture/design-patterns.md)
- **Two-tier storage** → [Storage Documentation](architecture/storage.md)
- **The chat orchestrator** → [React Hooks](components/hooks.md)
- **Zustand stores** → [Zustand Stores](components/stores.md)
- **The hybrid extraction method** → [YouTube Extraction](components/yt-extraction.md)
