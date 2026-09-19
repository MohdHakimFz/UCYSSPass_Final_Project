import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Button,
  ContentSwitcher,
  OverflowMenu,
  OverflowMenuItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react'
import { Download, Ticket } from '@carbon/icons-react'
import { api, downloadFile, errorText, type Booking, type BookingStatus, type Paginated } from '@/lib/api'
import { useFetch } from '@/lib/useFetch'
import { useFeedback } from '@/dashboard/feedback'
import { EmptyState, PageHeader, TablePager, money } from '@/dashboard/parts'
import { Notice, Skeleton, StatusTag, formatWhen } from '@/dashboard/ui'

const TABS: { key: '' | BookingStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'waitlisted', label: 'Waitlisted' },
  { key: 'pending', label: 'Awaiting payment' },
  { key: 'attended', label: 'Checked in' },
  { key: 'cancelled', label: 'Cancelled' },
]

function PaymentTag({ b }: { b: Booking }) {
  const p = b.payment
  if (p?.status === 'paid') return <Tag type="green" size="md">Paid {money(p.amount)}</Tag>
  if (p?.status === 'refunded') return <Tag type="gray" size="md">Refunded {money(p.refunded_amount)}</Tag>
  if (b.status === 'pending' && b.hold_expires_at) return <Tag type="warm-gray" size="md">Awaiting payment</Tag>
  return <span className="sub">None</span>
}

export default function BookingsPage() {
  const { toast, confirm } = useFeedback()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as '' | BookingStatus
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  const qs = new URLSearchParams({ page: String(page), per_page: String(size) })
  if (status) qs.set('status', status)
  const { data: rows, error, reload } = useFetch<Paginated<Booking>>(`/bookings?${qs}`)

  async function cancel(b: Booking) {
    const ok = await confirm({
      title: `Cancel ${b.customer?.name ?? 'this'} booking?`,
      body: 'The seat goes to the next person on the waitlist, and any payment is refunded when the event is far enough away.',
      confirmLabel: 'Cancel booking',
      danger: true,
    })
    if (!ok) return
    try {
      const res = await api<Booking>(`/bookings/${b.id}/cancel`, { method: 'PUT' })
      toast({ kind: 'success', title: 'Booking cancelled', subtitle: res.refund?.refunded ? `${money(res.refund.amount)} refunded.` : undefined })
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not cancel', subtitle: errorText(err) })
    }
  }

  async function remove(b: Booking) {
    const ok = await confirm({ title: 'Delete this booking record?', body: 'Use cancel unless you are cleaning up test data. This removes the record for good.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await api(`/bookings/${b.id}`, { method: 'DELETE' })
      toast({ kind: 'success', title: 'Booking deleted' })
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not delete', subtitle: errorText(err) })
    }
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking on the platform, with its payment. Cancel one to free the seat for the waitlist."
        actions={
          <Button kind="tertiary" renderIcon={Download} onClick={() => downloadFile('/admin/export/bookings', 'sentrypass-bookings.csv').catch((e) => toast({ kind: 'error', title: 'Export failed', subtitle: errorText(e) }))}>
            Export CSV
          </Button>
        }
      />

      <div className="chips">
        <ContentSwitcher
          size="md"
          selectedIndex={Math.max(0, TABS.findIndex((t) => t.key === status))}
          onChange={({ index }: { index?: number }) => {
            setPage(1)
            const key = TABS[index ?? 0].key
            setParams(key ? { status: key } : {})
          }}
        >
          {TABS.map((t) => (
            <Switch key={t.label} name={t.key || 'all'} text={t.label} />
          ))}
        </ContentSwitcher>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <TableContainer>
        {!rows ? (
          <Skeleton rows={6} />
        ) : rows.data.length === 0 ? (
          <EmptyState icon={<Ticket size={32} />} title="No bookings here">
            Nothing matches this filter yet.
          </EmptyState>
        ) : (
          <Table aria-label="Bookings">
            <TableHead>
              <TableRow>
                <TableHeader>Attendee</TableHeader>
                <TableHeader>Event</TableHeader>
                <TableHeader>Seat</TableHeader>
                <TableHeader>Payment</TableHeader>
                <TableHeader>Booked</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="cell-title">{b.customer?.name ?? 'Unknown'}</span>
                    <span className="sub">{b.customer?.email}</span>
                  </TableCell>
                  <TableCell>
                    {b.ticket_type?.event ? (
                      <Link className="cell-link" to={`/admin/events/${b.ticket_type.event.id}`}>
                        {b.ticket_type.event.title}
                      </Link>
                    ) : (
                      'Unknown event'
                    )}
                    <span className="sub">{b.ticket_type?.name}</span>
                  </TableCell>
                  <TableCell>{b.seat?.label ?? <span className="sub">None</span>}</TableCell>
                  <TableCell>
                    <PaymentTag b={b} />
                  </TableCell>
                  <TableCell>{formatWhen(b.booked_at)}</TableCell>
                  <TableCell>
                    <StatusTag status={b.status} />
                  </TableCell>
                  <TableCell>
                    <div className="row-actions">
                      <OverflowMenu flipped aria-label={`Actions for booking ${b.id}`} size="sm">
                        {b.status !== 'cancelled' && <OverflowMenuItem itemText="Cancel booking" onClick={() => cancel(b)} />}
                        <OverflowMenuItem itemText="Delete record" isDelete hasDivider={b.status !== 'cancelled'} onClick={() => remove(b)} />
                      </OverflowMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows && rows.total > 0 && (
          <TablePager
            page={rows.current_page}
            pageSize={size}
            total={rows.total}
            onChange={(p, s) => {
              setPage(s !== size ? 1 : p)
              setSize(s)
            }}
          />
        )}
      </TableContainer>
    </>
  )
}
