import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

/** datetime-local wants local time without a zone. */
const local = (ms: number) => {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

test.describe('an event the organiser publishes shows up for customers', () => {
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
  })

  test.afterAll(async () => {
    await removeUser(organiser.id, adminToken)
  })

  test('even when it started an hour ago and is still running, and it says "Happening now"', async ({ page, browser }) => {
    const title = unique('E2E Running Now')
    const customer = await (await browser.newContext({ baseURL: 'http://localhost:5175' })).newPage()
    await customer.goto('/events')
    await expect(customer.getByText(title)).toHaveCount(0)

    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await page.getByRole('link', { name: 'Create event' }).click()
    await page.locator('#title').fill(title)
    await page.locator('#start').fill(local(Date.now() - 3600_000))
    await page.locator('#end').fill(local(Date.now() + 24 * 3600_000))
    await page.getByRole('button', { name: 'Create event' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    await page.getByRole('button', { name: 'Add tier' }).click()
    await page.locator('#tier-name').fill('Standard')
    await page.locator('#tier-price').fill('0')
    await page.locator('#tier-seats').fill('10')
    await page.getByRole('button', { name: 'Save tier' }).click()
    await expect(page.getByRole('cell', { name: 'Standard' })).toBeVisible()

    await page.getByRole('button', { name: 'Publish event' }).click()
    await expect(page.getByText('Event is live')).toBeVisible()

    // The customer's open list picks it up by itself, and marks it as on now.
    const card = customer.getByRole('link', { name: new RegExp(title) })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText('Happening now')

    // It can really be booked.
    await card.click()
    await expect(customer.getByRole('heading', { name: title })).toBeVisible()
    await expect(customer.getByRole('button', { name: 'Book this pass' })).toBeEnabled()
  })

  test('an event that has already ended is not in the public list', async ({ page }) => {
    const title = unique('E2E Already Over')
    const token = await tokenFor(organiser.email)
    const venue = (await api<{ data: { id: number }[] }>('/venues?per_page=1', { token: adminToken })).data[0]
    const start = new Date(Date.now() - 3 * 86400_000)
    await api('/events', {
      method: 'POST',
      token,
      body: { title, category: 'workshop', venue_id: venue.id, status: 'published', start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600_000).toISOString() },
    })

    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(title)).toHaveCount(0)
  })
})
