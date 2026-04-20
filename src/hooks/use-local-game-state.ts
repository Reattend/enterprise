'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Persists game state in localStorage with debounced writes.
 * Initializes from localStorage on mount, falls back to initialState.
 * Returns [state, setState, clear] tuple.
 */
export function useLocalGameState<T>(
  key: string,
  initialState: T
): [T, (s: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialState
    } catch {
      return initialState
    }
  })

  // Debounced write to localStorage (500ms)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state))
      } catch {
        // localStorage full or unavailable — silently ignore
      }
    }, 500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [key, state])

  const clear = useCallback(() => {
    setState(initialState)
    try {
      localStorage.removeItem(key)
    } catch {
      // silently ignore
    }
  }, [key, initialState])

  return [state, setState, clear]
}
