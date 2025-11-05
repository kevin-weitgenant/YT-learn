import type { VideoContext } from "~types/transcript"
import type { Concept } from "./quizSchema"

export const QUIZ_GENERATOR_SYSTEM_PROMPT = `You are a quiz generation assistant. You create clear, educational true/false questions that test understanding of concepts.

Guidelines:
- Write questions that are unambiguous (clearly true or clearly false)
- Avoid trick questions or overly pedantic wording
- Focus on key points and practical understanding
- Use simple, clear language
- Adjust quantity based on concept complexity (3-8 questions)
- Mix difficulty levels when appropriate
- Ensure variety in question patterns`

export function generateQuizPrompt(concept: Concept): string {
  return `Generate true/false questions about this concept:

Title: "${concept.title}"
Description: ${concept.description}

Requirements:
- Generate 5-8 questions (more for complex concepts, fewer for simple ones)
- Each question must be clear and unambiguous
- Mix of difficulty levels (easy, medium, hard)
- Questions should test understanding, not just memorization
- Ensure variety (don't repeat the same pattern)
- For each question, provide a brief explanation (1-2 sentences) that clarifies why the answer is correct

Return ONLY the JSON array of questions with their explanations.`
}

export function generateConceptPrompt(videoContext: VideoContext): string {
  return `Extract ALL key concepts from the following video transcript. For each concept, provide a concise title and a detailed description that explains the concept thoroughly.

Video: "${videoContext.title}"
Channel: ${videoContext.channel}

Transcript:
${videoContext.transcript}

For each key concept, return an object with:
- id: sequential number starting from 1
- title: concise title of the concept (2-8 words)
- description: detailed explanation of the concept (2-4 sentences providing comprehensive context and explanation)

Extract as many concepts as are present in the video. Focus on substantive concepts that represent important ideas, topics, or themes discussed in the video.`
}

