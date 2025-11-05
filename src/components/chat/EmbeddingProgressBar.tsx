import type { EmbeddingProgress } from "../../types/transcript"

interface EmbeddingProgressBarProps {
  progress: EmbeddingProgress
}

/**
 * Progress bar component showing embedding/chunking progress.
 * Matches ModelDownload component styling for consistency.
 */
export function EmbeddingProgressBar({ progress }: EmbeddingProgressBarProps) {
  const percentage = Math.round(progress.progress)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
      <p className="text-sm text-blue-800 font-medium">
        📦 {progress.currentStep}
      </p>
      <p className="text-xs text-blue-600 mt-1">
        Chunk {progress.currentChunk}/{progress.totalChunks} ({percentage}%)
      </p>

      {/* Progress bar - matches ModelDownload style */}
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
