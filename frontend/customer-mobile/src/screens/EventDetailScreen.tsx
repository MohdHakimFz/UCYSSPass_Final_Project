import { useState } from 'react'
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api, ApiError, CATEGORY_LABEL, errorText, type Booking, type EventItem, type TicketType } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import { Button, Empty, Notice, Skeleton, formatWhen } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

export default function EventDetailScreen({ route, navigation }: NativeStackScreenProps<RootParamList, 'EventDetail'>) {
  const { id } = route.params
  const { user } = useAuth()
  const { data: event, error, reload } = useFetch<EventItem>(`/events/${id}`)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null)

  async function book(t: TicketType) {
    if (!user) {
      navigation.navigate('Login')
      return
    }
    setBusyId(t.id)
    setNote(null)
    try {
      const b = await api<Booking>('/bookings', { method: 'POST', body: { ticket_type_id: t.id } })
      setNote(
        b.status === 'confirmed'
          ? { tone: 'ok', text: `You're in. Your ${t.name} pass is confirmed and waiting in My passes.` }
          : { tone: 'warn', text: `${t.name} is sold out, so you're on the waitlist. If a seat opens you'll be confirmed automatically.` },
      )
      reload()
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
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
      <Text style={s.h1}>{event.title}</Text>
      <Text style={s.sub}>
        {CATEGORY_LABEL[event.category]} · {formatWhen(event.start_at)} · {event.venue?.name ?? 'Venue to be announced'}
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
        <View style={{ backgroundColor: colors.paper, borderTopWidth: 3, borderTopColor: colors.ink }}>
          {event.ticket_types!.map((t) => (
            <View key={t.id} style={s.tier}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tierName}>{t.name}</Text>
                  <Text style={s.sub}>{t.seats_remaining > 0 ? `${t.seats_remaining} of ${t.capacity} seats left` : 'Sold out'}</Text>
                </View>
                <Text style={s.tierName}>{Number(t.price) === 0 ? 'Free' : `RM ${Number(t.price).toFixed(2)}`}</Text>
              </View>
              <Button
                title={t.seats_remaining > 0 ? 'Book this pass' : 'Join waitlist'}
                onPress={() => book(t)}
                disabled={!bookable}
                busy={busyId === t.id}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  loading: { fontFamily: fonts.regular, color: colors.inkSoft, textAlign: 'center', padding: 32 },
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink, marginTop: 12 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink, marginTop: 8 },
  tier: { padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  tierName: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink },
})
