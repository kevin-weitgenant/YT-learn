interface ModelDownloadProps {
  availability: 'downloadable' | 'downloading' | 'unavailable' | null
  downloadProgress: number
  isExtracting: boolean
  onStartDownload: () => void
}

/**
 * Component that replaces ChatInput when model needs to be downloaded.
 * Shows download button, progress bar, and status messages.
 */
export function ModelDownload({
  availability,
  downloadProgress,
  isExtracting,
  onStartDownload
}: ModelDownloadProps) {
  // API not available at all
  if (availability === 'unavailable') {
    return (
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium">⚠️ AI Model Not Available</p>
          <p className="text-xs text-red-600 mt-1">
            Please ensure you're using Chrome 138+ with Chrome AI enabled in chrome://flags/#optimization-guide-on-device-model
          </p>
        </div>
      </div>
    )
  }

  // Model needs to be downloaded
  if (availability === 'downloadable') {
    return (
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium">🤖 AI Model Required</p>
            <p className="text-xs text-blue-600 mt-1">
              Download the on-device AI model to start chatting. This is a one-time download.
            </p>
          </div>
          <button
            onClick={onStartDownload}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Download AI Model
          </button>
        </div>
      </div>
    )
  }

  // Model is downloading
  if (availability === 'downloading') {
    const percentage = Math.round(downloadProgress * 100)

    return (
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium">
              {isExtracting ? "🔄 Preparing model..." : "⬇️ Downloading model..."}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {isExtracting 
                ? "Extracting and loading into memory. This may take a moment."
                : `Download progress: ${percentage}%`
              }
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            {isExtracting ? (
              // Indeterminate progress bar for extraction phase
              <div className="h-full bg-blue-600 animate-pulse" style={{ width: '100%' }}></div>
            ) : (
              // Determinate progress bar for download phase
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              ></div>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Please wait while the model is being prepared...
          </p>
        </div>
      </div>
    )
  }

  // Fallback for null or unexpected states
  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">Checking model availability...</p>
      </div>
    </div>
  )
}

