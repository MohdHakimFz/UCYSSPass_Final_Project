import { expect, test } from '@playwright/test'
import { ADMIN, api, tokenFor, unique } from './helpers'

test.describe('everyone sees changes without reloading', () => {
  test('publishing an event opens its page to customers within seconds, and unpublishing closes it again', async ({ page: customer }) => {
    const admin = await tokenFor(ADMIN.email)
    const venues = await api<{ data: { id: number }[] }>('/venues?per_page=1', { token: admin })
    const title = unique('Live update')
    const start = new Date(Date.now() + 2 * 86400_000).toISOString()
    const created = await api<{ id: number }>('/events', {
      method: 'POST',
      token: admin,
      body: { title, description: 'Live', category: 'workshop', venue_id: venues.data[0].id, start_at: start, end_at: new Date(Date.parse(start) + 3600_000).toISOString(), status: 'draft' },
    })

    await customer.goto(`/events/${created.id}`)
    await customer.waitForLoadState('networkidle')
    await expect(customer.getByText(title)).toHaveCount(0)

    try {
      await api(`/events/${created.id}`, { method: 'PUT', token: admin, body: { status: 'published' } })
      await expect(customer.getByText(title).first()).toBeVisible({ timeout: 12_000 })

      await api(`/events/${created.id}`, { method: 'PUT', token: admin, body: { status: 'draft' } })
      await expect(customer.getByText(title)).toHaveCount(0, { timeout: 12_000 })
    } finally {
      await api(`/events/${created.id}`, { method: 'DELETE', token: admin }).catch(() => undefined)
    }
  })
})
