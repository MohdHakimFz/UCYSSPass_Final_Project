import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import type { BookingStatus, Paginated } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import { checkIn, describeError, money, type OrgBooking } from '../lib/manage'
import { Button, Empty, Notice, Skeleton, StatusTag, formatWhen } from './ui'
import { Choice, Row } from './manage'
import { fonts, type Palette } from '../theme'
import { useStyles, useTheme } from '../lib/themeMode'

const FILTERS: { value: '' | BookingStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'attended', label: 'Checked in' },
  { value: 'cancelled', label: 'Cancelled' },
]

/**
 * Bookings as the organiser sees them. GET /bookings is already filtered by the server:
 * an organiser only ever gets bookings for their own events. `eventId` narrows it to one event.
 */
export default function BookingList({ eventId, status, onStatus, header }: { eventId?: number; status: '' | BookingStatus; onStatus: (s: '' | BookingStatus) => void; header?: React.ReactNode }) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const qs = new URLSearchParams({ per_page: '50' })
  if (eventId) qs.set('event_id', String(eventId))
  if (status) qs.set('status', status)
  const { data, error, reload, refresh, refreshing } = useFetch<Paginated<OrgBooking>>(`/bookings?${qs}`, { every: 30000, describe: describeError })

  const { user } = useAuth()
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)


  /** The same check-in as scanning the QR, for a guest whose phone won't scan: the token comes from the booking itself. */
  async function manualCheckIn(b: OrgBooking) {
    if (!b.qr_token) return
    setBusyId(b.id)
    setNote(null)
    try {
      await checkIn(b.id, b.qr_token)
      setNote({ tone: 'ok', text: `${b.customer?.name ?? 'Guest'} is checked in.` })
      reload()
    } catch (err) {
      setNote({ tone: 'error', text: describeError(err) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={data?.data ?? []}
      keyExtractor={(b) => String(b.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          {header}
          <Choice options={FILTERS} value={status} onChange={onStatus} />
          {data && <Text style={s.count}>{data.total} booking{data.total === 1 ? '' : 's'}</Text>}
          {error && <Notice tone="error" text={error} />}
          {note && <Notice tone={note.tone} text={note.text} />}
        </View>
      }
      ListEmptyComponent={!data && !error ? <Skeleton rows={4} height={76} /> : data ? <Empty text={status ? 'No bookings with this status.' : 'No bookings yet.'} /> : null}
      renderItem={({ item: b }) => (
        <Row>
          <View style={s.top}>
            <Text style={s.name}>{b.customer?.name ?? 'Customer'}</Text>
            <StatusTag status={b.status} />
          </View>
          {b.customer?.email ? <Text style={s.sub}>{b.customer.email}</Text> : null}
          {!eventId && b.ticket_type?.event ? <Text style={s.event}>{b.ticket_type.event.title}</Text> : null}
          <Text style={s.sub}>
            {b.ticket_type?.name ?? 'Tier'}
            {b.seat ? ` · seat ${b.seat.label ?? `${b.seat.row_label}${b.seat.number}`}` : ''}
            {b.payment?.status === 'paid' ? ` · paid ${money(b.payment.amount)}` : ''}
          </Text>
          <Text style={s.sub}>{b.checked_in_at ? `Checked in ${formatWhen(b.checked_in_at)}` : `Booked ${formatWhen(b.booked_at)}`}</Text>
          {/* Only the event's organiser may check guests in (the API returns 403 for anyone else). */}
          {user?.role === 'organiser' && b.status === 'confirmed' && b.qr_token && (
            <View style={{ marginTop: 4 }}>
              <Button title="Check in" variant="dark" busy={busyId === b.id} onPress={() => manualCheckIn(b)} />
            </View>
          )}
        </Row>
      )}
    />
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    name: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, flexShrink: 1 },
    event: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
    count: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  })
