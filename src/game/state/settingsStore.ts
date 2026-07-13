import { create } from 'zustand'
import type { SeasonId } from '../seasons'

/** Graphics quality flags + world appearance. Bloom is the first thing to
 * cut on weak GPUs; season is a pure palette swap (instant). */
export interface SettingsState {
  bloom: boolean
  season: SeasonId
  setBloom: (on: boolean) => void
  setSeason: (season: SeasonId) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  bloom: true,
  season: 'summer',
  setBloom: (bloom) => set({ bloom }),
  setSeason: (season) => set({ season }),
}))
