import { z } from "zod"

export const conceptSchema = z.array(
  z.object({
    id: z.number().describe("The concept number"),
    title: z
      .string()
      .describe("A concise title for the key concept"),
    description: z
      .string()
      .describe("A detailed description explaining the concept")
  })
)
  .min(1)
  .describe("A list of key concepts extracted from the video")

export type ConceptArray = z.infer<typeof conceptSchema>
export type Concept = ConceptArray[number]

export const quizQuestionSchema = z.array(
  z.object({
    question: z.string().describe("A true/false question about the concept"),
    correctAnswer: z.boolean().describe("The correct answer (true or false)"),
    explanation: z.string().describe("A brief explanation of why this answer is correct, helping users understand the concept better")
  })
)
  .min(3)
  .max(10)
  .describe("A list of true/false questions about a specific concept")

export type QuizQuestions = z.infer<typeof quizQuestionSchema>
export type QuizQuestion = QuizQuestions[number]

