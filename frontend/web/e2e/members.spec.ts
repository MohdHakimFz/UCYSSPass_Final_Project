import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

test.describe('members-only tickets', () => {
  const title = unique('E2E Members Night')
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let student: Awaited<ReturnType<typeof createUser>>
  let eventId: number

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    student = await createUser('customer', adminToken)
    const token = await tokenFor(organiser.email)
    const venue = (await api<{ data: { id: number }[] }>('/venues?per_page=1', { token: adminToken })).data[0]
    const start = new Date(Date.now() + 6 * 86400_000)
    const event = await api<{ id: number }>('/events', {
      method: 'POST',
      token,
      body: { title, category: 'workshop', venue_id: venue.id, status: 'published', start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600_000).toISOString() },
    })
    eventId = event.id
    await api(`/events/${eventId}/ticket-types`, { method: 'POST', token, body: { name: 'Member price', price: 0, capacity: 5, members_only: true } })
  })

  test.afterAll(async () => {
    for (const u of [organiser, student]) await removeUser(u.id, adminToken)
  })

  test('a student who is not a member cannot book it; once an admin adds them to the member list they can', async ({ page, browser }) => {
    await signIn(page, student)
    await expectPath(page, '/passes')
    await page.goto(`/events/${eventId}`)

    const book = page.getByRole('button', { name: 'Members only' })
    await expect(page.getByText('Members only', { exact: true }).first()).toBeVisible()
    await expect(book).toBeDisabled()
    await expect(page.getByText('Ask a UCYSS committee member to add you to the member list.')).toBeVisible()

    // The committee adds them to the member list from the People page.
    const adminPage = await (await browser.newContext({ baseURL: 'http://localhost:5175' })).newPage()
    await signIn(adminPage, ADMIN)
    await expectPath(adminPage, '/admin')
    await adminPage.goto('/admin/users')
    await adminPage.getByPlaceholder('Search by name or email').fill(student.email)
    const row = adminPage.getByRole('row', { name: new RegExp(student.email.replace('.', '\\.')) })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: /Actions for/ }).click()
    await adminPage.getByRole('menuitem', { name: 'Add to member list' }).click()
    await expect(adminPage.getByText(/is now a UCYSS member/)).toBeVisible()
    await expect(row).toContainText('Member')

    // Back on the event page (a reload picks up the new membership) the ticket can be booked.
    await page.reload()
    await page.getByRole('button', { name: 'Book this pass' }).click()
    await expect(page.getByText(/You're in|confirmed/i).first()).toBeVisible()
    const mine = await api<{ data: { status: string }[] }>('/bookings', { token: await tokenFor(student.email) })
    expect(mine.data[0].status).toBe('confirmed')
  })
})
