/** 83456ms → "1:23.4" — kid-readable lap time */
export function formatLapTime(ms: number): string {
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  // truncate, don't round — a clock must never show time that hasn't elapsed
  const seconds = Math.floor((totalSeconds - minutes * 60) * 10) / 10
  const secStr = seconds.toFixed(1).padStart(4, '0')
  return `${minutes}:${secStr}`
}
