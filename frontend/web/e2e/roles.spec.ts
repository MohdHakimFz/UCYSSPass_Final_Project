import { expect, test } from '@playwright/test'
import { ADMIN, SEEDED_CUSTOMER, createUser, expectPath, removeUser, signIn, tokenFor } from './helpers'

test.describe('one sign-in, three areas', () => {
  let adminToken: string
  let organiser: Awaited<ReturnType<typeof createUser>>

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    organiser = await createUser('organiser', adminToken)
  })

  test.afterAll(async () => {
    await removeUser(organiser.id, adminToken)
  })

  test('a signed-out visitor is sent to the shared sign-in from every protected area', async ({ page }) => {
    for (const area of ['/admin', '/organiser', '/passes']) {
      await page.goto(area)
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(area)}`))
    }
  })

  test('a wrong password shows a clear message and stays on the sign-in page', async ({ page }) => {
    await signIn(page, { email: SEEDED_CUSTOMER.email, password: 'not-the-password' })

    await expect(page.getByText('The provided credentials are incorrect.')).toBeVisible()
    await expectPath(page, '/login')
  })

  test('a customer lands on their passes and cannot enter either dashboard', async ({ page }) => {
    await signIn(page, SEEDED_CUSTOMER)
    await expectPath(page, '/passes')

    for (const area of ['/admin', '/admin/users', '/organiser', '/organiser/checkin']) {
      await page.goto(area)
      await expectPath(page, '/passes')
    }
  })

  test('an organiser lands in the organiser area and is turned away from admin', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')
    await expect(page.getByRole('heading', { name: 'My events' })).toBeVisible()

    await page.goto('/admin/users')
    await expectPath(page, '/organiser')
  })

  test('an organiser sees no customer-only navigation and is kept out of customer pages', async ({ page }) => {
    await signIn(page, organiser)
    await expectPath(page, '/organiser')

    await page.goto('/events')
    await expect(page.getByRole('link', { name: 'My passes' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Organiser dashboard' })).toBeVisible()

    await page.goto('/passes')
    await expectPath(page, '/organiser')
  })

  test('an admin lands in the admin area, can open every admin page, and can also open the organiser area', async ({ page }) => {
    await signIn(page, ADMIN)
    await expectPath(page, '/admin')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    for (const [path, heading] of [
      ['/admin/events', 'Events'],
      ['/admin/bookings', 'Bookings'],
      ['/admin/venues', 'Venues'],
      ['/admin/users', 'People'],
      ['/admin/notifications', 'Emails'],
    ]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    }

    await page.goto('/organiser')
    await expect(page.getByRole('heading', { name: 'My events' })).toBeVisible()
  })

  test('signing out from a dashboard ends the session everywhere', async ({ page }) => {
    await signIn(page, ADMIN)
    await expectPath(page, '/admin')

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expectPath(page, '/login')

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/)
  })

  test('the public site and the dashboards keep their own look when you move between them', async ({ page }) => {
    await signIn(page, ADMIN)
    await expectPath(page, '/admin')
    const dashboardFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    expect(dashboardFont).toContain('IBM Plex Sans')

    await page.goto('/')
    const publicFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    expect(publicFont).toContain('Archivo')
  })
})
