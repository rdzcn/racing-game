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

  it('collectCoin counts each coin once', () => {
    store().collectCoin(0)
    store().collectCoin(0) // double pickup same frame — must not double count
    store().collectCoin(2)
    expect(store().coinsCollected).toBe(2)
    expect(store().collectedCoins[0]).toBe(true)
    expect(store().collectedCoins[1]).toBe(false)
    expect(store().collectedCoins[2]).toBe(true)
  })

  it('reset clears everything', () => {
    store().startLap(0)
    store().completeLap(10000)
    store().collectCoin(1)
    store().reset()
    expect(store()).toMatchObject({
      lap: 0,
      lapStartTime: null,
      lastLapTime: null,
      bestLapTime: null,
      coinsCollected: 0,
      status: 'menu',
    })
    expect(store().collectedCoins.every((c) => !c)).toBe(true)
  })

  it('pause freezes and resume shifts the lap clock by the frozen duration', () => {
    store().startGame()
    store().startLap(1000)
    store().pause(5000)
    expect(store().status).toBe('paused')
    expect(store().pausedAt).toBe(5000)
    store().resume(9000) // frozen for 4s
    expect(store().status).toBe('playing')
    expect(store().pausedAt).toBeNull()
    expect(store().lapStartTime).toBe(5000) // 1000 + 4000
    // a lap completed at 15000 took 10s of *driving* time
    store().completeLap(15000)
    expect(store().lastLapTime).toBe(10000)
  })

  it('pause is a no-op outside of playing; resume outside of paused', () => {
    store().pause(100)
    expect(store().status).toBe('menu')
    store().resume(200)
    expect(store().status).toBe('menu')
  })

  it('restartRace clears race data, keeps playing, bumps resetCount', () => {
    store().startGame()
    const count = store().resetCount
    store().startLap(0)
    store().completeLap(20000)
    store().collectCoin(0)
    store().restartRace()
    expect(store()).toMatchObject({
      status: 'playing',
      lap: 0,
      lastLapTime: null,
      coinsCollected: 0,
      resetCount: count + 1,
    })
    // best lap survives restarts — "beat your best" is the whole point
    expect(store().bestLapTime).toBe(20000)
  })
})
