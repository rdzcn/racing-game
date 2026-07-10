import { useEffect, useState } from 'react'
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

export function HUD() {
  const lap = useRaceStore((s) => s.lap)
  const lapStartTime = useRaceStore((s) => s.lapStartTime)
  const pausedAt = useRaceStore((s) => s.pausedAt)
  const lastLapTime = useRaceStore((s) => s.lastLapTime)
  const bestLapTime = useRaceStore((s) => s.bestLapTime)
  const coinsCollected = useRaceStore((s) => s.coinsCollected)
  const totalCoins = useRaceStore((s) => s.collectedCoins.length)
  const status = useRaceStore((s) => s.status)
  // ticks at 10Hz while playing — drives both the lap clock and the speedo refresh
  const now = useNow(status === 'playing')
  // while paused the clock freezes at the pause moment
  const elapsed = lapStartTime != null ? Math.max(0, (pausedAt ?? now) - lapStartTime) : null
  const speed = Math.round(telemetry.speedKmh)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 font-mono text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]">
      <div>
        <div className="text-3xl font-bold">
          {lap > 0 ? `Lap ${lap}` : 'Cross the line to start!'}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xl font-bold text-amber-300">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-amber-500 bg-amber-300" />
          <span className="tabular-nums">
            {coinsCollected} / {totalCoins}
          </span>
          {coinsCollected === totalCoins && <span className="text-white">All coins! ⭐</span>}
        </div>
      </div>
      <div className="text-right">
        <div className="text-3xl font-bold tabular-nums">
          {elapsed != null ? formatLapTime(elapsed) : '–:––.–'}
        </div>
        <div className="mt-1 text-sm tabular-nums opacity-80">
          {lastLapTime != null && <div>Last {formatLapTime(lastLapTime)}</div>}
          {bestLapTime != null && <div>Best {formatLapTime(bestLapTime)}</div>}
        </div>
      </div>

      {/* speedometer — fixed so it anchors to the viewport, not the top bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex flex-col items-center">
        <div className="text-5xl font-black tabular-nums">{speed}</div>
        <div className="text-sm font-bold uppercase tracking-widest opacity-80">km/h</div>
      </div>
    </div>
  )
}
