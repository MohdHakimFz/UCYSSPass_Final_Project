import { Pressable, StyleSheet, Switch, Text, View, type TextInputProps } from 'react-native'
import { Field } from './ui'
import { fonts, type Palette } from '../theme'
import { useStyles, useTheme } from '../lib/themeMode'
import type { EventItem } from '../lib/api'

/** The app's Field, with the server's 422 message for this field shown under it in red. */
export function FormField({ error, ...props }: { label: string; hint?: string; error?: string } & TextInputProps) {
  const s = useStyles(makeStyles)
  return (
    <View style={{ gap: 4 }}>
      <Field {...props} />
      {error ? <Text style={s.fieldError} accessibilityRole="alert">{error}</Text> : null}
    </View>
  )
}

/** A field error on its own, for inputs that are not text boxes (pickers, switches). */
export function FieldError({ text }: { text?: string }) {
  const s = useStyles(makeStyles)
  return text ? <Text style={s.fieldError} accessibilityRole="alert">{text}</Text> : null
}

/** A row of square chips where one is chosen: used for category, role, status and venue pickers. */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label?: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  error?: string
}) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.chips} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.8 }]}
            >
              <Text style={[s.chipText, on && { color: colors.paper }]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <FieldError text={error} />
    </View>
  )
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  return (
    <View style={s.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.line }} thumbColor={colors.paper} accessibilityLabel={label} />
    </View>
  )
}

/** Big numbers in a two-column grid, for the organiser summary and the admin overview. */
export function Stats({ items }: { items: { label: string; value: string | number; tone?: 'ok' | 'warn' }[] }) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  return (
    <View style={s.grid}>
      {items.map((it) => (
        <View key={it.label} style={s.tile}>
          <Text style={[s.tileValue, it.tone === 'ok' && { color: colors.cleared }, it.tone === 'warn' && { color: colors.held }]} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
          <Text style={s.tileLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  )
}

export function SectionTitle({ children }: { children: string }) {
  const s = useStyles(makeStyles)
  return <Text style={s.section}>{children}</Text>
}

/** A tappable (or plain) card row in a list. */
export function Row({ onPress, children, label }: { onPress?: () => void; children: React.ReactNode; label?: string }) {
  const s = useStyles(makeStyles)
  if (!onPress) return <View style={s.row}>{children}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  )
}

const EVENT_TONE: Record<EventItem['status'], { label: string; key: 'cleared' | 'held' | 'revoked' | 'inkSoft' }> = {
  published: { label: 'Published', key: 'cleared' },
  draft: { label: 'Draft', key: 'held' },
  cancelled: { label: 'Cancelled', key: 'revoked' },
  completed: { label: 'Completed', key: 'inkSoft' },
}

export function EventStatusTag({ status }: { status: EventItem['status'] }) {
  const { colors } = useTheme()
  const t = EVENT_TONE[status] ?? EVENT_TONE.draft
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 10, height: 10, backgroundColor: colors[t.key] }} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{t.label}</Text>
    </View>
  )
}

export const ROLE_LABEL = { admin: 'Admin', organiser: 'Organiser', customer: 'Customer' } as const

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    fieldError: { fontFamily: fonts.semibold, fontSize: 13, color: colors.revoked },
    label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
    hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
    chipOn: { backgroundColor: colors.ink },
    chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.paper, borderTopWidth: 3, borderTopColor: colors.ink, padding: 12, gap: 2 },
    tileValue: { fontFamily: fonts.heavy, fontSize: 26, color: colors.ink },
    tileLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
    section: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink, marginTop: 8 },
    row: { backgroundColor: colors.paper, padding: 14, gap: 6, borderLeftWidth: 4, borderLeftColor: colors.ink },
  })
