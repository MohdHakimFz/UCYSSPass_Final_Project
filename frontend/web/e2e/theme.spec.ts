import { expect, test } from '@playwright/test'

const bg = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('the customer site can be forced light or dark, and remembers the choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/events')
  const light = await bg(page)

  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const dark = await bg(page)
  expect(dark).not.toBe(light)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await bg(page)).toBe(dark)

  await page.getByRole('button', { name: 'Light', exact: true }).click()
  expect(await bg(page)).toBe(light)

  await page.getByRole('button', { name: 'Auto', exact: true }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
  await page.emulateMedia({ colorScheme: 'dark' })
  expect(await bg(page)).toBe(dark)
})
