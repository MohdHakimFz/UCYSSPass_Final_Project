import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Question, WarningCircle } from 'phosphor-react-native'
import { Button } from './ui'
import { fonts, type Palette } from '../theme'
import { useStyles, useTheme } from '../lib/themeMode'

export type ConfirmOptions = {
  title: string
  message: string
  /** The button that goes ahead, e.g. "Cancel booking". */
  confirmLabel: string
  /** The button that backs out. */
  cancelLabel?: string
  /** "danger" for things that cannot be undone: red accent and a red button. */
  tone?: 'danger' | 'default'
  onConfirm: () => void
}

// The one dialog on screen. ConfirmHost (mounted once in App.tsx) registers itself here, so any screen can ask.
let show: ((o: ConfirmOptions) => void) | null = null

/** Ask the user to confirm, in the app's own style instead of the grey system alert. Works on the web build too. */
export function askConfirm(o: ConfirmOptions) {
  if (show) show(o)
  else o.onConfirm()
}

export function ConfirmHost() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const [ask, setAsk] = useState<ConfirmOptions | null>(null)
  const pop = useRef(new Animated.Value(0)).current

  useEffect(() => {
    show = setAsk
    return () => {
      show = null
    }
  }, [])

  useEffect(() => {
    if (!ask) return
    pop.setValue(0)
    Animated.timing(pop, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [ask, pop])

  const danger = ask?.tone !== 'default'
  const close = () => setAsk(null)
  const go = () => {
    const action = ask?.onConfirm
    setAsk(null)
    action?.()
  }

  return (
    <Modal visible={!!ask} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      {/* Tapping outside the card backs out, like the Android back button. */}
      <Pressable style={s.scrim} onPress={close} accessibilityLabel="Close">
        <Animated.View
          style={[s.card, danger && { borderTopColor: colors.revoked }, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}
          onStartShouldSetResponder={() => true}
          accessibilityRole="alert"
        >
          <View style={[s.icon, { backgroundColor: danger ? colors.errorBg : colors.warnBg }]}>
            {danger ? <WarningCircle size={28} color={colors.revoked} weight="bold" /> : <Question size={28} color={colors.held} weight="bold" />}
          </View>
          <Text style={s.title}>{ask?.title}</Text>
          <Text style={s.message}>{ask?.message}</Text>
          <View style={s.buttons}>
            <Button title={ask?.confirmLabel ?? 'OK'} variant={danger ? 'destructive' : 'dark'} onPress={go} />
            <Button title={ask?.cancelLabel ?? 'Keep it'} variant="quiet" onPress={close} />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(8, 10, 14, 0.62)', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.paper, padding: 24, gap: 12, borderTopWidth: 4, borderTopColor: colors.ink },
    icon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    title: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 28, color: colors.ink },
    message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.inkSoft },
    buttons: { gap: 10, marginTop: 8 },
  })
