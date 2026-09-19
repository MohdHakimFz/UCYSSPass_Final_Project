import { chromium } from '@playwright/test'
const out = process.argv[2]
const A = 'http://localhost/api'
const J = { Accept: 'application/json', 'Content-Type': 'application/json' }
const login = async (email) => (await (await fetch(A + '/auth/login', { method: 'POST', headers: J, body: JSON.stringify({ email, password: 'password' }) })).json()).token
const token = await login('customer@sentrypass.test')
const events = await (await fetch(A + '/events?status=published&per_page=20', { headers: J })).json()
let ev
for (const e of events.data) { const d = await (await fetch(`${A}/events/${e.id}`, { headers: J })).json(); if ((d.ticket_types ?? []).length >= 2) { ev = d; break } }
console.log('event', ev?.id, ev?.title)
const browser = await chromium.launch({ channel: 'chrome' })
const c = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await c.addInitScript((t) => localStorage.setItem('sentrypass_token', t), token)
const p = await c.newPage()
await p.goto(`http://localhost:5175/events/${ev.id}`)
await p.waitForTimeout(1800)
const s = await p.locator('.seatmap').boundingBox()
await p.mouse.move(s.x + s.width * 0.6, s.y + s.height * 0.45)
await p.waitForTimeout(600)
await p.screenshot({ path: `${out}/detail.png`, fullPage: true })
await p.goto('http://localhost:5175/passes')
await p.waitForTimeout(1800)
const t = p.locator('.ticket').first()
if (await t.count()) { const b = await t.boundingBox(); await p.mouse.move(b.x + b.width * 0.8, b.y + b.height * 0.3); await p.waitForTimeout(500) }
await p.screenshot({ path: `${out}/passes.png` })
await browser.close()
