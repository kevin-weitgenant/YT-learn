interface ErrorDisplayProps {
  message: string
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
      <h3 className="font-semibold text-red-700 mb-1.5">Error:</h3>
      <p className="text-sm text-red-600 leading-relaxed">{message}</p>
    </div>
  )
}

