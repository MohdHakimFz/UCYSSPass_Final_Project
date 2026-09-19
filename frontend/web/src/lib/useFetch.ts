import { useEffect, useState } from 'react'
import { api, ApiError, errorText } from './api'

/** How often screens quietly re-ask the server, so everyone sees the same numbers within a few seconds. */
export const LIVE_MS = 5000

/** A counter that goes up every few seconds while the tab is visible, and right away when the tab comes back. */
export function useLiveTick(every = LIVE_MS) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!every) return
    const bump = () => document.visibilityState === 'visible' && setTick((t) => t + 1)
    const timer = setInterval(bump, every)
    document.addEventListener('visibilitychange', bump)
    window.addEventListener('focus', bump)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', bump)
      window.removeEventListener('focus', bump)
    }
  }, [every])

  return tick
}

/**
 * Loads a path, and keeps it fresh: it asks again every `every` ms without blanking the screen.
 * Pass `every: 0` for a form's own source data, which should not change under the person typing.
 */
export function useFetch<T>(path: string | null, { every = LIVE_MS }: { every?: number } = {}) {
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null; raw: string } | null>(null)
  const [manual, setManual] = useState(0)
  const live = useLiveTick(path ? every : 0)

  useEffect(() => {
    if (!path) return
    let current = true
    api<T>(path)
      .then((data) => {
        if (!current) return
        const raw = JSON.stringify(data)
        // Same answer as before: keep the old object so nothing re-renders.
        setResult((prev) => (prev && prev.path === path && prev.raw === raw && !prev.error ? prev : { path, data, error: null, raw }))
      })
      .catch((e) => {
        if (!current) return
        // A hiccup in a background refresh keeps what is on screen, but "gone" or "not yours any more" replaces it.
        const gone = e instanceof ApiError && [401, 403, 404].includes(e.status)
        setResult((prev) => (prev && prev.path === path && prev.data && !gone ? prev : { path, data: null, error: errorText(e), raw: '' }))
      })
    return () => {
      current = false
    }
  }, [path, manual, live])

  return {
    data: result?.data ?? null,
    error: result?.error ?? null,
    reload: () => setManual((t) => t + 1),
  }
}
