interface QuizControlsProps {
  onGenerate: () => void
  onStop: () => void
  isLoading: boolean
  isDisabled: boolean
  status: string
}

export function QuizControls({
  onGenerate,
  onStop,
  isLoading,
  isDisabled,
  status
}: QuizControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onGenerate}
        disabled={isLoading || isDisabled}
        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md">
        {isLoading ? "Extracting..." : "Extract Concepts"}
      </button>

      {isLoading && (
        <button
          onClick={onStop}
          className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all shadow-sm hover:shadow-md">
          Stop
        </button>
      )}

      <div className="flex-1 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
        <div className="text-sm font-mono text-gray-600">
          {status}
        </div>
      </div>
    </div>
  )
}

