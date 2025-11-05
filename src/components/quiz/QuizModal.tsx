import { X } from "lucide-react"
import { StreamingObjectDemoPage } from "~components/quiz/StreamingObjectDemo"
import type { VideoContext } from "~types/transcript"

interface QuizModalProps {
  onClose: () => void
  videoContext: VideoContext
}

/**
 * Modal displaying AI-powered quiz generator
 * Handles model download, session initialization, and quiz generation
 */
export function QuizModal({ onClose, videoContext }: QuizModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Quiz Generator
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1">
          <StreamingObjectDemoPage videoContext={videoContext} />
        </div>
      </div>
    </div>
  )
}
