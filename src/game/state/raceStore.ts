import { create } from 'zustand'
import { trackConfig } from '../config'

export type GameStatus = 'menu' | 'playing' | 'paused'

/**
 * Discrete race/game state — updated on events (lap complete, pause), never
 * per-frame. The ticking lap clock is derived in the HUD from lapStartTime.
 */
export interface RaceState {
  status: GameStatus
  /** 0 = not started yet, then 1-based current lap */
  lap: number
  /** performance.now() when the current lap started, null before the race starts */
  lapStartTime: number | null
  /** performance.now() when the game was paused — freezes the HUD clock */
  pausedAt: number | null
  /** ms */
  lastLapTime: number | null
  bestLapTime: number | null
  /** one flag per coin slot; count derived once on change */
  collectedCoins: boolean[]
  coinsCollected: number
  /** bumped on restart — scene components watch it to teleport the car etc. */
  resetCount: number
  startGame: () => void
  pause: (now: number) => void
  resume: (now: number) => void
  restartRace: () => void
  toMenu: () => void
  startLap: (now: number) => void
  completeLap: (now: number) => void
  collectCoin: (index: number) => void
  reset: () => void
}

const initialRace = {
  lap: 0,
  lapStartTime: null,
  pausedAt: null,
  lastLapTime: null,
  bestLapTime: null,
  coinsCollected: 0,
}

const freshCoins = () => trackConfig.coinSlots.map(() => false)

export const useRaceStore = create<RaceState>()((set) => ({
  status: 'menu',
  ...initialRace,
  collectedCoins: freshCoins(),
  resetCount: 0,

  startGame: () =>
    set((s) => ({
      ...initialRace,
      collectedCoins: freshCoins(),
      status: 'playing',
      resetCount: s.resetCount + 1,
    })),
  pause: (now) =>
    set((s) => (s.status === 'playing' ? { status: 'paused', pausedAt: now } : s)),
  resume: (now) =>
    set((s) => {
      if (s.status !== 'paused') return s
      return {
        status: 'playing',
        pausedAt: null,
        // shift the lap clock forward by however long we were frozen
        lapStartTime:
          s.lapStartTime != null ? s.lapStartTime + (now - (s.pausedAt ?? now)) : null,
      }
    }),
  restartRace: () =>
    set((s) => ({
      ...initialRace,
      bestLapTime: s.bestLapTime, // "beat your best" survives a restart
      collectedCoins: freshCoins(),
      status: 'playing',
      resetCount: s.resetCount + 1,
    })),
  toMenu: () =>
    set((s) => ({
      ...initialRace,
      collectedCoins: freshCoins(),
      status: 'menu',
      resetCount: s.resetCount + 1,
    })),

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
  reset: () =>
    set({ ...initialRace, collectedCoins: freshCoins(), status: 'menu', resetCount: 0 }),
}))
