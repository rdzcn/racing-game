import { describe, expect, it } from 'vitest'
import { formatLapTime } from './format'

describe('formatLapTime', () => {
  it('formats minutes, seconds and tenths', () => {
    expect(formatLapTime(83456)).toBe('1:23.4')
    expect(formatLapTime(0)).toBe('0:00.0')
    expect(formatLapTime(9900)).toBe('0:09.9')
    expect(formatLapTime(60000)).toBe('1:00.0')
    expect(formatLapTime(600000)).toBe('10:00.0')
  })
})
