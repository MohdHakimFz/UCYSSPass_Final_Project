import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { BookingStatus } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { describeError, money, type AdminStats } from '../../lib/manage'
import { Empty, Notice, Skeleton, StatusTag, formatWhen } from '../../components/ui'
import { Row, SectionTitle, Stats } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'

const n = (o: Record<string, number> | undefined, key: string) => Number(o?.[key] ?? 0)
const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'waitlisted', 'attended', 'cancelled']

/** Admin home: platform numbers from GET /admin/stats. */
export default function OverviewScreen() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const { data, error, refresh, refreshing } = useFetch<AdminStats>('/admin/stats', { every: 30000, describe: describeError })


  return (
    <ScrollView style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={s.h1}>Platform overview</Text>
      {error && <Notice tone="error" text={error} />}
      {!data ? (
        !error && <Skeleton rows={5} height={70} />
      ) : (
        <>
          <SectionTitle>Revenue</SectionTitle>
          <Stats
            items={[
              { label: 'Net revenue', value: money(data.revenue.net), tone: 'ok' },
              { label: 'Gross', value: money(data.revenue.gross) },
              { label: 'Refunded', value: money(data.revenue.refunded), tone: data.revenue.refunded ? 'warn' : undefined },
              { label: 'Payments', value: data.revenue.payments },
            ]}
          />

          <SectionTitle>Users by role</SectionTitle>
          <Stats
            items={[
              { label: 'Customers', value: n(data.users_by_role, 'customer') },
              { label: 'Organisers', value: n(data.users_by_role, 'organiser') },
              { label: 'Admins', value: n(data.users_by_role, 'admin') },
            ]}
          />

          <SectionTitle>Events by status</SectionTitle>
          <Stats
            items={[
              { label: 'Published', value: n(data.events_by_status, 'published'), tone: 'ok' },
              { label: 'Drafts', value: n(data.events_by_status, 'draft'), tone: 'warn' },
              { label: 'Completed', value: n(data.events_by_status, 'completed') },
              { label: 'Cancelled', value: n(data.events_by_status, 'cancelled') },
            ]}
          />

          <SectionTitle>Bookings by status</SectionTitle>
          <Stats items={BOOKING_STATUSES.map((st) => ({ label: st === 'attended' ? 'Checked in' : st[0].toUpperCase() + st.slice(1), value: n(data.bookings_by_status, st) }))} />

          <SectionTitle>Recent activity</SectionTitle>
          {data.recent_activity.length === 0 ? (
            <Empty text="No bookings yet." />
          ) : (
            data.recent_activity.map((a) => (
              <Row key={a.id}>
                <View style={s.top}>
                  <Text style={s.name}>{a.customer ?? 'Customer'}</Text>
                  {BOOKING_STATUSES.includes(a.status as BookingStatus) && <StatusTag status={a.status as BookingStatus} />}
                </View>
                <Text style={s.sub}>
                  {a.event ?? 'Event'} · {a.tier ?? 'Tier'}
                </Text>
                <Text style={s.sub}>{formatWhen(a.at)}</Text>
              </Row>
            ))
          )}
        </>
      )}
    </ScrollView>
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pad: { padding: 16, gap: 10 },
    h1: { fontFamily: fonts.heavy, fontSize: 26, color: colors.ink },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    name: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, flexShrink: 1 },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  })
