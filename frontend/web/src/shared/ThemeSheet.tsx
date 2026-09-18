import { useLayoutEffect, useState } from 'react'

/**
 * The public site (Poster Wall) and the dashboards (IBM Carbon) are two design systems inside one app.
 * Each area mounts its own stylesheet and removes it when the person leaves, so the two never fight over
 * global rules such as body, h1 or :root. Children render only once the sheet is in the page.
 */
export default function ThemeSheet({ id, css, children }: { id: string; css: string; children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const style = document.createElement('style')
    style.dataset.theme = id
    style.textContent = css
    document.head.appendChild(style)
    setReady(true)
    return () => {
      style.remove()
      setReady(false)
    }
  }, [id, css])

  return ready ? <>{children}</> : null
}
