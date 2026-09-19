import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

test.describe('getting back to the list from an event page', () => {
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let eventId: number
  const title = unique('E2E Nav')

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    const start = new Date(Date.now() + 9 * 86400_000)
    const venue = (await api<{ data: { id: number }[] }>('/venues?per_page=1', { token: adminToken })).data[0]
    eventId = (
      await api<{ id: number }>('/events', {
        method: 'POST',
        token: await tokenFor(organiser.email),
        body: { title, description: 'x', category: 'ctf', venue_id: venue.id, start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600_000).toISOString() },
      })
    ).id
  })

  test.afterAll(async () => {
    await removeUser(organiser.id, adminToken)
  })

  test('the organiser breadcrumb and the side menu both lead back to My events', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')

    await page.goto(`/organiser/events/${eventId}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByLabel('Breadcrumb').getByRole('link', { name: 'My events' }).click()
    await expect(page).toHaveURL(/\/organiser$/)
    await expect(page.getByRole('heading', { name: 'My events', level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: title })).toBeVisible()

    await page.getByRole('link', { name: title }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'My events' }).click()
    await expect(page).toHaveURL(/\/organiser$/)
    await expect(page.getByRole('heading', { name: 'My events', level: 1 })).toBeVisible()
  })

  test('the old address /organiser/events still lands on the list instead of an empty page', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await page.goto('/organiser/events')
    await expect(page).toHaveURL(/\/organiser$/)
    await expect(page.getByRole('heading', { name: 'My events', level: 1 })).toBeVisible()
  })

  test('the admin breadcrumb leads back to the events list', async ({ page }) => {
    await signIn(page, ADMIN)
    await expectPath(page, '/admin')
    await page.goto(`/admin/events/${eventId}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByLabel('Breadcrumb').getByRole('link', { name: 'Events' }).click()
    await expect(page).toHaveURL(/\/admin\/events$/)
    await expect(page.getByRole('heading', { name: 'Events', level: 1 })).toBeVisible()
  })
})
