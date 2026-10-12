import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CATEGORY_LABEL, type Paginated } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useFetch } from '../../lib/useFetch'
import { describeError, latestFirst, money, type OrganiserSummary, type OrgEvent } from '../../lib/manage'
import { Button, Empty, Notice, Skeleton, formatWhen } from '../../components/ui'
import { EventStatusTag, Row, SectionTitle, Stats } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

/** Organiser home: my numbers at the top (GET /organiser/summary), then every event I own, drafts included. */
export default function MyEventsScreen() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()

  const summary = useFetch<OrganiserSummary>('/organiser/summary', { every: 30000, describe: describeError })
  // Passing my own organiser_id is what makes the API include my drafts.
  const events = useFetch<Paginated<OrgEvent>>(`/events?organiser_id=${user?.id}&per_page=50`, { every: 30000, describe: describeError })

  function refresh() {
    summary.refresh()
    events.refresh()
  }

  const sum = summary.data

  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={latestFirst(events.data?.data)}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={events.refreshing || summary.refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Text style={s.h1}>Hi {user?.name.split(' ')[0]}, here is how your events are doing.</Text>
          {summary.error && <Notice tone="error" text={summary.error} />}
          {sum ? (
            <Stats
              items={[
                { label: 'Events', value: sum.events },
                { label: 'Published', value: sum.published, tone: 'ok' },
                { label: 'Drafts', value: sum.drafts, tone: sum.drafts ? 'warn' : undefined },
                { label: 'Upcoming', value: sum.upcoming },
                { label: 'Tickets sold', value: sum.tickets_sold, tone: 'ok' },
                { label: 'Checked in', value: sum.checked_in },
                { label: 'Waitlisted', value: sum.waitlisted },
                { label: 'Net revenue', value: money(sum.revenue.net) },
              ]}
            />
          ) : (
            !summary.error && <Skeleton rows={2} height={70} />
          )}
          <Button title="New event" onPress={() => navigation.navigate('EventForm', {})} />
          <SectionTitle>My events</SectionTitle>
          {events.error && <Notice tone="error" text={events.error} />}
        </View>
      }
      ListEmptyComponent={!events.data && !events.error ? <Skeleton rows={3} height={84} /> : events.data ? <Empty text="You have no events yet. Tap New event to create your first one." /> : null}
      renderItem={({ item: ev }) => (
        <Row onPress={() => navigation.navigate('OrgEvent', { id: ev.id })} label={ev.title}>
          <View style={s.top}>
            <Text style={s.cat}>{CATEGORY_LABEL[ev.category].toUpperCase()}</Text>
            <EventStatusTag status={ev.status} />
          </View>
          <Text style={s.title}>{ev.title}</Text>
          <Text style={s.sub}>{formatWhen(ev.start_at)}</Text>
          <Text style={s.sub}>{ev.mode === 'online' ? 'Online meeting' : (ev.venue?.name ?? 'No venue yet')}</Text>
          <Text style={s.sub}>
            {ev.capacity ? `${(ev.capacity ?? 0) - (ev.seats_remaining ?? 0)} of ${ev.capacity} seats taken` : 'No ticket tiers yet'}
          </Text>
        </Row>
      )}
    />
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    h1: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 28, color: colors.ink },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cat: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.5, color: colors.inkSoft },
    title: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  })
