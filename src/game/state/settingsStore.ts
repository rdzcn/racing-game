import { create } from 'zustand'

/** Graphics quality flags. Bloom is the first thing to cut on weak GPUs. */
export interface SettingsState {
  bloom: boolean
  setBloom: (on: boolean) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  bloom: true,
  setBloom: (bloom) => set({ bloom }),
}))
