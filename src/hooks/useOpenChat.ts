import { useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";
import { useVideoContext } from "./useVideoContext";

/**
 * Hook for opening the chat side panel with video context
 * Handles opening the side panel and setting up the video context for the chat
 */
export const useOpenChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getVideoContext } = useVideoContext();

  const handleOpenChat = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Open the side panel and get the tab ID
      const response = await sendToBackground({ name: "openSidePanel" });
      const tabId = response?.tabId;

      if (!tabId) {
        throw new Error("Could not determine tab ID");
      }

      // Get video context (with caching)
      const videoContext = await getVideoContext();

      // Set video for tab (session storage mapping)
      await sendToBackground({
        name: "setVideoForTab",
        body: { videoId: videoContext.videoId }
      });
    } catch (err) {
      console.error("Failed to extract video context:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to extract transcript. Make sure the video has captions available.";
      
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleOpenChat,
    isLoading,
    error
  };
};

