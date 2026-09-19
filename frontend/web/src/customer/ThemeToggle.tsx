import { useEffect, useState } from 'react'

type Choice = 'system' | 'light' | 'dark'

const KEY = 'ucyss-theme'
const CHOICES: { value: Choice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function saved(): Choice {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/** Light, dark, or follow the device. The choice is remembered in this browser only. */
export default function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>(saved)

  useEffect(() => {
    const root = document.documentElement
    if (choice === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', choice)
    try {
      if (choice === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, choice)
    } catch {
      // Private window: the choice still applies until the page closes.
    }
  }, [choice])

  // The dashboards have their own theme, so leave the page as we found it when the public site closes.
  useEffect(() => () => document.documentElement.removeAttribute('data-theme'), [])

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      {CHOICES.map((c) => (
        <button key={c.value} type="button" aria-pressed={choice === c.value} onClick={() => setChoice(c.value)}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
