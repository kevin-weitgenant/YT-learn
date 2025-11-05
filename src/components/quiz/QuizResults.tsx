interface QuizResultsProps {
  score: number // Number of correct answers
  total: number // Total number of questions
  onContinue: () => void
  onRetake: () => void
}

export function QuizResults({ score, total, onContinue, onRetake }: QuizResultsProps) {
  const percentage = Math.round((score / total) * 100)
  const passed = percentage >= 70

  return (
    <div
      className={`border rounded-lg p-6 ${
        passed
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <h3 className="text-xl font-semibold mb-2">
        {passed ? "✓ Quiz Complete!" : "Try Again"}
      </h3>
      <p className="text-2xl font-bold mb-4">
        Score: {score}/{total} ({percentage}%)
      </p>
      <div className="flex gap-3">
        {passed && (
          <button
            onClick={onContinue}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
          >
            Continue to Next Concept
          </button>
        )}
        <button
          onClick={onRetake}
          className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  )
}
