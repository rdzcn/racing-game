import { beforeEach, describe, expect, it } from 'vitest'
import { LAPS_PER_RACE } from '../config'
import { useRaceStore } from './raceStore'

const store = () => useRaceStore.getState()
const p = (i = 0) => store().players[i]

describe('raceStore — single player', () => {
  beforeEach(() => store().reset())

  it('startLap begins lap 1 with a running clock', () => {
    store().startLap(0, 1000)
    expect(p().lap).toBe(1)
    expect(p().lapStartTime).toBe(1000)
    expect(p().lastLapTime).toBeNull()
  })

  it('completeLap records last and best times and starts the next lap', () => {
    store().startLap(0, 1000)
    store().completeLap(0, 31000) // 30s lap
    expect(p().lap).toBe(2)
    expect(p().lastLapTime).toBe(30000)
    expect(p().bestLapTime).toBe(30000)
    expect(p().lapStartTime).toBe(31000)

    store().completeLap(0, 56000) // 25s lap — new best
    expect(p().bestLapTime).toBe(25000)
    expect(p().lap).toBe(3)
  })

  it('completeLap before start is a no-op', () => {
    store().completeLap(0, 5000)
    expect(p().lap).toBe(0)
    expect(p().lastLapTime).toBeNull()
  })

  it('finishes the race after LAPS_PER_RACE laps and shows the winner', () => {
    store().goToTrackSelect()
    store().goToCarSelect()
    store().startGame()
    store().startLap(0, 0)
    for (let lap = 1; lap < LAPS_PER_RACE; lap++) store().completeLap(0, lap * 10000)
    expect(store().status).toBe('playing')
    store().completeLap(0, LAPS_PER_RACE * 10000) // final lap
    expect(p().finished).toBe(true)
    expect(p().lap).toBe(LAPS_PER_RACE)
    expect(p().finishTime).toBe(LAPS_PER_RACE * 10000)
    expect(store().status).toBe('finished')
    expect(store().winnerIndex).toBe(0)
  })

  it('collectCoin counts each coin once and scores points for the player who grabbed it', () => {
    store().collectCoin(0, 0)
    store().collectCoin(0, 0) // double pickup same frame — must not double count
    store().collectCoin(0, 2)
    expect(store().coinsCollected).toBe(2)
    expect(store().collectedCoins[0]).toBe(true)
    expect(store().collectedCoins[1]).toBe(false)
    expect(store().collectedCoins[2]).toBe(true)
    expect(p().score).toBe(20)
  })

  it('reset clears everything', () => {
    store().startLap(0, 0)
    store().completeLap(0, 10000)
    store().collectCoin(0, 1)
    store().reset()
    expect(store().status).toBe('menu')
    expect(store().mode).toBe('single')
    expect(store().coinsCollected).toBe(0)
    expect(p()).toMatchObject({ lap: 0, lapStartTime: null, lastLapTime: null, bestLapTime: null })
    expect(store().collectedCoins.every((c) => !c)).toBe(true)
  })

  it('pause freezes and resume shifts the lap clock by the frozen duration', () => {
    store().goToTrackSelect()
    store().goToCarSelect()
    store().startGame()
    store().startLap(0, 1000)
    store().pause(5000)
    expect(store().status).toBe('paused')
    expect(store().pausedAt).toBe(5000)
    store().resume(9000) // frozen for 4s
    expect(store().status).toBe('playing')
    expect(store().pausedAt).toBeNull()
    expect(p().lapStartTime).toBe(5000) // 1000 + 4000
    // a lap completed at 15000 took 10s of *driving* time
    store().completeLap(0, 15000)
    expect(p().lastLapTime).toBe(10000)
  })

  it('pause is a no-op outside of playing; resume outside of paused', () => {
    store().pause(100)
    expect(store().status).toBe('menu')
    store().resume(200)
    expect(store().status).toBe('menu')
  })

  it('restartRace clears race data, keeps playing, bumps resetCount', () => {
    store().goToTrackSelect()
    store().goToCarSelect()
    store().startGame()
    const count = store().resetCount
    store().startLap(0, 0)
    store().completeLap(0, 20000)
    store().collectCoin(0, 0)
    store().restartRace()
    expect(store().status).toBe('playing')
    expect(store().resetCount).toBe(count + 1)
    expect(p()).toMatchObject({ lap: 0, lastLapTime: null, score: 0 })
    expect(store().coinsCollected).toBe(0)
    // best lap survives restarts — "beat your best" is the whole point
    expect(p().bestLapTime).toBe(20000)
  })
})

describe('raceStore — two player', () => {
  beforeEach(() => {
    store().reset()
    store().setMode('two')
  })

  it('starts with two players, cars unselected', () => {
    expect(store().players).toHaveLength(2)
    expect(p(0).carId).toBeNull()
    expect(p(1).carId).toBeNull()
  })

  it('goToCarSelect only works once trackSelect has been reached', () => {
    store().goToCarSelect() // too early — still on the mode-select menu
    expect(store().status).toBe('menu')
    store().goToTrackSelect()
    store().goToCarSelect()
    expect(store().status).toBe('carSelect')
  })

  it('startGame is blocked until both players have chosen a car', () => {
    store().goToTrackSelect()
    store().goToCarSelect()
    store().selectCar(0, 'race')
    store().startGame()
    expect(store().status).toBe('carSelect') // p2 still hasn't chosen

    store().selectCar(1, 'kart')
    store().startGame()
    expect(store().status).toBe('playing')
  })

  it('tracks each player independently and ends the race when the first finishes', () => {
    store().goToTrackSelect()
    store().goToCarSelect()
    store().selectCar(0, 'race')
    store().selectCar(1, 'kart')
    store().startGame()

    store().startLap(0, 0)
    store().startLap(1, 0)
    for (let lap = 1; lap <= LAPS_PER_RACE; lap++) store().completeLap(0, lap * 10000)

    expect(p(0).finished).toBe(true)
    expect(p(1).finished).toBe(false)
    expect(store().status).toBe('finished')
    expect(store().winnerIndex).toBe(0)

    // a lap completed by p2 after the race already ended shouldn't flip the winner
    store().completeLap(1, 5000)
    expect(store().winnerIndex).toBe(0)
  })

  it('shared coins award points only to the player whose car reached them', () => {
    store().goToTrackSelect()
    store().goToCarSelect()
    store().selectCar(0, 'race')
    store().selectCar(1, 'kart')
    store().startGame()

    store().collectCoin(0, 0)
    store().collectCoin(1, 1)
    expect(p(0).score).toBe(10)
    expect(p(1).score).toBe(10)
    expect(store().coinsCollected).toBe(2)

    // already-collected coin is a no-op even for the other player
    store().collectCoin(1, 0)
    expect(p(1).score).toBe(10)
  })
})
