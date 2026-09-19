import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

test.describe('attendance', () => {
  const title = unique('E2E Attendance')
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let came: Awaited<ReturnType<typeof createUser>>
  let stayedHome: Awaited<ReturnType<typeof createUser>>

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    came = await createUser('customer', adminToken)
    stayedHome = await createUser('customer', adminToken)
    const token = await tokenFor(organiser.email)
    const venue = (await api<{ data: { id: number }[] }>('/venues?per_page=1', { token: adminToken })).data[0]
    const start = new Date(Date.now() + 2 * 86400_000)
    const event = await api<{ id: number }>('/events', {
      method: 'POST',
      token,
      body: { title, category: 'workshop', venue_id: venue.id, status: 'published', start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600_000).toISOString() },
    })
    const tier = await api<{ id: number }>(`/events/${event.id}/ticket-types`, { method: 'POST', token, body: { name: 'Free', price: 0, capacity: 5 } })

    // Two people register; one is checked in at the door.
    const first = await api<{ id: number; qr_token: string }>('/bookings', { method: 'POST', token: await tokenFor(came.email), body: { ticket_type_id: tier.id } })
    await api('/bookings', { method: 'POST', token: await tokenFor(stayedHome.email), body: { ticket_type_id: tier.id } })
    await api(`/bookings/${first.id}/checkin`, { method: 'POST', token, body: { qr_token: first.qr_token } })

    // The event has now happened.
    const past = new Date(Date.now() - 5 * 86400_000)
    await api(`/events/${event.id}`, { method: 'PUT', token, body: { start_at: past.toISOString(), end_at: new Date(past.getTime() + 3600_000).toISOString() } })
  })

  test.afterAll(async () => {
    for (const u of [organiser, came, stayedHome]) await removeUser(u.id, adminToken)
  })

  test('the organiser sees how many of the people who registered actually came', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')

    const panel = page.getByRole('region', { name: 'Attendance' })
    await expect(panel).toContainText('1 of 2 who registered came (50%)')
    await expect(panel.getByRole('listitem').filter({ hasText: title })).toContainText('1 of 2')
    await expect(panel.getByRole('listitem').filter({ hasText: title })).toContainText('50%')
  })

  test('a customer has no attendance numbers', async () => {
    const res = await fetch('http://localhost/api/organiser/attendance', { headers: { Accept: 'application/json', Authorization: `Bearer ${await tokenFor(came.email)}` } })
    expect(res.status).toBe(403)
  })
})
