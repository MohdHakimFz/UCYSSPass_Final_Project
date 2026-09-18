import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { ADMIN, createUser, expectPath, removeUser, tokenFor } from './helpers'

const backend = fileURLToPath(new URL('../../../backend', import.meta.url))

/** With no email key the API writes the code to its log in development; read the newest one for this address. */
function latestCode(email: string): string {
  const out = execSync(`docker compose exec -T laravel.test sh -c "grep 'Password reset code for ${email}' storage/logs/laravel.log | tail -1"`, {
    cwd: backend,
    encoding: 'utf8',
  })
  const match = out.match(/: (\d{6})\s*$/m)
  if (!match) throw new Error(`No reset code found in the log for ${email}. Is RESEND_API_KEY empty and the app in local mode?`)
  return match[1]
}

test.describe('forgotten password', () => {
  let adminToken: string
  let customer: Awaited<ReturnType<typeof createUser>>

  test.beforeAll(async () => {
    adminToken = await tokenFor(ADMIN.email)
    customer = await createUser('customer', adminToken)
  })

  test.afterAll(async () => {
    await removeUser(customer.id, adminToken)
  })

  test('a customer resets their password with the emailed code and signs in with the new one', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Forgot your password?' }).click()
    await expectPath(page, '/forgot-password')

    await page.getByLabel('Email').fill(customer.email)
    await page.getByRole('button', { name: 'Send the code' }).click()
    await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible()

    // A wrong code is refused with a clear message.
    await page.getByLabel('Six-digit code').fill('000000')
    await page.getByLabel('New password', { exact: true }).fill('brand-new-password')
    await page.getByLabel('Confirm new password').fill('brand-new-password')
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByText('That code is wrong or has expired.')).toBeVisible()

    await page.getByLabel('Six-digit code').fill(latestCode(customer.email))
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page).toHaveURL(/\/login\?reset=1/)
    await expect(page.getByText('Your password has been changed.')).toBeVisible()

    await page.getByLabel('Email').fill(customer.email)
    await page.getByLabel('Password').fill('brand-new-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expectPath(page, '/passes')
  })
})
