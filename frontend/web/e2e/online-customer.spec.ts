import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

const LINK = 'http://localhost:5175/events?meeting=1'

test.describe('online events, customer side', () => {
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let customer: Awaited<ReturnType<typeof createUser>>
  const eventIds: number[] = []

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    customer = await createUser('customer', adminToken)
  })

  test.afterAll(async () => {
    for (const id of eventIds) await api(`/events/${id}`, { method: 'DELETE', token: adminToken }).catch(() => undefined)
    for (const u of [organiser, customer]) await removeUser(u.id, adminToken)
  })

  async function onlineEvent(title: string, startsInMinutes: number) {
    const orgToken = await tokenFor(organiser.email)
    const start = new Date(Date.now() + startsInMinutes * 60_000)
    const event = await api<{ id: number }>('/events', {
      method: 'POST',
      token: orgToken,
      body: {
        title, description: 'Online talk', category: 'workshop', mode: 'online', meeting_url: LINK, status: 'published',
        start_at: start.toISOString(), end_at: new Date(start.getTime() + 90 * 60_000).toISOString(),
      },
    })
    eventIds.push(event.id)
    const tier = await api<{ id: number }>(`/events/${event.id}/ticket-types`, { method: 'POST', token: orgToken, body: { name: 'Free', price: 0, capacity: 5 } })
    return { id: event.id, tierId: tier.id }
  }

  test('a customer books an online event, sees no link until it opens, then joins and is counted as attending', async ({ page }) => {
    const title = unique('E2E Talk')
    const soon = await onlineEvent(title, 10)
    const custToken = await tokenFor(customer.email)

    // The public page shows the event as online, with no seat map and no link anywhere.
    await page.goto(`/events/${soon.id}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('online meeting').first()).toBeVisible()
    expect(await page.content()).not.toContain(LINK)

    await signIn(page, customer)
    await expectPath(page, '/passes')
    const booking = await api<{ id: number }>('/bookings', { method: 'POST', token: custToken, body: { ticket_type_id: soon.tierId } })

    await page.goto('/passes')
    await expect(page.getByText(title)).toBeVisible()
    expect(await page.content()).not.toContain(LINK)
    await expect(page.getByRole('button', { name: 'Show pass' })).toHaveCount(0)

    const popup = page.waitForEvent('popup')
    await page.getByRole('button', { name: 'Join meeting' }).click()
    await (await popup).waitForURL(/meeting=1/)

    await expect.poll(async () => (await api<{ status: string }>(`/bookings/${booking.id}`, { token: custToken })).status).toBe('attended')
  })

  test('a meeting that is hours away shows when it opens and cannot be joined yet', async ({ page }) => {
    const title = unique('E2E Later')
    const later = await onlineEvent(title, 180)
    const custToken = await tokenFor(customer.email)
    const booking = await api<{ id: number }>('/bookings', { method: 'POST', token: custToken, body: { ticket_type_id: later.tierId } })

    await signIn(page, customer)
    await expectPath(page, '/passes')
    const ticket = page.getByRole('listitem').filter({ hasText: title })
    await expect(ticket).toBeVisible()
    await expect(ticket.getByRole('button', { name: /^Opens / })).toBeDisabled()
    await expect(ticket.getByRole('button', { name: /Join on/ })).toHaveCount(0)

    // Even asking the server directly is refused before the meeting opens.
    await expect(api(`/bookings/${booking.id}/join`, { method: 'POST', token: custToken })).rejects.toThrow(/422/)
  })
})
