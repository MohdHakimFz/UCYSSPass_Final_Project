import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { api, ApiError, errorText } from './api'

/** How often screens quietly ask the server again, so a new or changed event shows up without pulling to refresh. */
const LIVE_MS = 5000

/** A counter that goes up every few seconds while the app is on screen, and straight away when it comes back. */
export function useLiveTick(every: number) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!every) return
    const bump = () => AppState.currentState === 'active' && setTick((t) => t + 1)
    const timer = setInterval(bump, every)
    const sub = AppState.addEventListener('change', (state) => state === 'active' && bump())
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [every])

  return tick
}

/** `describe` turns an error into the text shown on screen; customer screens keep the default (errorText). */
export function useFetch<T>(path: string, { every = LIVE_MS, describe = errorText }: { every?: number; describe?: (err: unknown) => string } = {}) {
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null; raw: string } | null>(null)
  const [manual, setManual] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  // Only the screen in front keeps asking. A screen behind another one, or in a tab you are not on, stays quiet,
  // so the phone isn't downloading and comparing every list every few seconds.
  const focused = useIsFocused()
  const live = useLiveTick(focused ? every : 0)

  // Coming back to a screen (closing a form, switching tabs) loads it again straight away.
  const seenFocus = useRef(focused)
  useEffect(() => {
    if (focused && !seenFocus.current) setManual((t) => t + 1)
    seenFocus.current = focused
  }, [focused])

  useEffect(() => {
    let current = true
    api<T>(path)
      .then((data) => {
        if (!current) return
        const raw = JSON.stringify(data)
        // The same answer as before keeps the old object, so nothing redraws.
        setResult((prev) => (prev && prev.path === path && prev.raw === raw && !prev.error ? prev : { path, data, error: null, raw }))
      })
      .catch((e) => {
        if (!current) return
        // A dropped connection in a background refresh keeps what is on screen; "gone" or "not yours" replaces it.
        const gone = e instanceof ApiError && [401, 403, 404].includes(e.status)
        setResult((prev) => (prev && prev.path === path && prev.data && !gone ? prev : { path, data: null, error: describe(e), raw: '' }))
      })
      .finally(() => current && setRefreshing(false))
    return () => {
      current = false
    }
  }, [path, manual, live])

  const reload = useCallback(() => setManual((t) => t + 1), [])
  const refresh = useCallback(() => {
    setRefreshing(true)
    setManual((t) => t + 1)
  }, [])

  return { data: result?.data ?? null, error: result?.error ?? null, reload, refresh, refreshing }
}
