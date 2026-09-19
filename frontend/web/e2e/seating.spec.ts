import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

const nextYear = new Date().getFullYear() + 1

test.describe('numbered seats, end to end', () => {
  const title = unique('E2E Seated')
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
    for (const u of [organiser, first, second]) await removeUser(u.id, adminToken)
  })

  test('the organiser switches on numbered seats and adds a tier with rows of four', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await page.getByRole('link', { name: 'Create event' }).click()

    await page.locator('#title').fill(title)
    await page.locator('#start').fill(`${nextYear}-04-10T10:00`)
    await page.locator('#end').fill(`${nextYear}-04-10T18:00`)
    await page.getByText('Numbered seats').click()
    await page.getByRole('button', { name: 'Create event' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    eventId = Number(page.url().match(/events\/(\d+)/)![1])

    await page.getByRole('button', { name: 'Add tier' }).click()
    await page.locator('#tier-name').fill('Front')
    await page.locator('#tier-price').fill('0')
    await page.locator('#tier-seats').fill('8')
    await page.locator('#tier-row').fill('4')
    await page.getByRole('button', { name: 'Save tier' }).click()
    await expect(page.getByRole('cell', { name: 'Front' })).toBeVisible()

    await page.locator('#status').selectOption('published')
    await page.getByRole('button', { name: 'Save event' }).click()
    await expect(page.getByText('Event saved.')).toBeVisible()

    const tier = (await api<{ ticket_types: { id: number }[] }>(`/events/${eventId}`)).ticket_types[0]
    const seats = await api<{ label: string }[]>(`/ticket-types/${tier.id}/seats`)
    expect(seats.map((s) => s.label)).toEqual(['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'])
  })

  test('a customer picks a real seat, books it, and sees it on the pass; the next customer cannot take it', async ({ browser }) => {
    const seatButton = (page: import('@playwright/test').Page, label: string) => page.getByRole('button', { name: new RegExp(`^Seat ${label},`) })

    const one = await (await browser.newContext()).newPage()
    await signIn(one, first)
    await expectPath(one, '/passes')
    await one.goto(`/events/${eventId}`)
    await expect(one.getByRole('button', { name: 'Choose a seat above' })).toBeDisabled()

    await seatButton(one, 'B3').click()
    await one.getByRole('button', { name: 'Book seat B3' }).click()
    await expect(one.getByText("You're in. Seat B3 is yours")).toBeVisible()
    await one.goto('/passes')
    await expect(one.getByText('Seat B3').first()).toBeVisible()

    const two = await (await browser.newContext()).newPage()
    await signIn(two, second)
    await expectPath(two, '/passes')
    await two.goto(`/events/${eventId}`)
    await expect(seatButton(two, 'B3')).toHaveAttribute('aria-disabled', 'true')
    await expect(seatButton(two, 'B4')).toHaveAttribute('aria-disabled', 'false')
  })

  test('the door screen shows the guest\'s seat, and the API refuses a taken seat', async ({ page }) => {
    const customerToken = await tokenFor(first.email)
    const mine = (await api<{ data: { id: number; qr_token: string }[] }>('/bookings', { token: customerToken })).data[0]
    const tier = (await api<{ ticket_types: { id: number }[] }>(`/events/${eventId}`)).ticket_types[0]
    const taken = (await api<{ id: number; label: string }[]>(`/ticket-types/${tier.id}/seats`)).find((s) => s.label === 'B3')!

    const res = await fetch('http://localhost/api/bookings', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenFor(second.email)}` },
      body: JSON.stringify({ ticket_type_id: tier.id, seat_id: taken.id }),
    })
    expect(res.status).toBe(409)

    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await page.goto('/organiser/checkin')
    await page.locator('#event').selectOption({ label: title })
    await page.getByText("Can't scan? Enter the ticket instead").click()
    await page.locator('#manual').fill(`${mine.id} ${mine.qr_token}`)
    await page.getByRole('button', { name: 'Check in', exact: true }).click()
    await expect(page.locator('.result')).toContainText('Cleared to enter')
    await expect(page.locator('.result')).toContainText('Seat B3')
  })
})
