import { chromium } from '@playwright/test'

const out = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome' })

async function ctx(w, h, extra = {}) {
  return browser.newContext({ viewport: { width: w, height: h }, ...extra })
}

// ---- desktop home
{
  const c = await ctx(1440, 900)
  const p = await c.newPage()
  await p.goto('http://localhost:5175/')
  await p.waitForTimeout(1500)
  await p.mouse.move(980, 420)
  await p.waitForTimeout(600)
  await p.screenshot({ path: `${out}/home-top.png` })
  // tilt check: moving over a hero poster sets the tilt variables
  const box = await p.locator('.hero-poster').first().boundingBox()
  await p.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2)
  await p.waitForTimeout(400)
  const vars = await p.locator('.hero-poster').first().evaluate((e) => ({ ry: e.style.getPropertyValue('--ry'), rx: e.style.getPropertyValue('--rx'), tilting: e.dataset.tilting }))
  console.log('tilt vars', JSON.stringify(vars))
  await p.screenshot({ path: `${out}/home-tilt.png` })
  for (const [name, sel] of [['seats', '.seats-demo'], ['bento', '.bento-wrap']]) {
    await p.locator(sel).scrollIntoViewIfNeeded()
    await p.waitForTimeout(1600)
    if (name === 'seats') {
      const s = await p.locator('.seatmap').boundingBox()
      await p.mouse.move(s.x + s.width * 0.55, s.y + s.height * 0.5)
      await p.waitForTimeout(500)
    }
    await p.screenshot({ path: `${out}/home-${name}.png` })
  }
  await c.close()
}

// ---- mobile home
{
  const c = await ctx(420, 860, { hasTouch: true, isMobile: true })
  const p = await c.newPage()
  await p.goto('http://localhost:5175/')
  await p.waitForTimeout(1800)
  await p.screenshot({ path: `${out}/home-mobile.png` })
  await p.locator('.seats-demo').scrollIntoViewIfNeeded()
  await p.waitForTimeout(1800)
  await p.screenshot({ path: `${out}/home-mobile-seats.png` })
  await c.close()
}

await browser.close()
