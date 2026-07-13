import { useEffect, useState } from 'react'
import { LAPS_PER_RACE, getTrack } from '../game/config'
import { useRaceStore } from '../game/state/raceStore'
import { telemetry } from '../game/state/telemetry'
import { formatLapTime } from './format'

/** 10Hz clock — plenty for a 0.1s display, keeps re-renders off the hot path. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [active])

  return now
}

/** One player's HUD panel — overlays that player's half of the screen in
 * 2-player mode, or the full screen in single-player. */
export function HUD({ playerIndex = 0, label }: { playerIndex?: 0 | 1; label?: string }) {
  const player = useRaceStore((s) => s.players[playerIndex])
  const pausedAt = useRaceStore((s) => s.pausedAt)
  const coinsCollected = useRaceStore((s) => s.coinsCollected)
  const totalCoins = useRaceStore((s) => s.collectedCoins.length)
  const status = useRaceStore((s) => s.status)
  const endless = getTrack(useRaceStore((s) => s.selectedTrackId)).source.kind === 'endless'
  // ticks at 10Hz while playing — drives both the lap clock and the speedo refresh
  const now = useNow(status === 'playing')
  // while paused the clock freezes at the pause moment
  const elapsed =
    player.lapStartTime != null ? Math.max(0, (pausedAt ?? now) - player.lapStartTime) : null
  const speed = Math.round(telemetry[playerIndex].speedKmh)

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-4 font-mono text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]">
      <div>
        {label && <div className="mb-1 text-lg font-black text-sky-300">{label}</div>}
        <div className="text-3xl font-bold">
          {endless
            ? `🛣️ ${telemetry[playerIndex].distanceKm.toFixed(1)} km`
            : player.lap > 0
              ? `Lap ${player.lap} / ${LAPS_PER_RACE}`
              : 'Cross the line to start!'}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xl font-bold text-amber-300">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-amber-500 bg-amber-300" />
          {!endless && (
            <span className="tabular-nums">
              {coinsCollected} / {totalCoins}
            </span>
          )}
          <span className="text-white">{endless ? `${player.score} pts` : `· ${player.score} pts`}</span>
        </div>
      </div>
      {!endless && (
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">
            {elapsed != null ? formatLapTime(elapsed) : '–:––.–'}
          </div>
          <div className="mt-1 text-sm tabular-nums opacity-80">
            {player.lastLapTime != null && <div>Last {formatLapTime(player.lastLapTime)}</div>}
            {player.bestLapTime != null && <div>Best {formatLapTime(player.bestLapTime)}</div>}
          </div>
        </div>
      )}

      {/* speedometer — anchored to this panel, not the viewport, so it stays
          in the right half when split-screen */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center">
        <div className="text-4xl font-black tabular-nums">{speed}</div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-80">km/h</div>
      </div>
    </div>
  )
}
