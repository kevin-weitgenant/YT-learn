import { Brain, Loader2 } from "lucide-react";

interface QuizButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Quiz button component that triggers the quiz modal
 */
export const QuizButton = ({ onClick, isLoading = false, disabled = false }: QuizButtonProps) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Take a Quiz">
      {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Brain size={24} />}
      <span className="font-medium">Quiz</span>
    </button>
  );
};

