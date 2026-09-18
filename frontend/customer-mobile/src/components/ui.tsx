import { useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { CheckCircle, Warning, WarningCircle } from 'phosphor-react-native'
import { colors, fonts } from '../theme'
import type { BookingStatus } from '../lib/api'

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  busy,
}: {
  title: string
  onPress: () => void
  variant?: 'primary' | 'quiet' | 'danger'
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.btn,
        variant === 'primary' && s.btnPrimary,
        variant === 'quiet' && s.btnQuiet,
        variant === 'danger' && s.btnDanger,
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8, transform: [{ translateY: 1 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Text style={[s.btnText, variant === 'danger' && { color: colors.revoked }]}>{title}</Text>
      )}
    </Pressable>
  )
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkSoft} selectionColor={colors.badge} style={s.input} autoCapitalize="none" {...props} />
    </View>
  )
}

const TONE: Record<BookingStatus, { dot: string; label: string }> = {
  confirmed: { dot: colors.cleared, label: 'Confirmed' },
  waitlisted: { dot: colors.badge, label: 'Waitlisted' },
  pending: { dot: colors.badge, label: 'Pending' },
  cancelled: { dot: colors.revoked, label: 'Cancelled' },
  attended: { dot: colors.ink, label: 'Checked in' },
}

export function StatusTag({ status }: { status: BookingStatus }) {
  const t = TONE[status]
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 10, height: 10, borderRadius: 0, backgroundColor: t.dot }} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{t.label}</Text>
    </View>
  )
}

function NoticeIcon({ tone }: { tone: 'ok' | 'error' | 'warn' }) {
  const color = tone === 'ok' ? colors.cleared : tone === 'error' ? colors.revoked : colors.held
  const Icon = tone === 'ok' ? CheckCircle : tone === 'error' ? WarningCircle : Warning
  return <Icon size={20} color={color} weight="bold" />
}

export function Notice({ tone, text }: { tone: 'ok' | 'error' | 'warn'; text: string }) {
  const bg = tone === 'ok' ? '#DCEFE8' : tone === 'error' ? '#F3DCDA' : '#F3ECD7'
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 12, backgroundColor: bg, padding: 12, borderRadius: 0, alignItems: 'flex-start' }}>
      <View style={{ marginTop: 1 }}>
        <NoticeIcon tone={tone} />
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.regular, color: colors.ink, fontSize: 15, lineHeight: 21 }}>{text}</Text>
    </View>
  )
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ padding: 24, backgroundColor: colors.paper, borderTopWidth: 3, borderTopColor: colors.ink }}>
      <Text style={{ fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 16 }}>{text}</Text>
    </View>
  )
}

// Placeholder rows while a list loads, so the screen keeps its shape instead of jumping.
export function Skeleton({ rows = 3, height = 84 }: { rows?: number; height?: number }) {
  const pulse = useRef(new Animated.Value(0.55)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <View accessibilityLabel="Loading" style={{ gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={{ height, borderRadius: 0, backgroundColor: '#D5DCE2', opacity: pulse }} />
      ))}
    </View>
  )
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const s = StyleSheet.create({
  btn: { minHeight: 48, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 2, borderColor: colors.ink },
  btnPrimary: { backgroundColor: colors.badge },
  btnQuiet: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  input: {
    minHeight: 48,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
})
