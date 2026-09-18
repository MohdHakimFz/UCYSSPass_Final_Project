import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

const nextYear = new Date().getFullYear() + 1

test.describe('an event from creation to check-in', () => {
  const title = unique('E2E CTF')
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let first: Awaited<ReturnType<typeof createUser>>
  let second: Awaited<ReturnType<typeof createUser>>
  let eventId: number

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    first = await createUser('customer', adminToken)
    second = await createUser('customer', adminToken)
  })

  test.afterAll(async () => {
    // Removing the organiser removes their event, tiers and bookings with it.
    for (const u of [organiser, first, second]) await removeUser(u.id, adminToken)
  })

  test('the organiser creates an event, adds a one-seat tier and publishes it', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')

    await page.getByRole('link', { name: 'Create event' }).click()
    await page.locator('#title').fill(title)
    await page.locator('#category').selectOption('ctf')
    await page.locator('#start').fill(`${nextYear}-03-10T10:00`)
    await page.locator('#end').fill(`${nextYear}-03-10T18:00`)
    await page.locator('#description').fill('Made by the end-to-end test')
    await page.getByRole('button', { name: 'Create event' }).click()

    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    eventId = Number(page.url().match(/events\/(\d+)/)![1])

    await page.getByRole('button', { name: 'Add tier' }).click()
    await page.locator('#tier-name').fill('Last seat')
    await page.locator('#tier-price').fill('0')
    await page.locator('#tier-seats').fill('1')
    await page.getByRole('button', { name: 'Save tier' }).click()
    await expect(page.getByRole('cell', { name: 'Last seat' })).toBeVisible()

    await page.locator('#status').selectOption('published')
    await page.getByRole('button', { name: 'Save event' }).click()
    await expect(page.getByText('Event saved.')).toBeVisible()
  })

  test('the first customer gets the seat and a pass; the second joins the waitlist', async ({ browser }) => {
    for (const [who, expected] of [
      [first, 'Confirmed'],
      [second, 'Waitlisted'],
    ] as const) {
      const context = await browser.newContext()
      const page = await context.newPage()
      await signIn(page, who)
      await expectPath(page, '/passes')

      await page.goto(`/events/${eventId}`)
      await page.getByRole('button', { name: /Book this pass|Join waitlist/ }).click()
      // The result banner, not the always-visible help text about waitlists.
      await expect(page.getByRole('alert').or(page.getByRole('status')).filter({ hasText: expected === 'Confirmed' ? /You're in/ : /you're on the waitlist/i })).toBeVisible()

      await page.goto('/passes')
      await expect(page.getByText(title).first()).toBeVisible()
      await expect(page.getByText(expected).first()).toBeVisible()
      await context.close()
    }
  })

  test('the organiser checks the confirmed guest in: forged and reused passes are refused', async ({ page }) => {
    const customerToken = await tokenFor(first.email)
    const bookings = await api<{ data: { id: number; qr_token: string; status: string }[] }>('/bookings', { token: customerToken })
    const booking = bookings.data.find((b) => b.status === 'confirmed')!

    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await page.goto('/organiser/checkin')
    await page.locator('#event').selectOption({ label: title })
    await page.getByText("Can't scan? Enter the ticket instead").click()

    const submit = async (text: string) => {
      await page.locator('#manual').fill(text)
      await page.getByRole('button', { name: 'Check in', exact: true }).click()
    }

    await submit(`${booking.id} ${'a'.repeat(64)}`)
    await expect(page.locator('.result')).toContainText('Forged or altered ticket')

    await submit(`${booking.id} ${booking.qr_token}`)
    await expect(page.locator('.result')).toContainText('Cleared to enter')
    await expect(page.getByText('1 of 1 arrived')).toBeVisible()

    await submit(`${booking.id} ${booking.qr_token}`)
    await expect(page.locator('.result')).toContainText('Already used')
  })

  test('the customer cannot check themselves in: the API refuses it', async () => {
    const customerToken = await tokenFor(first.email)
    const bookings = await api<{ data: { id: number; qr_token: string; status: string }[] }>('/bookings', { token: customerToken })
    const own = bookings.data.find((b) => b.status !== 'cancelled')!
    const res = await fetch(`http://localhost/api/bookings/${own.id}/checkin`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ qr_token: own.qr_token }),
    })
    expect(res.status).toBe(403)
  })
})
