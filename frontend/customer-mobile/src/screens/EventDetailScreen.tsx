import { useEffect, useState } from 'react'
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api, ApiError, CATEGORY_LABEL, errorText, type Booking, type EventItem, type SeatInfo, type TicketType } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import SeatMap3D from '../components/fx/SeatMap3D'
import { Button, Empty, Notice, Skeleton, formatWhen } from '../components/ui'
import { PosterArt, POSTER } from '../components/PosterArt'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

export default function EventDetailScreen({ route }: NativeStackScreenProps<RootParamList, 'EventDetail'>) {
  const { id } = route.params
  const { data: event, error, reload } = useFetch<EventItem>(`/events/${id}`)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [seats, setSeats] = useState<Record<string, SeatInfo[]>>({})
  const [seatPick, setSeatPick] = useState<{ tierId: number; seat: SeatInfo } | null>(null)
  const [seatsKey, setSeatsKey] = useState(0)

  // Numbered seats: load every tier's seats so the room shows the real thing.
  const seated = !!event?.seated
  const tierIds = (event?.ticket_types ?? []).map((t) => t.id).join(',')
  useEffect(() => {
    if (!seated || !tierIds) return
    let live = true
    Promise.all(tierIds.split(',').map((tid) => api<SeatInfo[]>(`/ticket-types/${tid}/seats`).then((rows) => [tid, rows] as const)))
      .then((pairs) => live && setSeats(Object.fromEntries(pairs)))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [seated, tierIds, seatsKey])
  const [note, setNote] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null)

  async function book(t: TicketType) {
    setBusyId(t.id)
    setNote(null)
    try {
      const wantsSeat = seated && seatPick?.tierId === t.id && t.seats_remaining > 0
      const b = await api<Booking>('/bookings', { method: 'POST', body: { ticket_type_id: t.id, ...(wantsSeat ? { seat_id: seatPick!.seat.id } : {}) } })
      setSeatPick(null)
      setSeatsKey((k) => k + 1)
      setNote(
        b.status === 'confirmed'
          ? { tone: 'ok', text: b.seat ? `You're in. Seat ${b.seat.label} is yours, and the pass is waiting in My passes.` : `You're in. Your ${t.name} pass is confirmed and waiting in My passes.` }
          : { tone: 'warn', text: `${t.name} is sold out, so you're on the waitlist. If a seat opens you'll be confirmed automatically.` },
      )
      reload()
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      if (status === 409 || status === 422) {
        // Someone may have taken the seat first: show the room as it is now so the person can choose again.
        setSeatPick(null)
        setSeatsKey((k) => k + 1)
      }
      setNote({
        tone: 'error',
        text: status === 429 ? 'Too many booking attempts. Wait a minute and try again.' : status === 403 ? 'Only customer accounts can book seats.' : errorText(err),
      })
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <View style={s.pad}><Notice tone="error" text={error} /></View>
  if (!event) return <View style={s.pad}><Skeleton rows={3} height={90} /></View>

  const bookable = event.status === 'published'

  return (
    <ScrollView style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad}>
      <View style={s.hero}>
        <PosterArt category={event.category} />
        <Text style={[s.heroDay, { color: POSTER[event.category].ink }]}>{new Date(event.start_at).getDate()}</Text>
        <Text style={[s.heroMonth, { color: POSTER[event.category].ink }]}>
          {new Date(event.start_at).toLocaleString('en-MY', { month: 'long', year: 'numeric' }).toUpperCase()}
        </Text>
      </View>
      <Text style={s.h1}>{event.title}</Text>
      <Text style={s.sub}>
        {CATEGORY_LABEL[event.category]}, {formatWhen(event.start_at)}, {event.venue?.name ?? 'Venue to be announced'}
      </Text>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button
          title="Share this event"
          variant="quiet"
          onPress={() =>
            Share.share({ message: `${event.title} · ${formatWhen(event.start_at)} · ${event.venue?.name ?? 'Venue to be announced'}` }).catch(() => undefined)
          }
        />
      </View>
      {event.description ? <Text style={s.body}>{event.description}</Text> : null}

      <Text style={s.h2}>Choose your pass</Text>
      <Text style={s.sub}>Sold-out tiers open a waitlist. You&apos;re confirmed automatically if a seat frees up.</Text>

      {note && <Notice tone={note.tone} text={note.text} />}
      {!bookable && <Notice tone="warn" text={`This event is ${event.status}, so booking is closed.`} />}

      {(event.ticket_types ?? []).length === 0 ? (
        <Empty text="Tickets for this event aren't on sale yet." />
      ) : (
        <>
        <SeatMap3D
          blocks={event.ticket_types!.map((t) => ({ id: t.id, name: t.name, capacity: t.capacity, remaining: t.seats_remaining }))}
          selectedId={picked ?? event.ticket_types![0].id}
          onSelect={(id) => setPicked(Number(id))}
          pick={
            seated && Object.keys(seats).length
              ? {
                  seats,
                  value: seatPick ? { tierId: seatPick.tierId, seatId: seatPick.seat.id } : null,
                  onPick: (tierId, seat) => {
                    setSeatPick(seat ? { tierId: Number(tierId), seat } : null)
                    if (seat) setPicked(Number(tierId))
                  },
                }
              : undefined
          }
        />
        <View style={{ backgroundColor: colors.paper, borderTopWidth: 3, borderTopColor: colors.ink }}>
          {event.ticket_types!.map((t) => (
            <View key={t.id} style={[s.tier, (picked ?? event.ticket_types![0].id) === t.id && { backgroundColor: 'rgba(228,98,63,0.12)', borderLeftWidth: 4, borderLeftColor: colors.accent }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tierName}>{t.name}</Text>
                  <Text style={s.sub}>{t.seats_remaining > 0 ? `${t.seats_remaining} of ${t.capacity} seats left` : 'Sold out'}</Text>
                </View>
                <Text style={s.tierName}>{Number(t.price) === 0 ? 'Free' : `RM ${Number(t.price).toFixed(2)}`}</Text>
              </View>
              <Button
                title={
                  t.seats_remaining === 0
                    ? 'Join waitlist'
                    : seated
                      ? seatPick?.tierId === t.id
                        ? `Book seat ${seatPick.seat.label}`
                        : 'Choose a seat above'
                      : 'Book this pass'
                }
                onPress={() => book(t)}
                disabled={!bookable || (seated && t.seats_remaining > 0 && seatPick?.tierId !== t.id)}
                busy={busyId === t.id}
              />
            </View>
          ))}
        </View>
        </>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  hero: { height: 200, overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  heroDay: { fontFamily: fonts.heavy, fontSize: 96, lineHeight: 96, letterSpacing: -3 },
  heroMonth: { fontFamily: fonts.heavy, fontSize: 15, letterSpacing: 2 },
  pad: { padding: 16, gap: 12 },
  loading: { fontFamily: fonts.regular, color: colors.inkSoft, textAlign: 'center', padding: 32 },
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink, marginTop: 12 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink, marginTop: 8 },
  tier: { padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  tierName: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink },
})
