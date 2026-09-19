import { useEffect, useState } from 'react'
import * as Brightness from 'expo-brightness'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { Alert, FlatList, Image, Linking, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { api, CATEGORY_LABEL, errorText, fetchQrDataUri, type Booking, type Paginated } from '../lib/api'
import { addToCalendar } from '../lib/calendar'
import { loadCache, saveCache } from '../lib/offline'
import { useFetch } from '../lib/useFetch'
import Tilt3D from '../components/fx/Tilt3D'
import Checkout from '../components/Checkout'
import { Button, Empty, Notice, Skeleton, StatusTag, formatWhen } from '../components/ui'
import { fonts, type Palette } from '../theme'
import { useStyles, useTheme } from '../lib/themeMode'

const showable = (b: Booking) => !!b.qr_token && (b.status === 'confirmed' || b.status === 'attended')

// A QR code is fetched once and kept on the phone, so the pass still opens with no signal at the venue.
function QrImage({ bookingId }: { bookingId: number }) {
  const s = useStyles(makeStyles)
  const [uri, setUri] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      const cached = await loadCache<string>(`qr:${bookingId}`)
      if (cached && live) setUri(cached)
      try {
        const fresh = await fetchQrDataUri(bookingId)
        if (live) setUri(fresh)
        void saveCache(`qr:${bookingId}`, fresh)
      } catch {
        if (!cached && live) setFailed(true)
      }
    })()
    return () => {
      live = false
    }
  }, [bookingId])

  if (failed) return <Text style={s.qrNote}>Couldn&apos;t load the QR code. Open this pass once with a connection and it will be saved for offline use.</Text>
  if (!uri) return <View style={s.qrBox} accessibilityLabel="Generating your QR code" />
  return (
    <View style={s.qrBox}>
      <Image source={{ uri }} style={{ width: 240, height: 240 }} accessibilityLabel={`QR code for booking ${bookingId}`} />
    </View>
  )
}

// At the door the pass needs the whole screen and nothing else competing with it.
function PassModal({ booking, onClose, onCalendar }: { booking: Booking; onClose: () => void; onCalendar: () => void }) {
  const s = useStyles(makeStyles)
  const ev = booking.ticket_type?.event

  // While the pass is open: full brightness and no screen timeout, both put back on close.
  useEffect(() => {
    const tag = 'sentrypass-pass'
    void Brightness.setBrightnessAsync(1).catch(() => undefined)
    void activateKeepAwakeAsync(tag).catch(() => undefined)
    return () => {
      void Brightness.restoreSystemBrightnessAsync().catch(() => undefined)
      void deactivateKeepAwake(tag).catch(() => undefined)
    }
  }, [])

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalScrim}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>{ev?.title ?? 'Your pass'}</Text>
          <Text style={s.sub}>
            {booking.ticket_type?.name} pass{ev ? ` · ${formatWhen(ev.start_at)}` : ''}
          </Text>
          {booking.seat && <Text style={s.passSeat}>Seat {booking.seat.label}</Text>}
          <QrImage bookingId={booking.id} />
          <Text style={s.qrNote}>Brightness is turned up and the screen stays on while this pass is open. Hold it steady for the scanner.</Text>
          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            <Button title="Done" onPress={onClose} />
            <Button title="Add to calendar" variant="quiet" onPress={onCalendar} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const PLATFORM: Record<string, string> = { zoom: 'Zoom', meet: 'Google Meet', teams: 'Microsoft Teams', webex: 'Webex', discord: 'Discord', whatsapp: 'WhatsApp', telegram: 'Telegram' }

// "Join on Zoom", or just "Join meeting" for a service we do not know.
const joinLabel = (p: string | null) => (p && PLATFORM[p] ? `Join on ${PLATFORM[p]}` : 'Join meeting')

/** Joins the online meeting: the server gives the link only once the meeting is open, and counts the tap as attending. */
function JoinButton({ booking, onDone, onError }: { booking: Booking; onDone: () => void; onError: (text: string) => void }) {
  const [busy, setBusy] = useState(false)
  const m = booking.meeting
  if (!m) return null

  async function join() {
    setBusy(true)
    try {
      const res = await api<{ meeting_url: string }>(`/bookings/${booking.id}/join`, { method: 'POST' })
      await Linking.openURL(res.meeting_url)
      onDone()
    } catch (err) {
      onError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return m.open ? (
    <Button title={joinLabel(m.platform)} busy={busy} onPress={join} />
  ) : (
    <Button title={`Opens ${formatWhen(m.opens_at)}`} disabled onPress={() => undefined} />
  )
}

export default function PassesScreen() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const { data, error, reload, refresh, refreshing } = useFetch<Paginated<Booking>>('/bookings?per_page=50')
  const [cached, setCached] = useState<Booking[] | null>(null)
  const [shown, setShown] = useState<Booking | null>(null)
  const [paying, setPaying] = useState<Booking | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const live = data?.data ?? null

  // Save the list and every QR code while online, so both are there when the signal isn't.
  useEffect(() => {
    if (!live) return
    void saveCache('bookings', live)
    live.filter(showable).forEach(async (b) => {
      if (await loadCache(`qr:${b.id}`)) return
      try {
        await saveCache(`qr:${b.id}`, await fetchQrDataUri(b.id))
      } catch {
        /* it will be fetched when the pass is opened */
      }
    })
  }, [live])

  // No connection: fall back to the last saved copy.
  useEffect(() => {
    if (error && !live) void loadCache<Booking[]>('bookings').then(setCached)
  }, [error, live])

  function cancel(b: Booking) {
    const ev = b.ticket_type?.event
    const paidAmount = b.payment?.status === 'paid' ? Number(b.payment.amount) : 0
    const early = ev ? new Date(ev.start_at).getTime() - Date.now() > 24 * 3600 * 1000 : false
    const money = paidAmount ? (early ? ` You will be refunded RM ${paidAmount.toFixed(2)}.` : ' It is less than 24 hours away, so it will not be refunded.') : ''
    Alert.alert('Cancel booking?', `Cancel your ${b.ticket_type?.name} pass?${money} This can't be undone.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setNote(null)
          try {
            const res = await api<Booking>(`/bookings/${b.id}/cancel`, { method: 'PUT' })
            setNote({ tone: 'ok', text: res.refund?.refunded ? `Booking cancelled. RM ${Number(res.refund.amount).toFixed(2)} has been refunded.` : 'Booking cancelled.' })
            reload()
          } catch (err) {
            setNote({ tone: 'error', text: errorText(err) })
          }
        },
      },
    ])
  }

  async function calendar(b: Booking) {
    setNote(null)
    try {
      await addToCalendar(b)
      setShown(null)
      setNote({ tone: 'ok', text: 'Added to your calendar.' })
    } catch (err) {
      setShown(null)
      setNote({ tone: 'error', text: err instanceof Error ? err.message : 'Could not add to your calendar.' })
    }
  }

  const offline = !live && !!cached
  const bookings = live ?? cached ?? []

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.concrete }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        data={bookings}
        keyExtractor={(b) => String(b.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Text style={s.h1}>My passes</Text>
            {offline && <Notice tone="warn" text="You're offline. Showing the passes saved on this phone. Cancelling needs a connection." />}
            {note && <Notice tone={note.tone} text={note.text} />}
            {error && !offline && <Notice tone="error" text={error} />}
          </View>
        }
        ListEmptyComponent={live ? <Empty text="No passes yet. Browse events and book your first seat." /> : !error ? <Skeleton rows={3} height={150} /> : null}
        renderItem={({ item: b }) => {
          const ev = b.ticket_type?.event
          const start = ev ? new Date(ev.start_at) : null
          const online = ev?.mode === 'online'
          const canShow = showable(b)
          const holding = b.status === 'pending' && !!b.hold_expires_at
          const canCancel = !offline && (b.status === 'pending' || b.status === 'confirmed' || b.status === 'waitlisted')
          return (
            <Tilt3D max={7} style={[s.ticket, b.status === 'cancelled' && { opacity: 0.7 }]}>
              <View style={s.ticketMain}>
                <Text style={s.title}>{ev?.title ?? 'Event'}</Text>
                {ev && (
                  <Text style={s.sub}>
                    {CATEGORY_LABEL[ev.category]} · {ev.mode === 'online' ? 'Online meeting' : (ev.venue?.name ?? 'Venue to be announced')}
                  </Text>
                )}
                {ev && <Text style={s.sub}>{formatWhen(ev.start_at)}</Text>}
                {b.seat && <Text style={s.seatBadge}>Seat {b.seat.label}</Text>}
                {holding && <Text style={s.note}>Awaiting payment. Your seat is held for a few minutes.</Text>}
                {b.payment?.status === 'paid' && <Text style={s.sub}>Paid RM {Number(b.payment.amount).toFixed(2)}</Text>}
                {b.payment?.status === 'refunded' && <Text style={s.sub}>Refunded RM {Number(b.payment.refunded_amount).toFixed(2)}</Text>}
                {b.status === 'waitlisted' && (
                  <Text style={s.note}>
                    {b.waitlist_position ? `You're number ${b.waitlist_position} in the queue. ` : "You're on the waitlist. "}
                    You&apos;ll be confirmed if a seat opens.
                  </Text>
                )}
                {online && b.meeting && (
                  <Text style={s.note}>{b.meeting.open ? 'The meeting is open. Join from here.' : `The link opens ${formatWhen(b.meeting.opens_at)}.`}</Text>
                )}
                {(canShow || canCancel || (online && !!b.meeting)) && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {holding && <Button title="Pay now" onPress={() => setPaying(b)} />}
                    {online && b.meeting && <JoinButton booking={b} onDone={reload} onError={(text) => setNote({ tone: 'error', text })} />}
                    {canShow && !online && <Button title="Show pass" onPress={() => setShown(b)} />}
                    {canCancel && <Button title="Cancel booking" variant="danger" onPress={() => cancel(b)} />}
                  </View>
                )}
              </View>

              <View style={s.tear}>
                <View style={[s.notch, { left: -10 }]} />
                <View style={s.tearLine} />
                <View style={[s.notch, { right: -10 }]} />
              </View>

              <View style={s.ticketStub}>
                {start && (
                  <Text style={s.stubDate}>
                    {start.getDate()} {start.toLocaleString('en-MY', { month: 'short' })}
                  </Text>
                )}
                <StatusTag status={b.status} />
                <Text style={s.sub}>{b.ticket_type?.name}</Text>
              </View>
            </Tilt3D>
          )
        }}
      />
      {shown && <PassModal booking={shown} onClose={() => setShown(null)} onCalendar={() => calendar(shown)} />}
      {paying && (
        <Checkout
          key={paying.id}
          booking={paying}
          info={{ title: paying.ticket_type?.event?.title ?? 'Your booking', tier: paying.ticket_type?.name ?? '', price: paying.ticket_type?.price ?? '0' }}
          onClose={() => setPaying(null)}
          onFinished={reload}
        />
      )}
    </>
  )
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  passSeat: { fontFamily: fonts.heavy, fontSize: 30, letterSpacing: -1, color: colors.ink },
  seatBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, fontFamily: fonts.heavy, fontSize: 14, color: colors.onAccent, backgroundColor: colors.accent, overflow: 'hidden' },
  center: { flex: 1, backgroundColor: colors.concrete, padding: 24, gap: 14, justifyContent: 'center' },
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  title: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  note: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, marginTop: 6 },
  ticket: { backgroundColor: colors.paper, borderRadius: 0 },
  ticketMain: { padding: 18, gap: 4 },
  tear: { height: 20, justifyContent: 'center' },
  tearLine: { marginHorizontal: 14, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.tearLine },
  notch: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 0, backgroundColor: colors.concrete },
  ticketStub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 2, flexWrap: 'wrap' },
  stubDate: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink },
  modalScrim: { flex: 1, backgroundColor: 'rgba(18,38,58,0.78)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: colors.paper, borderRadius: 0, padding: 22, gap: 12, alignItems: 'center' },
  modalTitle: { fontFamily: fonts.heavy, fontSize: 22, color: colors.ink, textAlign: 'center' },
  qrBox: { width: 264, height: 264, padding: 12, backgroundColor: '#fff', borderRadius: 0, alignItems: 'center', justifyContent: 'center' },
  qrNote: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
})
