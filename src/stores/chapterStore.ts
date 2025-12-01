import { create } from "zustand"
import type { Chapter } from "~types/transcript"
import { parseChapterRange, indicesToRangeString } from "~utils/chapterRangeParser"

interface ChapterStore {
  // State
  chapters: Chapter[]
  selectedChapters: number[]
  draftSelectedChapters: number[] // Local buffer for panel selection
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

  // Draft actions (pure state updates, no validation)
  setDraft: (indices: number[]) => void
  toggleDraftChapter: (index: number) => void
  selectAllDraft: () => void
  deselectAllDraft: () => void
  commitDraft: () => void
  resetDraft: () => void
}

export const useChapterStore = create<ChapterStore>((set, get) => ({
  // Initial state
  chapters: [],
  selectedChapters: [],
  draftSelectedChapters: [],
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
      return {
        chapters,
        selectedChapters,
        draftSelectedChapters: selectedChapters,
        rangeInput
      }
    }),

  setSelectedChapters: (indices: number[]) =>
    set({ selectedChapters: indices }),

  togglePanel: () =>
    set((state) => {
      if (state.showPanel) {
        // Closing - commit draft
        return {
          showPanel: false,
          selectedChapters: state.draftSelectedChapters
        }
      } else {
        // Opening - reset draft from committed
        return {
          showPanel: true,
          draftSelectedChapters: state.selectedChapters
        }
      }
    }),

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

  // Draft actions (pure state updates, no validation)
  setDraft: (indices: number[]) => set({ draftSelectedChapters: indices }),

  toggleDraftChapter: (index: number) =>
    set((state) => ({
      draftSelectedChapters: state.draftSelectedChapters.includes(index)
        ? state.draftSelectedChapters.filter((i) => i !== index)
        : [...state.draftSelectedChapters, index].sort((a, b) => a - b)
    })),

  selectAllDraft: () =>
    set((state) => ({
      draftSelectedChapters: Array.from(
        { length: state.chapters.length },
        (_, i) => i
      )
    })),

  deselectAllDraft: () => set({ draftSelectedChapters: [] }),

  commitDraft: () =>
    set((state) => ({
      selectedChapters: state.draftSelectedChapters,
      showPanel: false
    })),

  resetDraft: () =>
    set((state) => ({
      draftSelectedChapters: state.selectedChapters
    })),

  reset: () =>
    set({
      chapters: [],
      selectedChapters: [],
      draftSelectedChapters: [],
      showPanel: false,
      rangeInput: ""
    })
}))
