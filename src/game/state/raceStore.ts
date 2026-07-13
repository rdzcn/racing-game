import { create } from 'zustand'
import { LAPS_PER_RACE, POINTS_PER_COIN, defaultCarId, defaultTrackId, getTrack } from '../config'

export type GameStatus = 'menu' | 'trackSelect' | 'carSelect' | 'playing' | 'paused' | 'finished'
export type GameMode = 'single' | 'two'

/** Per-player race progress. In single-player mode there's exactly one of
 * these (index 0); in 2-player mode there are two, driven independently by
 * their own gate-crossing/coin-pickup events. */
export interface PlayerRaceState {
  /** null in 2-player mode until that player picks a car on the car-select screen */
  carId: string | null
  /** 0 = not started yet, then 1-based current lap, caps at LAPS_PER_RACE once finished */
  lap: number
  /** performance.now() when the current lap started, null before the race starts */
  lapStartTime: number | null
  /** performance.now() when this player's clock started (first line crossing) */
  raceStartTime: number | null
  /** ms */
  lastLapTime: number | null
  bestLapTime: number | null
  /** true once this player has completed LAPS_PER_RACE laps */
  finished: boolean
  /** total race time (ms) at the moment this player finished */
  finishTime: number | null
  /** coins collected by this player × POINTS_PER_COIN */
  score: number
}

export interface RaceState {
  status: GameStatus
  mode: GameMode
  selectedTrackId: string
  players: PlayerRaceState[]
  /** index of the player who finished first — set the moment anyone crosses
   * the line on the final lap, which ends the race for everyone */
  winnerIndex: number | null
  /** performance.now() when the game was paused — freezes the HUD clock */
  pausedAt: number | null
  /** one flag per coin slot; shared — first car to reach a coin gets it */
  collectedCoins: boolean[]
  coinsCollected: number
  /** bumped on restart — scene components watch it to teleport the car etc. */
  resetCount: number

  setMode: (mode: GameMode) => void
  goToTrackSelect: () => void
  selectTrack: (id: string) => void
  goToCarSelect: () => void
  selectCar: (playerIndex: number, id: string) => void
  backToMenu: () => void
  backToTrackSelect: () => void
  startGame: () => void
  pause: (now: number) => void
  resume: (now: number) => void
  restartRace: () => void
  toMenu: () => void
  startLap: (playerIndex: number, now: number) => void
  completeLap: (playerIndex: number, now: number) => void
  collectCoin: (playerIndex: number, index: number) => void
  reset: () => void
}

const freshPlayer = (carId: string | null): PlayerRaceState => ({
  carId,
  lap: 0,
  lapStartTime: null,
  raceStartTime: null,
  lastLapTime: null,
  bestLapTime: null,
  finished: false,
  finishTime: null,
  score: 0,
})

/** clears race progress but keeps carId + bestLapTime — "beat your best" survives restarts */
const clearedForRestart = (p: PlayerRaceState): PlayerRaceState => ({
  ...freshPlayer(p.carId),
  bestLapTime: p.bestLapTime,
})

const freshCoins = (trackId: string) => getTrack(trackId).coinSlots.map(() => false)

const playersForMode = (mode: GameMode, prev?: PlayerRaceState[]): PlayerRaceState[] =>
  mode === 'single'
    ? [freshPlayer(prev?.[0]?.carId ?? defaultCarId)]
    : // 2-player cars start unselected — only carry choices over if we were
      // already in 2-player mode (single-player's car is not player 1's choice)
      prev?.length === 2
      ? [freshPlayer(prev[0].carId), freshPlayer(prev[1].carId)]
      : [freshPlayer(null), freshPlayer(null)]

export const useRaceStore = create<RaceState>()((set) => ({
  status: 'menu',
  mode: 'single',
  selectedTrackId: defaultTrackId,
  players: playersForMode('single'),
  winnerIndex: null,
  pausedAt: null,
  collectedCoins: freshCoins(defaultTrackId),
  coinsCollected: 0,
  resetCount: 0,

  setMode: (mode) =>
    set((s) => (s.status === 'menu' ? { mode, players: playersForMode(mode, s.players) } : s)),

  // screen flow: menu (1p/2p) -> trackSelect (player 1 picks for everyone,
  // even in 2-player mode) -> carSelect (each player picks their own car,
  // split-screen in 2-player mode) -> playing
  goToTrackSelect: () => set((s) => (s.status === 'menu' ? { status: 'trackSelect' } : s)),

  selectTrack: (id) =>
    set((s) =>
      s.status === 'trackSelect'
        ? {
            selectedTrackId: id,
            collectedCoins: freshCoins(id),
            coinsCollected: 0,
            // best laps aren't comparable across tracks
            players: s.players.map((p) => ({ ...p, bestLapTime: null })),
          }
        : s,
    ),

  goToCarSelect: () => set((s) => (s.status === 'trackSelect' ? { status: 'carSelect' } : s)),

  selectCar: (playerIndex, id) =>
    set((s) => {
      if (s.status !== 'carSelect') return s
      if (!s.players[playerIndex]) return s
      const players = s.players.slice()
      players[playerIndex] = { ...players[playerIndex], carId: id }
      return { players }
    }),

  backToMenu: () => set((s) => (s.status === 'trackSelect' ? { status: 'menu' } : s)),

  backToTrackSelect: () => set((s) => (s.status === 'carSelect' ? { status: 'trackSelect' } : s)),

  startGame: () =>
    set((s) => {
      if (s.status !== 'carSelect') return s
      if (!s.players.every((p) => p.carId != null)) return s
      return {
        players: s.players.map(clearedForRestart),
        collectedCoins: freshCoins(s.selectedTrackId),
        coinsCollected: 0,
        winnerIndex: null,
        status: 'playing',
        resetCount: s.resetCount + 1,
      }
    }),

  pause: (now) => set((s) => (s.status === 'playing' ? { status: 'paused', pausedAt: now } : s)),

  resume: (now) =>
    set((s) => {
      if (s.status !== 'paused') return s
      // shift every player's clock forward by however long we were frozen
      const frozen = now - (s.pausedAt ?? now)
      return {
        status: 'playing',
        pausedAt: null,
        players: s.players.map((p) => ({
          ...p,
          lapStartTime: p.lapStartTime != null ? p.lapStartTime + frozen : null,
          raceStartTime: p.raceStartTime != null ? p.raceStartTime + frozen : null,
        })),
      }
    }),

  restartRace: () =>
    set((s) => ({
      players: s.players.map(clearedForRestart),
      collectedCoins: freshCoins(s.selectedTrackId),
      coinsCollected: 0,
      winnerIndex: null,
      status: 'playing',
      resetCount: s.resetCount + 1,
    })),

  toMenu: () =>
    set((s) => ({
      players: s.players.map(clearedForRestart),
      collectedCoins: freshCoins(s.selectedTrackId),
      coinsCollected: 0,
      winnerIndex: null,
      status: 'menu',
      resetCount: s.resetCount + 1,
    })),

  startLap: (playerIndex, now) =>
    set((s) => {
      const p = s.players[playerIndex]
      if (!p || p.lap !== 0) return s
      const players = s.players.slice()
      players[playerIndex] = { ...p, lap: 1, lapStartTime: now, raceStartTime: now }
      return { players }
    }),

  completeLap: (playerIndex, now) =>
    set((s) => {
      const p = s.players[playerIndex]
      if (!p || p.lapStartTime == null || p.finished) return s
      const t = now - p.lapStartTime
      const bestLapTime = p.bestLapTime == null ? t : Math.min(p.bestLapTime, t)
      const nextLap = p.lap + 1
      const players = s.players.slice()

      if (nextLap > LAPS_PER_RACE) {
        players[playerIndex] = {
          ...p,
          lap: LAPS_PER_RACE,
          lastLapTime: t,
          bestLapTime,
          finished: true,
          finishTime: now - (p.raceStartTime ?? now),
        }
        // first player across the line on the final lap ends the race for everyone
        return { players, status: 'finished', winnerIndex: s.winnerIndex ?? playerIndex }
      }

      players[playerIndex] = { ...p, lap: nextLap, lapStartTime: now, lastLapTime: t, bestLapTime }
      return { players }
    }),

  collectCoin: (playerIndex, index) =>
    set((s) => {
      if (s.collectedCoins[index]) return s
      const collectedCoins = s.collectedCoins.with(index, true)
      const players = s.players.slice()
      const p = players[playerIndex]
      if (p) players[playerIndex] = { ...p, score: p.score + POINTS_PER_COIN }
      return { collectedCoins, coinsCollected: s.coinsCollected + 1, players }
    }),

  reset: () =>
    set({
      status: 'menu',
      mode: 'single',
      selectedTrackId: defaultTrackId,
      players: playersForMode('single'),
      winnerIndex: null,
      pausedAt: null,
      collectedCoins: freshCoins(defaultTrackId),
      coinsCollected: 0,
      resetCount: 0,
    }),
}))
