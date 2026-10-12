import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api, CATEGORY_LABEL, type TicketType } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { confirm, describeError, fieldErrors, money, type OrgEvent } from '../../lib/manage'
import { Button, Empty, Notice, Skeleton, formatWhen } from '../../components/ui'
import { EventStatusTag, Row, SectionTitle } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type Props = NativeStackScreenProps<RootParamList, 'OrgEvent'>
type Note = { tone: 'ok' | 'error'; text: string } | null

/** One of my events: its details, Publish / Move back to draft, its ticket tiers, and a way to its bookings. */
export default function OrgEventScreen({ route, navigation }: Props) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const { id } = route.params
  // GET /events/{id} gives the event with its venue and ticket_types in one call.
  const { data: ev, error, reload, refresh, refreshing } = useFetch<OrgEvent>(`/events/${id}`, { every: 30000, describe: describeError })
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<Note>(null)


  /** PUT just the status. The API answers 422 if, say, an online event has no meeting link yet. */
  async function setStatus(status: OrgEvent['status'], done: string) {
    setBusy(status)
    setNote(null)
    try {
      await api(`/events/${id}`, { method: 'PUT', body: { status } })
      setNote({ tone: 'ok', text: done })
      reload()
    } catch (err) {
      // A 422 here is about one rule (e.g. "needs a meeting link"), so show that sentence itself.
      setNote({ tone: 'error', text: Object.values(fieldErrors(err))[0] ?? describeError(err) })
    } finally {
      setBusy(null)
    }
  }

  function deleteTier(t: TicketType) {
    confirm('Delete this tier?', `"${t.name}" will be removed from the event.`, 'Delete', async () => {
      setNote(null)
      try {
        await api(`/ticket-types/${t.id}`, { method: 'DELETE' })
        setNote({ tone: 'ok', text: `Tier "${t.name}" deleted.` })
        reload()
      } catch (err) {
        setNote({ tone: 'error', text: describeError(err) })
      }
    })
  }

  function deleteEvent() {
    if (!ev) return
    confirm('Delete this event?', `"${ev.title}" and its tiers will be removed for good. Events with active bookings cannot be deleted.`, 'Delete event', async () => {
      setBusy('delete')
      try {
        await api(`/events/${id}`, { method: 'DELETE' })
        navigation.goBack()
      } catch (err) {
        // 409: the API refuses while there are still active bookings; the message says so.
        setNote({ tone: 'error', text: describeError(err) })
        setBusy(null)
      }
    })
  }

  if (!ev) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: colors.concrete }}>
        {error ? <Notice tone="error" text={error} /> : <Skeleton rows={4} height={70} />}
      </View>
    )
  }

  const tiers = ev.ticket_types ?? []

  return (
    <ScrollView style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      {note && <Notice tone={note.tone} text={note.text} />}

      <View style={s.card}>
        <View style={s.top}>
          <Text style={s.cat}>{CATEGORY_LABEL[ev.category].toUpperCase()}</Text>
          <EventStatusTag status={ev.status} />
        </View>
        <Text style={s.h1}>{ev.title}</Text>
        <Text style={s.sub}>
          {formatWhen(ev.start_at)} – {formatWhen(ev.end_at)}
        </Text>
        <Text style={s.sub}>{ev.mode === 'online' ? `Online · ${ev.meeting_url ? 'meeting link set' : 'no meeting link yet'}` : (ev.venue?.name ?? 'No venue')}</Text>
        {ev.description ? <Text style={s.body}>{ev.description}</Text> : null}
      </View>

      <View style={{ gap: 8 }}>
        {ev.status !== 'published' && <Button title="Publish" busy={busy === 'published'} onPress={() => setStatus('published', 'Published. Customers can now see and book this event.')} />}
        {ev.status !== 'draft' && <Button title="Move back to draft" variant="quiet" busy={busy === 'draft'} onPress={() => setStatus('draft', 'Moved back to draft. Customers can no longer see it.')} />}
        <Button title="Edit details" variant="dark" onPress={() => navigation.navigate('EventForm', { id })} />
        <Button title="View bookings" variant="quiet" onPress={() => navigation.navigate('EventBookings', { eventId: id, title: ev.title })} />
      </View>

      <SectionTitle>Ticket tiers</SectionTitle>
      {tiers.length === 0 ? (
        <Empty text="No tiers yet. Add one so customers can book." />
      ) : (
        tiers.map((t) => (
          <Row key={t.id}>
            <View style={s.top}>
              <Text style={s.tier}>{t.name}</Text>
              <Text style={s.tier}>{Number(t.price) === 0 ? 'Free' : money(t.price)}</Text>
            </View>
            <Text style={s.sub}>
              {t.seats_remaining} of {t.capacity} seats left{t.members_only ? ' · members only' : ''}
            </Text>
            <View style={s.actions}>
              <View style={{ flex: 1 }}>
                <Button title="Edit" variant="quiet" onPress={() => navigation.navigate('TierForm', { eventId: id, tier: t })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Delete" variant="danger" onPress={() => deleteTier(t)} />
              </View>
            </View>
          </Row>
        ))
      )}
      <Button title="Add tier" variant="dark" onPress={() => navigation.navigate('TierForm', { eventId: id })} />

      <View style={{ height: 16 }} />
      <Button title="Delete event" variant="danger" busy={busy === 'delete'} onPress={deleteEvent} />
    </ScrollView>
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pad: { padding: 16, gap: 12 },
    card: { backgroundColor: colors.paper, padding: 16, gap: 6, borderTopWidth: 3, borderTopColor: colors.ink },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    cat: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.5, color: colors.inkSoft },
    h1: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 28, color: colors.ink },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
    body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink, marginTop: 4 },
    tier: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, flexShrink: 1 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  })
