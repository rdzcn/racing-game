/**
 * Seasons are pure palettes + lighting knobs — no geometry changes, which is
 * why switching is instant (the slowroads.io trick). Everything that reads
 * these values re-renders once on change; nothing regenerates.
 */
export type SeasonId = 'summer' | 'spring' | 'autumn' | 'winter'

export interface SeasonConfig {
  id: SeasonId
  label: string
  emoji: string
  /** grass noise texture palette (see Ground.tsx) */
  grass: [string, string, string, string]
  /** multiplied into tree materials (white = untinted) */
  treeTint: string
  fogColor: string
  sunIntensity: number
  ambientIntensity: number
  /** drei <Sky> atmosphere knobs */
  turbidity: number
  rayleigh: number
}

export const seasons: SeasonConfig[] = [
  {
    id: 'summer',
    label: 'Summer',
    emoji: '☀️',
    grass: ['#4d8040', '#478039', '#52854a', '#4a7a3a'],
    treeTint: '#ffffff',
    fogColor: '#cfe0ec',
    sunIntensity: 2,
    ambientIntensity: 0.4,
    turbidity: 6,
    rayleigh: 1.2,
  },
  {
    id: 'spring',
    label: 'Spring',
    emoji: '🌸',
    grass: ['#5b9448', '#63a04f', '#579247', '#6da858'],
    treeTint: '#d8ffd0',
    fogColor: '#dcebf3',
    sunIntensity: 1.8,
    ambientIntensity: 0.5,
    turbidity: 4,
    rayleigh: 0.8,
  },
  {
    id: 'autumn',
    label: 'Autumn',
    emoji: '🍂',
    grass: ['#8a7a3a', '#96803c', '#7d7034', '#a08a44'],
    treeTint: '#ff9c4a',
    fogColor: '#e6d3b3',
    sunIntensity: 1.6,
    ambientIntensity: 0.45,
    turbidity: 8,
    rayleigh: 2.5,
  },
  {
    id: 'winter',
    label: 'Winter',
    emoji: '❄️',
    grass: ['#dfe8ee', '#d3dee6', '#e8f0f5', '#c9d6e0'],
    treeTint: '#e8f2fa',
    fogColor: '#e8eef2',
    sunIntensity: 1.3,
    ambientIntensity: 0.6,
    turbidity: 3,
    rayleigh: 0.5,
  },
]

export function getSeason(id: SeasonId): SeasonConfig {
  return seasons.find((s) => s.id === id) ?? seasons[0]
}
