import { useState } from "react";
import { storage, cleanupVideoStorage } from "~utils/storage";
import type { VideoContext } from "~types/transcript";
import { extractYouTubeContextHybrid } from "~utils/youtubeTranscriptHybrid";


export const useVideoContext = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVideoContext = async (): Promise<VideoContext> => {
    setIsLoading(true);
    setError(null);

    try {
      // Extract videoId from URL
      const videoId = new URL(window.location.href).searchParams.get("v");
      if (!videoId) {
        throw new Error("Could not determine video ID");
      }

      // Check if video context already exists (cache check)
      let videoContext = await storage.get<VideoContext>(`videoContext_${videoId}`);
      
      if (!videoContext) {
        // Cache miss - extract fresh context
        console.log("📥 Extracting video context (fast method with fallback) for", videoId);
        videoContext = await extractYouTubeContextHybrid();
        
        // Cleanup before storing new video
        await cleanupVideoStorage();
        
        // Store with videoId key (persistent)
        await storage.set(`videoContext_${videoId}`, videoContext);
      } else {
        // Cache hit - instant!
        console.log("✅ Using cached video context for", videoId);
      }

      return videoContext;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to extract transcript. Make sure the video has captions available.";
      
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getVideoContext,
    isLoading,
    error
  };
};

