import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { api, CATEGORY_LABEL, type Paginated } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { confirm, describeError, fieldErrors, latestFirst, type ManagedUser, type OrgEvent } from '../../lib/manage'
import { Button, Empty, Notice, Skeleton, formatWhen } from '../../components/ui'
import { Choice, EventStatusTag, Row } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type StatusFilter = '' | OrgEvent['status']
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

/** Admin: every event on the platform, drafts included (GET /events as an admin). Publish or cancel any of them. */
export default function AdminEventsScreen() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const qs = new URLSearchParams({ per_page: '50' })
  if (status) qs.set('status', status)
  if (query) qs.set('search', query)
  const { data, error, reload, refresh, refreshing } = useFetch<Paginated<OrgEvent>>(`/events?${qs}`, { every: 30000, describe: describeError })
  // Who created each event. Events only carry organiser_id, so look it up in the people list (GET /users is admin only).
  const people = useFetch<Paginated<ManagedUser>>('/users?per_page=200', { every: 60000, describe: describeError })
  const byId = useMemo(() => new Map((people.data?.data ?? []).map((u) => [u.id, u])), [people.data])


  async function setEventStatus(ev: OrgEvent, next: OrgEvent['status'], done: string) {
    setBusy(`${ev.id}:${next}`)
    setNote(null)
    try {
      await api(`/events/${ev.id}`, { method: 'PUT', body: { status: next } })
      setNote({ tone: 'ok', text: done })
      reload()
    } catch (err) {
      // A 422 here is one rule (e.g. an online event needs its meeting link), so show that sentence.
      setNote({ tone: 'error', text: Object.values(fieldErrors(err))[0] ?? describeError(err) })
    } finally {
      setBusy(null)
    }
  }

  function cancelEvent(ev: OrgEvent) {
    confirm('Cancel this event?', `"${ev.title}" will be cancelled and its guests' bookings with it. This is real data the whole group sees.`, 'Cancel event', () =>
      setEventStatus(ev, 'cancelled', `"${ev.title}" is cancelled.`),
    )
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={latestFirst(data?.data)}
      keyExtractor={(e) => String(e.id)}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <TextInput
            style={s.search}
            placeholder="Search events"
            placeholderTextColor={colors.inkSoft}
            selectionColor={colors.accent}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setQuery(search.trim())}
            returnKeyType="search"
            accessibilityLabel="Search events"
          />
          <Choice options={FILTERS} value={status} onChange={setStatus} />
          <Button title="All bookings" variant="dark" onPress={() => navigation.navigate('EventBookings', { title: 'All bookings' })} />
          {data && <Text style={s.count}>{data.total} event{data.total === 1 ? '' : 's'}</Text>}
          {error && <Notice tone="error" text={error} />}
          {note && <Notice tone={note.tone} text={note.text} />}
        </View>
      }
      ListEmptyComponent={!data && !error ? <Skeleton rows={4} height={110} /> : data ? <Empty text="No events match." /> : null}
      renderItem={({ item: ev }) => (
        <Row>
          <View style={s.top}>
            <Text style={s.cat}>{CATEGORY_LABEL[ev.category].toUpperCase()}</Text>
            <EventStatusTag status={ev.status} />
          </View>
          <Text style={s.title}>{ev.title}</Text>
          <Text style={s.owner}>By {byId.get(ev.organiser_id)?.name ?? `user #${ev.organiser_id}`}{byId.get(ev.organiser_id) ? ` · ${byId.get(ev.organiser_id)!.email}` : ''}</Text>
          <Text style={s.sub}>
            {formatWhen(ev.start_at)} · {ev.mode === 'online' ? 'Online' : (ev.venue?.name ?? 'No venue')}
          </Text>
          <View style={s.actions}>
            {ev.status !== 'published' && ev.status !== 'completed' && (
              <View style={{ flex: 1 }}>
                <Button title="Publish" busy={busy === `${ev.id}:published`} onPress={() => setEventStatus(ev, 'published', `"${ev.title}" is published.`)} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button title="Bookings" variant="quiet" onPress={() => navigation.navigate('EventBookings', { eventId: ev.id, title: ev.title })} />
            </View>
          </View>
          {ev.status !== 'cancelled' && ev.status !== 'completed' && <Button title="Cancel event" variant="danger" busy={busy === `${ev.id}:cancelled`} onPress={() => cancelEvent(ev)} />}
        </Row>
      )}
    />
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    search: { minHeight: 48, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.field, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
    count: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    cat: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.5, color: colors.inkSoft },
    title: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
    owner: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  })
