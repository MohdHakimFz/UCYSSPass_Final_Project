import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

test.describe('certificate of attendance', () => {
  const title = unique('E2E Certificate')
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let came: Awaited<ReturnType<typeof createUser>>
  let stayedHome: Awaited<ReturnType<typeof createUser>>
  let bookingId: number
  let checkUrl: string

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
    const first = await api<{ id: number; qr_token: string }>('/bookings', { method: 'POST', token: await tokenFor(came.email), body: { ticket_type_id: tier.id } })
    await api('/bookings', { method: 'POST', token: await tokenFor(stayedHome.email), body: { ticket_type_id: tier.id } })
    await api(`/bookings/${first.id}/checkin`, { method: 'POST', token, body: { qr_token: first.qr_token } })
    bookingId = first.id

    // The event is now over.
    const past = new Date(Date.now() - 3 * 86400_000)
    await api(`/events/${event.id}`, { method: 'PUT', token, body: { start_at: past.toISOString(), end_at: new Date(past.getTime() + 3600_000).toISOString() } })

    checkUrl = (await api<{ certificate_url: string }>(`/bookings/${first.id}`, { token: await tokenFor(came.email) })).certificate_url
  })

  test.afterAll(async () => {
    for (const u of [organiser, came, stayedHome]) await removeUser(u.id, adminToken)
  })

  test('someone who came downloads a PDF certificate; someone who did not, cannot', async ({ page }) => {
    await signIn(page, came)
    await expectPath(page, '/passes')

    const ticket = page.getByRole('listitem').filter({ hasText: title })
    const [download] = await Promise.all([page.waitForEvent('download'), ticket.getByRole('button', { name: 'Download certificate' }).click()])
    expect(download.suggestedFilename()).toBe(`ucyss-certificate-${bookingId}.pdf`)
    const path = await download.path()
    expect(readFileSync(path!).subarray(0, 4).toString()).toBe('%PDF')

    // The other guest booked but never came: no button, and the server refuses too.
    const other = await api<{ data: { id: number }[] }>('/bookings', { token: await tokenFor(stayedHome.email) })
    const res = await fetch(`http://localhost/api/bookings/${other.data[0].id}/certificate`, { headers: { Accept: 'application/json', Authorization: `Bearer ${await tokenFor(stayedHome.email)}` } })
    expect(res.status).toBe(422)
  })

  test('anyone can open the address on the certificate and see it is genuine; a changed code is not', async ({ page }) => {
    const path = new URL(checkUrl).pathname
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'This certificate is genuine' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText(title)
    await expect(page.getByRole('status')).toContainText('E2E customer')

    await page.goto(path.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')))
    await expect(page.getByRole('heading', { name: 'We could not confirm this certificate' })).toBeVisible()
  })
})
