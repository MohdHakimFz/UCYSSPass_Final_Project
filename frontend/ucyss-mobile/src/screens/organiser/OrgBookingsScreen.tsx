import { useState } from 'react'
import type { BookingStatus } from '../../lib/api'
import BookingList from '../../components/BookingList'

/** Bookings tab: every booking for every one of my events, filterable by status. */
export default function OrgBookingsScreen() {
  const [status, setStatus] = useState<'' | BookingStatus>('')
  return <BookingList status={status} onStatus={setStatus} />
}
