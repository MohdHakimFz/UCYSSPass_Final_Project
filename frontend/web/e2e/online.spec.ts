import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, expectPath, removeUser, signIn, tokenFor, unique } from './helpers'

const nextYear = new Date().getFullYear() + 1

test.describe('online events, organiser side', () => {
  const title = unique('E2E Online')
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let eventId: number

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
  })

  test.afterAll(async () => {
    await removeUser(organiser.id, adminToken)
  })

  test('an organiser creates an online event, cannot publish it without a link, then publishes it themselves', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await page.getByRole('link', { name: 'Create event' }).click()

    await page.getByRole('tab', { name: 'Online meeting' }).click()
    await expect(page.locator('#venue')).toHaveCount(0)
    await expect(page.getByText('Numbered seats')).toHaveCount(0)

    await page.locator('#title').fill(title)
    await page.locator('#start').fill(`${nextYear}-05-10T20:00`)
    await page.locator('#end').fill(`${nextYear}-05-10T22:00`)
    await page.getByRole('button', { name: 'Create event' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    eventId = Number(page.url().match(/events\/(\d+)/)![1])

    // No link yet: the server refuses and the page says why.
    await page.getByRole('button', { name: 'Publish event' }).click()
    await expect(page.getByText('An online event needs a meeting link before it can be published.')).toBeVisible()

    await page.locator('#meeting-url').fill('https://meet.google.com/abc-defg-hij')
    await expect(page.getByText('Detected: Google Meet')).toBeVisible()
    await page.getByRole('button', { name: 'Save event' }).click()
    await expect(page.getByText('Event saved.')).toBeVisible()

    await page.getByRole('button', { name: 'Publish event' }).click()
    await expect(page.getByText('Event is live')).toBeVisible()

    // The public sees the event, but never the link.
    const publicView = await api<Record<string, unknown>>(`/events/${eventId}`)
    expect(publicView.mode).toBe('online')
    expect(publicView.status).toBe('published')
    expect(publicView).not.toHaveProperty('meeting_url')
    expect(publicView.meeting_platform).toBe('meet')

    // The organiser's own list marks it as online.
    await page.goto('/organiser')
    await expect(page.getByRole('row', { name: new RegExp(title) })).toContainText('Online')
  })

  test.afterAll(async () => {
    if (eventId) await api(`/events/${eventId}`, { method: 'DELETE', token: adminToken }).catch(() => undefined)
  })
})
