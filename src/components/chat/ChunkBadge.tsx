interface ChunkBadgeProps {
  chunkCount: number
  onClick: () => void
}

/**
 * Badge showing the number of retrieved chunks
 * Displayed next to user messages when RAG was used
 */
export function ChunkBadge({ chunkCount, onClick }: ChunkBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium rounded-full transition-colors cursor-pointer border border-purple-300"
      title="View retrieved context chunks">
      <span>📎</span>
      <span>{chunkCount}</span>
    </button>
  )
}
