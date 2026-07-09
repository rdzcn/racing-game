import { beforeEach, describe, expect, it } from 'vitest'
import { useRaceStore } from './raceStore'

const store = () => useRaceStore.getState()

describe('raceStore', () => {
  beforeEach(() => store().reset())

  it('startLap begins lap 1 with a running clock', () => {
    store().startLap(1000)
    expect(store().lap).toBe(1)
    expect(store().lapStartTime).toBe(1000)
    expect(store().lastLapTime).toBeNull()
  })

  it('completeLap records last and best times and starts the next lap', () => {
    store().startLap(1000)
    store().completeLap(31000) // 30s lap
    expect(store().lap).toBe(2)
    expect(store().lastLapTime).toBe(30000)
    expect(store().bestLapTime).toBe(30000)
    expect(store().lapStartTime).toBe(31000)

    store().completeLap(56000) // 25s lap — new best
    expect(store().bestLapTime).toBe(25000)
    store().completeLap(96000) // 40s lap — best unchanged
    expect(store().bestLapTime).toBe(25000)
    expect(store().lastLapTime).toBe(40000)
    expect(store().lap).toBe(4)
  })

  it('completeLap before start is a no-op', () => {
    store().completeLap(5000)
    expect(store().lap).toBe(0)
    expect(store().lastLapTime).toBeNull()
  })

  it('reset clears everything', () => {
    store().startLap(0)
    store().completeLap(10000)
    store().reset()
    expect(store()).toMatchObject({
      lap: 0,
      lapStartTime: null,
      lastLapTime: null,
      bestLapTime: null,
    })
  })
})
