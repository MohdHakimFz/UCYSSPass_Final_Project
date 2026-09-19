import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Keyboard, Platform, ScrollView, TextInput, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native'

/** How far above the keyboard the field being typed in should sit, so it is not jammed against the keys. */
const BREATHING_ROOM = 28

const RevealContext = createContext<() => void>(() => undefined)

/** Fields call this when they gain focus, so a field that is hidden behind the keyboard is scrolled into view. */
export const useRevealFocusedField = () => useContext(RevealContext)

/**
 * A scrolling screen that keeps the field you are typing in visible above the keyboard.
 * Use it for any screen with text fields, instead of a plain ScrollView.
 *
 * Why it exists: on newer phones the app draws under the system bars, so the keyboard covers the bottom of the
 * screen instead of pushing it up, and a plain ScrollView leaves the password field hidden behind the keys.
 * This screen listens for the keyboard, adds room at the bottom so there is something to scroll into,
 * and scrolls the focused field to just above the keyboard. The shared Field component tells it when focus moves
 * from one field to the next.
 */
export default function KeyboardScreen({
  children,
  style,
  contentContainerStyle,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
}) {
  const scroll = useRef<ScrollView>(null)
  const scrollY = useRef(0)
  // Where the top edge of the keyboard is on screen, or null while it is closed.
  const keyboardTop = useRef<number | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const reveal = useCallback(() => {
    // Wait a moment: the field only becomes "the focused one" just after its focus event.
    setTimeout(() => {
      const top = keyboardTop.current
      const field = TextInput.State.currentlyFocusedInput?.()
      if (top === null || !field || !scroll.current) return

      field.measureInWindow((_x, y, _w, height) => {
        const overflow = y + height + BREATHING_ROOM - top
        if (overflow > 0) scroll.current?.scrollTo({ y: scrollY.current + overflow, animated: true })
      })
    }, 80)
  }, [])

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY
      setKeyboardHeight(e.endCoordinates.height)
      reveal()
    })
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = null
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [reveal])

  const value = useMemo(() => reveal, [reveal])

  return (
    <RevealContext.Provider value={value}>
      <ScrollView
        ref={scroll}
        style={style}
        // Extra room at the bottom while the keyboard is open, so the last field can be scrolled above it.
        contentContainerStyle={[contentContainerStyle, keyboardHeight ? { paddingBottom: keyboardHeight + BREATHING_ROOM } : null]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollY.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </RevealContext.Provider>
  )
}
