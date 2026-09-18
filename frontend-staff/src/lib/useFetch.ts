import { useEffect, useState } from 'react'
import { api, errorText } from './api'

export function useFetch<T>(path: string | null) {
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null } | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let live = true
    api<T>(path)
      .then((data) => live && setResult({ path, data, error: null }))
      .catch((e) => live && setResult({ path, data: null, error: errorText(e) }))
    return () => {
      live = false
    }
  }, [path, tick])

  return {
    data: result?.data ?? null,
    error: result?.error ?? null,
    reload: () => setTick((t) => t + 1),
  }
}
