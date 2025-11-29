import { create } from "zustand"
import type { Chapter } from "~types/transcript"

interface ChapterStore {
  // State
  chapters: Chapter[]
  selectedChapters: number[]
  showPanel: boolean
  rangeInput: string

  // Derived state (computed)
  isAllSelected: () => boolean
  selectedCount: () => number

  // Actions
  setChapters: (chapters: Chapter[]) => void
  setSelectedChapters: (indices: number[]) => void
  togglePanel: () => void
  toggleChapter: (chapterIndex: number) => void
  selectAll: () => void
  deselectAll: () => void
  setRangeInput: (value: string) => void
  applyRange: (range?: string) => void
  reset: () => void
}

export const useChapterStore = create<ChapterStore>((set, get) => ({
  // Initial state
  chapters: [],
  selectedChapters: [],
  showPanel: false,
  rangeInput: "",

  // Derived state
  isAllSelected: () => {
    const { chapters, selectedChapters } = get()
    return chapters.length > 0 && selectedChapters.length === chapters.length
  },

  selectedCount: () => get().selectedChapters.length,

  // Actions
  setChapters: (chapters: Chapter[]) =>
    set(() => {
      // When chapters are set, default to all selected
      const selectedChapters = Array.from(
        { length: chapters.length },
        (_, i) => i
      )
      return { chapters, selectedChapters }
    }),

  setSelectedChapters: (indices: number[]) =>
    set({ selectedChapters: indices }),

  togglePanel: () => set((state) => ({ showPanel: !state.showPanel })),

  toggleChapter: (chapterIndex: number) =>
    set((state) => ({
      selectedChapters: state.selectedChapters.includes(chapterIndex)
        ? state.selectedChapters.filter((i) => i !== chapterIndex)
        : [...state.selectedChapters, chapterIndex]
    })),

  selectAll: () =>
    set((state) => ({
      selectedChapters: Array.from({ length: state.chapters.length }, (_, i) => i)
    })),

  deselectAll: () => set({ selectedChapters: [] }),

  setRangeInput: (value: string) => set({ rangeInput: value }),

  applyRange: (rangeValue?: string) =>
    set((state) => {
      const rangeToUse = rangeValue !== undefined ? rangeValue : state.rangeInput
      const selected = new Set<number>()
      const ranges = rangeToUse.split(",")
      const totalChapters = state.chapters.length

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

      return { selectedChapters: Array.from(selected) }
    }),

  reset: () =>
    set({
      chapters: [],
      selectedChapters: [],
      showPanel: false,
      rangeInput: ""
    })
}))
