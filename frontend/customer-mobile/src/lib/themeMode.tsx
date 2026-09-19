import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { darkColors, lightColors, type Palette } from '../theme'

export type ThemeMode = 'system' | 'light' | 'dark'

const KEY = 'ucyss-theme'

type ThemeState = { mode: ThemeMode; setMode: (mode: ThemeMode) => void; colors: Palette; isDark: boolean }

const ThemeContext = createContext<ThemeState>({ mode: 'system', setMode: () => {}, colors: lightColors, isDark: false })

/** Light, dark, or follow the phone. The choice is remembered on this phone only. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const device = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') setModeState(saved)
      })
      .catch(() => {})
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    const saving = next === 'system' ? AsyncStorage.removeItem(KEY) : AsyncStorage.setItem(KEY, next)
    saving.catch(() => {})
  }, [])

  const isDark = mode === 'system' ? device === 'dark' : mode === 'dark'
  const value = useMemo(() => ({ mode, setMode, isDark, colors: isDark ? darkColors : lightColors }), [mode, setMode, isDark])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

/** Styles built from the current colours, rebuilt only when the theme changes. */
export function useStyles<T>(make: (colors: Palette) => T): T {
  const { colors } = useTheme()
  // `make` is a module-level function, so it never changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => make(colors), [colors])
}
