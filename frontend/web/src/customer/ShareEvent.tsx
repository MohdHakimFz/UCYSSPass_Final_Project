import { useState } from 'react'
import { BRAND } from '@/lib/brand'
import type { EventItem } from '@/lib/api'
import { formatWhen } from '@/customer/ui'

/** WhatsApp, copy link and (where the device has one) its own share sheet. The message never contains a meeting link. */
export default function ShareEvent({ event }: { event: EventItem }) {
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)

  const url = `${window.location.origin}/events/${event.id}`
  const where = event.mode === 'online' ? 'Online meeting' : (event.venue?.name ?? '')
  const text = [event.title, [formatWhen(event.start_at), where].filter(Boolean).join(' · '), `Book on ${BRAND.name}:`, url].join('\n')
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(text)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setManual(false)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // No clipboard access (an insecure page, or the browser said no): show the link to copy by hand.
      setManual(true)
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: event.title, text, url })
    } catch {
      /* the person closed the share sheet */
    }
  }

  return (
    <div className="share" aria-label="Share this event">
      <a className="btn-quiet" href={whatsapp} target="_blank" rel="noopener noreferrer">
        Share on WhatsApp
      </a>
      <button type="button" className="btn-quiet" onClick={copy}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      {typeof navigator.share === 'function' && (
        <button type="button" className="btn-quiet" onClick={nativeShare}>
          More…
        </button>
      )}
      {manual && <input className="share-field" readOnly value={url} aria-label="Event link" onFocus={(e) => e.currentTarget.select()} />}
    </div>
  )
}
