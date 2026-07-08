import '@testing-library/jest-dom/vitest'
import ResizeObserverPolyfill from 'resize-observer-polyfill'

globalThis.ResizeObserver ??= ResizeObserverPolyfill
