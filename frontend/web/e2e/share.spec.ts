import { expect, test } from '@playwright/test'
import { ADMIN, api, createUser, removeUser, tokenFor, unique } from './helpers'

test.describe('sharing an event', () => {
  const title = unique('E2E Share Night')
  const LINK = 'https://meet.google.com/share-test-link'
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>
  let eventId: number

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
    const start = new Date(Date.now() + 4 * 86400_000)
    eventId = (
      await api<{ id: number }>('/events', {
        method: 'POST',
        token: await tokenFor(organiser.email),
        body: { title, category: 'workshop', mode: 'online', meeting_url: LINK, status: 'published', start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600_000).toISOString() },
      })
    ).id
  })

  test.afterAll(async () => {
    await removeUser(organiser.id, adminToken)
  })

  test('WhatsApp gets a ready message with the link to the event, and never the meeting link', async ({ page }) => {
    await page.goto(`/events/${eventId}`)
    const whatsapp = page.getByRole('link', { name: 'Share on WhatsApp' })
    await expect(whatsapp).toBeVisible()

    const href = (await whatsapp.getAttribute('href'))!
    expect(href.startsWith('https://wa.me/?text=')).toBe(true)
    const text = decodeURIComponent(href.replace('https://wa.me/?text=', ''))
    expect(text).toContain(title)
    expect(text).toContain('Online meeting')
    expect(text).toContain(`/events/${eventId}`)
    expect(text).not.toContain('meet.google.com')
    expect(await whatsapp.getAttribute('rel')).toContain('noopener')
  })

  test('Copy link puts the event address on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5175' })
    await page.goto(`/events/${eventId}`)

    await page.getByRole('button', { name: 'Copy link' }).click()

    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:5175/events/${eventId}`)
  })

  test('an event that is not published cannot be shared', async ({ page }) => {
    const token = await tokenFor(organiser.email)
    await api(`/events/${eventId}`, { method: 'PUT', token, body: { status: 'completed' } })
    try {
      await page.goto(`/events/${eventId}`)
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Share on WhatsApp' })).toHaveCount(0)
    } finally {
      await api(`/events/${eventId}`, { method: 'PUT', token, body: { status: 'published' } })
    }
  })
})
