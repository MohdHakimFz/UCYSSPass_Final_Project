import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

const nextYear = new Date().getFullYear() + 1

test.describe('holding a seat and paying for it', () => {
  const title = unique('E2E Paid')
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let customer: Awaited<ReturnType<typeof createUser>>
  let eventId: number

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    customer = await createUser('customer', adminToken)

    // A published event with one priced tier, made through the API so the test is about paying.
    const orgToken = await tokenFor(organiser.email)
    const venues = await api<{ data: { id: number }[] }>('/venues?per_page=1')
    const event = await api<{ id: number }>('/events', {
      method: 'POST',
      token: orgToken,
      body: { venue_id: venues.data[0].id, title, category: 'workshop', start_at: `${nextYear}-06-01T10:00:00Z`, end_at: `${nextYear}-06-01T16:00:00Z`, status: 'published' },
    })
    eventId = event.id
    await api(`/events/${eventId}/ticket-types`, { method: 'POST', token: orgToken, body: { name: 'Workshop pass', price: 25, capacity: 3 } })
  })

  test.afterAll(async () => {
    for (const u of [organiser, customer]) await removeUser(u.id, adminToken)
  })

  test('booking a priced ticket holds the seat, a declined payment can be retried, and paying issues the pass', async ({ page }) => {
    await signIn(page, customer)
    await expectPath(page, '/passes')
    await page.goto(`/events/${eventId}`)
    await expect(page.getByText('Free cancellation until 24 hours before the event')).toBeVisible()

    await page.getByRole('button', { name: 'Book this pass' }).click()
    const dialog = page.getByRole('dialog', { name: 'Complete your booking' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('timer')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Pay RM 25.00' })).toBeVisible()

    // A declined test payment keeps the hold and shows why.
    await dialog.getByLabel('Sandbox test result').selectOption('decline')
    await dialog.getByRole('button', { name: 'Pay RM 25.00' }).click()
    await expect(dialog.getByText('The payment was declined')).toBeVisible()

    await dialog.getByLabel('Sandbox test result').selectOption('approve')
    await dialog.getByText('Online banking').click()
    await dialog.getByRole('button', { name: 'Pay RM 25.00' }).click()
    await expect(dialog.getByText('Paid. You are in.')).toBeVisible()
    await expect(dialog.getByText('Online banking').last()).toBeVisible()

    await dialog.getByRole('link', { name: 'View my pass' }).click()
    await expectPath(page, '/passes')
    await expect(page.getByText('Paid RM 25.00')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show pass' })).toBeVisible()
  })

  test('cancelling a paid ticket well before the event refunds it', async ({ page }) => {
    await signIn(page, customer)
    await expectPath(page, '/passes')
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Cancel booking' }).click()
    await expect(page.getByText('RM 25.00 has been refunded')).toBeVisible()
  })

  test('walking away from checkout releases the seat', async ({ page }) => {
    await signIn(page, customer)
    await expectPath(page, '/passes')
    await page.goto(`/events/${eventId}`)
    await page.getByRole('button', { name: 'Book this pass' }).click()
    const dialog = page.getByRole('dialog', { name: 'Complete your booking' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Release the seat' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('3 of 3 seats left')).toBeVisible()
  })
})
