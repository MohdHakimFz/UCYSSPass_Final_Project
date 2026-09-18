import { useEffect, useState } from 'react'
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { api, CATEGORY_LABEL, errorText, fetchQrDataUri, type Booking, type Paginated } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import { Button, Empty, Notice, StatusTag, formatWhen } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

function QrPass({ bookingId }: { bookingId: number }) {
  const [uri, setUri] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    fetchQrDataUri(bookingId)
      .then((u) => live && setUri(u))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [bookingId])

  if (failed) return <Text style={s.sub}>Couldn&apos;t load the QR code. Try again in a moment.</Text>
  if (!uri) return <Text style={s.sub}>Generating your QR code…</Text>

  return (
    <View style={s.qr}>
      <Image source={{ uri }} style={{ width: 220, height: 220 }} accessibilityLabel={`QR code for booking ${bookingId}`} />
      <Text style={s.sub}>Show this at the door. It&apos;s signed, so an edited screenshot won&apos;t scan.</Text>
    </View>
  )
}

export default function PassesScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()
  const { data, error, reload, refresh, refreshing } = useFetch<Paginated<Booking>>(user ? '/bookings?per_page=50' : '/events?per_page=1')
  const [open, setOpen] = useState<number | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  if (!user) {
    return (
      <View style={s.center}>
        <Text style={s.h1}>Sign in to see your passes.</Text>
        <Text style={s.sub}>Your bookings and QR passes live here.</Text>
        <Button title="Sign in" onPress={() => navigation.navigate('Login')} />
      </View>
    )
  }

  function cancel(b: Booking) {
    Alert.alert('Cancel booking?', `Cancel your ${b.ticket_type?.name} pass? This can't be undone.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setNote(null)
          try {
            await api(`/bookings/${b.id}/cancel`, { method: 'PUT' })
            setNote({ tone: 'ok', text: 'Booking cancelled.' })
            setOpen(null)
            reload()
          } catch (err) {
            setNote({ tone: 'error', text: errorText(err) })
          }
        },
      },
    ])
  }

  const bookings = (data as Paginated<Booking> | null)?.data ?? []

  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      data={bookings}
      keyExtractor={(b) => String(b.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Text style={s.h1}>My passes</Text>
          {note && <Notice tone={note.tone} text={note.text} />}
          {error && <Notice tone="error" text={error} />}
        </View>
      }
      ListEmptyComponent={data ? <Empty text="No passes yet. Browse events and book your first seat." /> : null}
      renderItem={({ item: b }) => {
        const ev = b.ticket_type?.event
        const canShow = !!b.qr_token && (b.status === 'confirmed' || b.status === 'attended')
        const canCancel = b.status === 'pending' || b.status === 'confirmed' || b.status === 'waitlisted'
        const edge = b.status === 'confirmed' ? colors.cleared : b.status === 'cancelled' ? colors.revoked : b.status === 'attended' ? colors.ink : colors.badge
        return (
          <View style={[s.ticket, { borderLeftColor: edge }, b.status === 'cancelled' && { opacity: 0.75 }]}>
            <Text style={s.title}>{ev?.title ?? 'Event'}</Text>
            {ev && (
              <Text style={s.sub}>
                {CATEGORY_LABEL[ev.category]} · {ev.venue?.name ?? 'Venue to be announced'}
              </Text>
            )}
            {ev && <Text style={s.sub}>{formatWhen(ev.start_at)}</Text>}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <StatusTag status={b.status} />
              <Text style={s.sub}>{b.ticket_type?.name}</Text>
            </View>
            {b.status === 'waitlisted' && <Text style={s.sub}>You&apos;re on the waitlist. You&apos;ll be confirmed if a seat opens.</Text>}
            {open === b.id && canShow && <QrPass bookingId={b.id} />}
            {(canShow || canCancel) && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {canShow && <Button title={open === b.id ? 'Hide pass' : 'Show pass'} onPress={() => setOpen(open === b.id ? null : b.id)} />}
                {canCancel && <Button title="Cancel booking" variant="danger" onPress={() => cancel(b)} />}
              </View>
            )}
          </View>
        )
      }}
    />
  )
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.concrete, padding: 24, gap: 14, justifyContent: 'center' },
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  title: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  ticket: { backgroundColor: colors.paper, borderLeftWidth: 8, padding: 16, gap: 4 },
  qr: { alignSelf: 'flex-start', marginTop: 12, padding: 14, backgroundColor: '#fff', gap: 8 },
})
