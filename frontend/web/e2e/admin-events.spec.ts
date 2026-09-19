import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

test.describe('admin event list: online and in-person', () => {
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  const online = unique('E2E Online Talk')
  const physical = unique('E2E Room Workshop')

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    const token = await tokenFor(organiser.email)
    const venue = (await api<{ data: { id: number }[] }>('/venues?per_page=1', { token: adminToken })).data[0]
    const start = new Date(Date.now() + 3 * 86400_000)
    const times = { start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600_000).toISOString() }
    await api('/events', { method: 'POST', token, body: { title: online, category: 'workshop', mode: 'online', meeting_url: 'https://zoom.us/j/1', status: 'published', ...times } })
    await api('/events', { method: 'POST', token, body: { title: physical, category: 'workshop', venue_id: venue.id, status: 'published', ...times } })
  })

  test.afterAll(async () => {
    await removeUser(organiser.id, adminToken)
  })

  test('the admin sees which events are online and can filter by type', async ({ page }) => {
    await signIn(page, ADMIN)
    await expectPath(page, '/admin')
    await page.goto('/admin/events')
    await page.getByPlaceholder('Search events by title').fill('E2E')

    const row = (title: string) => page.getByRole('row', { name: new RegExp(title) })
    await expect(row(online)).toContainText('Online')
    await expect(row(physical)).toBeVisible()
    await expect(row(physical)).not.toContainText('Online meeting')

    await page.locator('#mode-filter').selectOption('online')
    await expect(row(online)).toBeVisible()
    await expect(row(physical)).toHaveCount(0)

    await page.locator('#mode-filter').selectOption('physical')
    await expect(row(physical)).toBeVisible()
    await expect(row(online)).toHaveCount(0)
  })

  test('the email log can be filtered to reminder emails', async ({ page }) => {
    await signIn(page, ADMIN)
    await expectPath(page, '/admin')
    await page.goto('/admin/notifications')
    await expect(page.getByRole('option', { name: 'Reminder before the event' })).toHaveCount(1)
  })
})
