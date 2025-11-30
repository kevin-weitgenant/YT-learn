/**
 * Parses a range string (e.g., "1-3,5") into an array of zero-based chapter indices.
 * 
 * @param rangeValue - The range string to parse (e.g., "1-3, 5, 7-9")
 * @param totalChapters - Total number of chapters available (for bounds checking)
 * @returns Array of unique, sorted zero-based indices
 */
export function parseChapterRange(rangeValue: string, totalChapters: number): number[] {
  const selected = new Set<number>()
  const ranges = rangeValue.split(",")

  ranges.forEach((range) => {
    const parts = range.trim().split("-")
    if (parts.length === 1 && parts[0]) {
      // Single number (e.g., "3")
      const num = parseInt(parts[0], 10) - 1
      if (!isNaN(num) && num >= 0 && num < totalChapters) {
        selected.add(num)
      }
    } else if (parts.length === 2) {
      // Range (e.g., "1-3")
      const start = parseInt(parts[0], 10) - 1
      const end = parseInt(parts[1], 10) - 1
      if (!isNaN(start) && !isNaN(end)) {
        for (
          let i = Math.min(start, end);
          i <= Math.max(start, end);
          i++
        ) {
          if (i >= 0 && i < totalChapters) {
            selected.add(i)
          }
        }
      }
    }
  })

  return Array.from(selected).sort((a, b) => a - b)
}

/**
 * Converts an array of zero-based chapter indices into a compact range string.
 *
 * @param indices - Array of zero-based chapter indices (e.g., [0, 1, 2, 4, 5])
 * @returns Compact range string using 1-based numbering (e.g., "1-3,5-6")
 */
export function indicesToRangeString(indices: number[]): string {
  if (indices.length === 0) {
    return ""
  }

  // Sort indices to ensure proper grouping
  const sorted = [...indices].sort((a, b) => a - b)
  const ranges: string[] = []

  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      // Consecutive number, extend current range
      rangeEnd = sorted[i]
    } else {
      // Gap detected, close current range and start new one
      ranges.push(formatRange(rangeStart, rangeEnd))
      rangeStart = sorted[i]
      rangeEnd = sorted[i]
    }
  }

  // Add the final range
  ranges.push(formatRange(rangeStart, rangeEnd))

  return ranges.join(",")
}

/**
 * Formats a range of zero-based indices into 1-based display notation.
 *
 * @param start - Zero-based start index
 * @param end - Zero-based end index
 * @returns Formatted range string (e.g., "3" or "1-3")
 */
function formatRange(start: number, end: number): string {
  // Convert to 1-based numbering for display
  const displayStart = start + 1
  const displayEnd = end + 1

  if (displayStart === displayEnd) {
    // Single number
    return displayStart.toString()
  } else {
    // Range
    return `${displayStart}-${displayEnd}`
  }
}
