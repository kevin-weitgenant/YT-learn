import { useState } from "react"
import { Check, X } from "lucide-react"

interface QuizQuestionProps {
  questionNumber: number
  question: string
  correctAnswer: boolean
  explanation: string
  isStreaming?: boolean
  onAnswer?: (answer: boolean) => void
  disabled?: boolean
}

/**
 * Interactive quiz question component with improved aesthetics
 * Styled to match ConceptCard design language
 */
export function QuizQuestion({
  questionNumber,
  question,
  correctAnswer,
  explanation,
  isStreaming = false,
  onAnswer,
  disabled = false
}: QuizQuestionProps) {
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null)

  const handleAnswer = (answer: boolean) => {
    if (disabled) return
    setUserAnswer(answer)
    onAnswer?.(answer)
  }

  const isAnswered = userAnswer !== null
  const isCorrect = isAnswered && userAnswer === correctAnswer

  return (
    <div className={`
      bg-white rounded-lg border transition-all duration-200
      ${isStreaming
        ? 'border-blue-200 animate-pulse shadow-md'
        : 'border-gray-100 hover:border-gray-200'
      }
      p-5 shadow-sm hover:shadow-md
    `}>
      <div className="flex items-start gap-4">
        {/* Number Badge - styled like ConceptCard */}
        <span className="flex-shrink-0 flex items-center justify-center
                         w-10 h-10 bg-blue-500 text-white font-bold
                         text-base rounded-full">
          {questionNumber}
        </span>

        <div className="flex-1 space-y-4">
          {/* Question Text */}
          <p className="text-lg text-gray-800 leading-relaxed font-medium">
            {question}
          </p>

          {/* Answer Buttons or Result */}
          {!isAnswered ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 px-8 py-4 bg-green-50 text-green-700
                           font-semibold rounded-lg border border-green-200
                           hover:bg-green-100 hover:border-green-300
                           transition-all shadow-sm hover:shadow-md text-base">
                True
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 px-8 py-4 bg-red-50 text-red-700
                           font-semibold rounded-lg border border-red-200
                           hover:bg-red-100 hover:border-red-300
                           transition-all shadow-sm hover:shadow-md text-base">
                False
              </button>
            </div>
          ) : (
            <div className={`
              p-4 rounded-lg border
              ${isCorrect
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
              }
            `}>
              <div className="flex items-center gap-2 mb-3">
                {isCorrect ? (
                  <>
                    <Check size={20} className="text-green-600" />
                    <span className="font-semibold text-green-800 text-base">
                      Correct!
                    </span>
                  </>
                ) : (
                  <>
                    <X size={20} className="text-red-600" />
                    <span className="font-semibold text-red-800 text-base">
                      Incorrect
                    </span>
                  </>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-gray-700">
                  <span className="font-semibold">Your answer:</span>{" "}
                  <span className={userAnswer ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                    {userAnswer ? "True" : "False"}
                  </span>
                </div>
                <div className="text-gray-700">
                  <span className="font-semibold">Correct answer:</span>{" "}
                  <span className="font-bold">
                    {correctAnswer ? "True" : "False"}
                  </span>
                </div>

                {/* Explanation */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-gray-700">
                    <span className="font-semibold text-gray-800">Explanation:</span>{" "}
                    <span className="text-gray-600 leading-relaxed">
                      {explanation}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

