import { create } from 'zustand'
import { trackConfig } from '../config'

/**
 * Discrete race state — updated on events (lap complete), never per-frame.
 * The ticking lap clock is derived in the HUD from lapStartTime.
 */
export interface RaceState {
  /** 0 = not started yet, then 1-based current lap */
  lap: number
  /** performance.now() when the current lap started, null before the race starts */
  lapStartTime: number | null
  /** ms */
  lastLapTime: number | null
  bestLapTime: number | null
  /** one flag per coin slot; count derived once on change */
  collectedCoins: boolean[]
  coinsCollected: number
  startLap: (now: number) => void
  completeLap: (now: number) => void
  collectCoin: (index: number) => void
  reset: () => void
}

const initial = {
  lap: 0,
  lapStartTime: null,
  lastLapTime: null,
  bestLapTime: null,
  collectedCoins: trackConfig.coinSlots.map(() => false),
  coinsCollected: 0,
}

export const useRaceStore = create<RaceState>()((set) => ({
  ...initial,
  startLap: (now) => set({ lap: 1, lapStartTime: now }),
  completeLap: (now) =>
    set((s) => {
      if (s.lapStartTime == null) return s
      const t = now - s.lapStartTime
      return {
        lap: s.lap + 1,
        lapStartTime: now,
        lastLapTime: t,
        bestLapTime: s.bestLapTime == null ? t : Math.min(s.bestLapTime, t),
      }
    }),
  collectCoin: (index) =>
    set((s) => {
      if (s.collectedCoins[index]) return s
      const collectedCoins = s.collectedCoins.with(index, true)
      return { collectedCoins, coinsCollected: s.coinsCollected + 1 }
    }),
  reset: () => set({ ...initial, collectedCoins: trackConfig.coinSlots.map(() => false) }),
}))
