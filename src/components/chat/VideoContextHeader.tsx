import { Loader2 } from "lucide-react"
import type { VideoContext } from "../../types/transcript"

interface VideoContextHeaderProps {
  videoContext: VideoContext | null
}

/**
 * A component that displays the video context header.
 * It shows the video title and channel, or a loading state if the context is not yet available.
 * It also displays an error message if there are no available transcripts for the video.
 *
 * @param videoContext The video context to display.
 */
export function VideoContextHeader({ videoContext }: VideoContextHeaderProps) {
  return videoContext ? (
    <div>
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-xl">💬</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 text-sm truncate">
              {videoContext.title}
            </h3>
            <p className="text-xs text-blue-700 truncate">
              by {videoContext.channel}
            </p>
          </div>
        </div>
      </div>
      {videoContext.error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-800 text-xs">
          <p className="font-medium">
            Sorry, no available transcripts for this video.
          </p>
        </div>
      )}
    </div>
  ) : (
    <div className="bg-gray-100 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <Loader2 size={20} className="animate-spin text-gray-600" />
        <div className="flex-1">
          <p className="text-sm text-gray-700 font-medium">
            Waiting for video context...
          </p>
        </div>
      </div>
    </div>
  )
}
