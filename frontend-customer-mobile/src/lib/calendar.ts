import { Platform } from 'react-native'
import * as Calendar from 'expo-calendar/legacy'
import type { Booking } from './api'

// Adds a confirmed booking to the phone's own calendar. Uses the legacy calendar API because
// Expo Go, which the demo runs in, doesn't ship the new one.
export async function addToCalendar(b: Booking): Promise<void> {
  const ev = b.ticket_type?.event
  if (!ev) throw new Error('This pass has no event details to add.')
  if (Platform.OS === 'web') throw new Error('Adding to a calendar works in the phone app, not the browser.')

  const { status } = await Calendar.requestCalendarPermissionsAsync()
  if (status !== 'granted') throw new Error('Calendar access was denied. Allow it in Settings to add events.')

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const target = calendars.find((c) => c.allowsModifications && c.isPrimary) ?? calendars.find((c) => c.allowsModifications)
  if (!target) throw new Error('No calendar on this phone can take new events.')

  await Calendar.createEventAsync(target.id, {
    title: ev.title,
    startDate: new Date(ev.start_at),
    endDate: new Date(ev.end_at),
    location: ev.venue?.name,
    notes: `${b.ticket_type?.name} pass. Show your QR code at the door.`,
  })
}
