import type { TranscriptChunk } from "~types/transcript"
import { X } from "lucide-react"

interface ChunkModalProps {
  chunks: TranscriptChunk[]
  onClose: () => void
}

/**
 * Modal displaying retrieved RAG chunks
 * Shows chunk index and content for each retrieved chunk
 */
export function ChunkModal({ chunks, onClose }: ChunkModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Retrieved Context ({chunks.length} chunk{chunks.length !== 1 ? "s" : ""})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-4">
            {chunks.map((chunk, index) => (
              <div
                key={chunk.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                    Chunk {chunk.chunkIndex}
                  </span>
                  <span className="text-xs text-gray-500">
                    {chunk.text.length} characters
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {chunk.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600">
            These chunks were retrieved from the video transcript and used to provide context to
            the AI.
          </p>
        </div>
      </div>
    </div>
  )
}
