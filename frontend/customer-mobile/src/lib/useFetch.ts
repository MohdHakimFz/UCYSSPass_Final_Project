import { useCallback, useEffect, useState } from 'react'
import { api, errorText } from './api'

export function useFetch<T>(path: string) {
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null } | null>(null)
  const [tick, setTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let live = true
    api<T>(path)
      .then((data) => live && setResult({ path, data, error: null }))
      .catch((e) => live && setResult({ path, data: null, error: errorText(e) }))
      .finally(() => live && setRefreshing(false))
    return () => {
      live = false
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const refresh = useCallback(() => {
    setRefreshing(true)
    setTick((t) => t + 1)
  }, [])

  return { data: result?.data ?? null, error: result?.error ?? null, reload, refresh, refreshing }
}
