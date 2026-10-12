import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Bank, CheckCircle, CreditCard, Wallet } from 'phosphor-react-native'
import { api, ApiError, errorText, type Booking } from '../lib/api'
import { fonts, type Palette } from '../theme'
import { useStyles, useTheme } from '../lib/themeMode'
import { Button, Notice } from './ui'

type Method = 'card' | 'fpx' | 'ewallet'
type Outcome = 'approve' | 'decline' | 'insufficient'

const METHODS: { id: Method; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: 'card', label: 'Card', hint: 'Test card, no real details', icon: CreditCard },
  { id: 'fpx', label: 'Online banking', hint: 'FPX, sandbox', icon: Bank },
  { id: 'ewallet', label: 'E-wallet', hint: 'Sandbox', icon: Wallet },
]

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'approve', label: 'Succeeds' },
  { id: 'decline', label: 'Declined' },
  { id: 'insufficient', label: 'No funds' },
]

const money = (v: string | number) => `RM ${Number(v).toFixed(2)}`

/**
 * Pay for a held seat. The seat is kept for a few minutes, counted down from the server's own clock.
 * A sandbox: no money moves, and the test result can be chosen to show a declined payment.
 */
export default function Checkout({
  booking,
  info,
  onClose,
  onFinished,
}: {
  booking: Booking
  info: { title: string; tier: string; price: string }
  /** Closed without paying: the hold stays until it runs out, so it can be resumed from My passes. */
  onClose: () => void
  /** The booking changed (paid, released or expired). */
  onFinished: () => void
}) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const [left, setLeft] = useState(booking.hold_seconds_left ?? 0)
  const [method, setMethod] = useState<Method>('card')
  const [outcome, setOutcome] = useState<Outcome>('approve')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState<Booking | null>(null)
  const [gone, setGone] = useState<string | null>(null)
  const total = booking.hold_seconds_left && booking.hold_seconds_left > 0 ? booking.hold_seconds_left : 180

  useEffect(() => {
    if (paid || gone) return
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [paid, gone])

  useEffect(() => {
    if (left === 0 && !paid && !gone) {
      setGone('Your hold ran out and the seat is back on sale. Choose it again if it is still free.')
      onFinished()
    }
  }, [left, paid, gone, onFinished])

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const result = await api<Booking>(`/bookings/${booking.id}/pay`, { method: 'POST', body: { method, outcome } })
      setPaid(result)
      onFinished()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setGone(err.message)
        onFinished()
      } else {
        setError(errorText(err))
      }
    } finally {
      setBusy(false)
    }
  }

  async function release() {
    setBusy(true)
    try {
      await api(`/bookings/${booking.id}/cancel`, { method: 'PUT' })
      onFinished()
      onClose()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  const low = left <= 30

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.scrim}>
        <ScrollView style={s.sheet} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {paid ? (
            <>
              <CheckCircle size={52} weight="fill" color={colors.cleared} />
              <Text style={s.h}>Paid. You are in.</Text>
              <Text style={s.sub}>
                {info.title}
                {paid.seat ? `, seat ${paid.seat.label}` : ''}
              </Text>
              {[
                ['Amount', money(paid.payment?.amount ?? info.price)],
                ['Method', METHODS.find((m) => m.id === paid.payment?.method)?.label ?? ''],
                ['Reference', paid.payment?.reference ?? 'Sandbox'],
              ].map(([k, v]) => (
                <View key={k} style={s.receiptRow}>
                  <Text style={s.sub}>{k}</Text>
                  <Text style={s.receiptValue}>{v}</Text>
                </View>
              ))}
              <Button title="Done" variant="dark" onPress={onClose} />
            </>
          ) : gone ? (
            <>
              <Text style={s.h}>Hold ended</Text>
              <Notice tone="warn" text={gone} />
              <Button title="Choose again" variant="dark" onPress={onClose} />
            </>
          ) : (
            <>
              <Text style={s.h}>Complete your booking</Text>
              <Text style={s.sub}>
                {info.title}, {info.tier}
                {booking.seat ? `, seat ${booking.seat.label}` : ''}
              </Text>

              <View style={[s.hold, low && s.holdLow]} accessibilityRole="timer" accessibilityLabel={`Seat held for ${mm} minutes ${ss} seconds`}>
                <Text style={[s.holdTime, low && { color: colors.revoked }]}>
                  {mm}:{ss} <Text style={s.holdLabel}>your seat is held</Text>
                </Text>
                <View style={s.bar}>
                  <View style={[s.barFill, { width: `${Math.min(100, (left / total) * 100)}%`, backgroundColor: low ? colors.revoked : colors.ink }]} />
                </View>
              </View>

              {error && <Notice tone="error" text={error} />}

              <Text style={s.legend}>Pay with</Text>
              {METHODS.map(({ id, label, hint, icon: Icon }) => (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: method === id }}
                  onPress={() => setMethod(id)}
                  style={[s.method, method === id && s.methodOn]}
                >
                  <Icon size={24} weight="bold" color={colors.ink} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.methodName}>{label}</Text>
                    <Text style={s.hint}>{hint}</Text>
                  </View>
                  <View style={[s.radio, method === id && s.radioOn]} />
                </Pressable>
              ))}

              <Text style={s.legend}>Sandbox test result</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {OUTCOMES.map((o) => (
                  <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: outcome === o.id }} onPress={() => setOutcome(o.id)} style={[s.chip, outcome === o.id && s.chipOn]}>
                    <Text style={[s.chipText, outcome === o.id && { color: colors.paper }]}>{o.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.hint}>A sandbox. No real money or card details are used.</Text>

              <Button title={`Pay ${money(info.price)}`} variant="dark" onPress={pay} busy={busy} />
              <Button title="Release the seat" variant="quiet" onPress={release} disabled={busy} />
              <Button title="Close and pay later" variant="quiet" onPress={onClose} disabled={busy} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,16,21,0.6)' },
  sheet: { maxHeight: '92%', backgroundColor: colors.paper, borderTopWidth: 3, borderTopColor: colors.ink },
  body: { padding: 20, gap: 12 },
  h: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 28, letterSpacing: -0.8, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  hold: { padding: 14, gap: 8, backgroundColor: 'rgba(228,98,63,0.12)', borderWidth: 2, borderColor: colors.ink },
  holdLow: { backgroundColor: 'rgba(179,55,47,0.14)' },
  holdTime: { fontFamily: fonts.heavy, fontSize: 38, letterSpacing: -1, color: colors.ink },
  holdLabel: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 0 },
  bar: { height: 6, backgroundColor: 'rgba(20,24,31,0.15)' },
  barFill: { height: '100%' },
  legend: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink, marginTop: 4 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 2, borderColor: colors.line },
  methodOn: { borderColor: colors.ink, backgroundColor: 'rgba(228,98,63,0.1)' },
  methodName: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  radio: { width: 20, height: 20, borderWidth: 2, borderColor: colors.ink, borderRadius: 10 },
  radioOn: { backgroundColor: colors.ink },
  chip: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  receiptValue: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
})
