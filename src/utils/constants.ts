import type { VideoContext } from "~types/transcript"

export const SYSTEM_PROMPT = "You are a helpful and friendly assistant."

/**
 * Builds a dynamic system prompt based on video context
 * When video context is available, includes video metadata and transcript
 */
export function buildSystemPrompt(context?: VideoContext): string {
  if (!context) {
    return SYSTEM_PROMPT
  }

  return `You are a helpful and friendly AI assistant specializing in discussing YouTube videos.

You are currently helping the user understand and discuss the following YouTube video:

**Video Title:** ${context.title}

**Full Transcript:**
${context.transcript}

Your role is to:
- Answer questions about the video content based on the transcript
- Provide summaries and insights from the video
- Help users understand specific concepts mentioned in the video
- Reference specific parts of the transcript when relevant
- Be conversational and helpful

Always base your responses on the provided transcript.`
}

export const AI_CONFIG = {
  temperature: 1,
  topK: 3
} as const

export const ERROR_MESSAGES = {
  API_NOT_AVAILABLE:
    "⚠️ Prompt API not available. Please ensure you're using Chrome 138+ or enable Chrome AI in chrome://flags/#optimization-guide-on-device-model and restart Chrome.",
  SESSION_INIT_FAILED: "Failed to initialize AI session",
  STREAMING_ERROR: "Error occurred during streaming"
} as const

export const INITIAL_BOT_MESSAGE = {
  text: "Hello! I'm your AI assistant powered by Gemini Nano. How can I help you today?",
  sender: "bot" as const
}

/**
 * Builds initial bot message based on video context
 */
export function buildInitialBotMessage(context?: VideoContext) {
  if (!context) {
    return INITIAL_BOT_MESSAGE
  }

  return {
    text: `Hello! I'm ready to discuss the YouTube video "${context.title}" by ${context.channel}. I have access to the full transcript. What would you like to know about this video?`,
    sender: "bot" as const
  }
}

