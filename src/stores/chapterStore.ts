import { create } from "zustand"
import type { Chapter } from "~types/transcript"
import { parseChapterRange, indicesToRangeString } from "~utils/chapterRangeParser"

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
      // Initialize range input to reflect default selection
      const rangeInput = indicesToRangeString(selectedChapters)
      return { chapters, selectedChapters, rangeInput }
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
      const selected = parseChapterRange(rangeToUse, state.chapters.length)
      return { selectedChapters: selected }
    }),

  reset: () =>
    set({
      chapters: [],
      selectedChapters: [],
      showPanel: false,
      rangeInput: ""
    })
}))
