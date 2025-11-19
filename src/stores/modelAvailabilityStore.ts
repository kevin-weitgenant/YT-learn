import { create } from "zustand"

type Availability = "available" | "downloadable" | "downloading" | "unavailable" | null

interface ModelAvailabilityStore {
  availability: Availability
  downloadProgress: number
  isExtracting: boolean
}

export const useModelAvailabilityStore = create<ModelAvailabilityStore>((set) => ({
  availability: null,
  downloadProgress: 0,
  isExtracting: false
}))
