import { Loader2, MessageCircle } from "lucide-react";
import { useOpenChat } from "~hooks/useOpenChat";

interface ChatButtonProps {
  onError?: (error: string | null) => void;
}

/**
 * Chat button component that opens the side panel with video context
 */
export const ChatButton = ({ onError }: ChatButtonProps) => {
  const { handleOpenChat, isLoading, error } = useOpenChat();

  // Propagate error to parent if handler provided
  if (error && onError) {
    onError(error);
  }

  return (
    <button
      onClick={handleOpenChat}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Chat with the video">
      {isLoading ? (
        <>
          <Loader2 size={24} className="animate-spin" />
        </>
      ) : (
        <>
          <MessageCircle size={24} />
        </>
      )}
      <span className="font-medium">Chat</span>
    </button>
  );
};

