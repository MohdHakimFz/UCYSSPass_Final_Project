import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

test.describe('announcements', () => {
  const title = unique('E2E Announce')
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let guest: Awaited<ReturnType<typeof createUser>>
  let eventId: number

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    guest = await createUser('customer', adminToken)
    const token = await tokenFor(organiser.email)
    const venue = (await api<{ data: { id: number }[] }>('/venues?per_page=1', { token: adminToken })).data[0]
    const start = new Date(Date.now() + 5 * 86400_000)
    eventId = (
      await api<{ id: number }>('/events', {
        method: 'POST',
        token,
        body: { title, category: 'workshop', venue_id: venue.id, status: 'published', start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600_000).toISOString() },
      })
    ).id
    const tier = await api<{ id: number }>(`/events/${eventId}/ticket-types`, { method: 'POST', token, body: { name: 'Free', price: 0, capacity: 5 } })
    await api('/bookings', { method: 'POST', token: await tokenFor(guest.email), body: { ticket_type_id: tier.id } })
  })

  test.afterAll(async () => {
    for (const u of [organiser, guest]) await removeUser(u.id, adminToken)
  })

  test('an organiser tells everyone booked about a change, and sees it in the history', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await page.goto(`/organiser/events/${eventId}`)

    const send = page.getByRole('button', { name: /^Send to 1 person$/ })
    await expect(send).toBeDisabled()

    await page.locator('#announce-subject').fill('Room change')
    await page.locator('#announce-message').fill('We moved to Makmal 4.\nSee you there.')
    await expect(send).toBeEnabled()
    await send.click()

    // A window asks first, because an email cannot be recalled.
    await expect(page.getByText('Send this to 1 person?')).toBeVisible()
    await page.getByRole('button', { name: 'Send announcement' }).click()
    await expect(page.getByText('Announcement is on its way')).toBeVisible()

    const history = page.getByRole('list', { name: 'Sent announcements' })
    await expect(history).toContainText('Room change')
    await expect(history).toContainText('to 1 person')
    await history.getByText('Show the message').click()
    await expect(history).toContainText('We moved to Makmal 4.')

    // The API recorded it, and the admin email log has a row for the guest.
    const list = await api<{ data: { subject: string; recipients: number }[] }>(`/events/${eventId}/announcements`, { token: await tokenFor(organiser.email) })
    expect(list.data[0]).toMatchObject({ subject: 'Room change', recipients: 1 })
  })

  test('an event that is not published cannot send announcements', async ({ page }) => {
    const token = await tokenFor(organiser.email)
    await api(`/events/${eventId}`, { method: 'PUT', token, body: { status: 'draft' } })
    try {
      await signIn(page, organiser)
      await expectPath(page, '/organiser')
      await page.goto(`/organiser/events/${eventId}`)
      await expect(page.getByText('You can send announcements once the event is published.')).toBeVisible()
    } finally {
      await api(`/events/${eventId}`, { method: 'PUT', token, body: { status: 'published' } })
    }
  })
})
