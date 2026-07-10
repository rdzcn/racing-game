import { describe, expect, it } from 'vitest'
import { getTrack } from '../config'
import { checkCoinPickup, coinPositions } from './coins'
import { buildTrack } from './trackGeometry'

const meadow = getTrack('meadow')

describe('coinPositions', () => {
  it('places one coin per configured slot, on gate positions', () => {
    const track = buildTrack(meadow)
    const coins = coinPositions(track, meadow.coinSlots)
    expect(coins).toHaveLength(meadow.coinSlots.length)
    coins.forEach((c, i) => {
      const g = track.gates[meadow.coinSlots[i]]
      expect(c).toEqual({ x: g.x, y: g.y, z: g.z })
    })
  })
})

describe('checkCoinPickup', () => {
  const positions = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
  ]

  it('returns the index of an uncollected coin in range', () => {
    expect(checkCoinPickup(positions, [false, false], 1, 1, 2.5)).toBe(0)
    expect(checkCoinPickup(positions, [false, false], 9, 0, 2.5)).toBe(1)
  })

  it('ignores collected coins and out-of-range positions', () => {
    expect(checkCoinPickup(positions, [true, false], 0, 0, 2.5)).toBe(-1)
    expect(checkCoinPickup(positions, [false, false], 5, 0, 2.5)).toBe(-1)
  })
})
