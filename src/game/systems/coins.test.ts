import { describe, expect, it } from 'vitest'
import { trackConfig } from '../config'
import { checkCoinPickup, coinPositions } from './coins'
import { buildTrack } from './trackGeometry'

describe('coinPositions', () => {
  it('places one coin per configured slot, on gate positions', () => {
    const track = buildTrack(trackConfig)
    const coins = coinPositions(track, trackConfig.coinSlots)
    expect(coins).toHaveLength(trackConfig.coinSlots.length)
    coins.forEach((c, i) => {
      const g = track.gates[trackConfig.coinSlots[i]]
      expect(c).toEqual({ x: g.x, z: g.z })
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
