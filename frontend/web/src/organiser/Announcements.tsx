import { useState } from 'react'
import { Button, TextArea, TextInput } from '@carbon/react'
import { Send } from '@carbon/icons-react'
import { api, errorText, type AnnouncementList } from '@/lib/api'
import { useFetch } from '@/lib/useFetch'
import { useFeedback } from '@/dashboard/feedback'
import { Notice, formatWhen } from '@/dashboard/ui'

/** Write to everyone who is booked on this event (or waiting for a seat), and see what was sent before. */
export default function Announcements({ eventId, published }: { eventId: number; published: boolean }) {
  const { toast, confirm } = useFeedback()
  const { data, reload } = useFetch<AnnouncementList>(`/events/${eventId}/announcements`)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audience = data?.audience ?? 0
  const ready = published && audience > 0 && subject.trim() !== '' && message.trim() !== ''

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const ok = await confirm({
      title: `Send this to ${audience} ${audience === 1 ? 'person' : 'people'}?`,
      body: `“${subject}” will be emailed to everyone booked on this event, including people on the waitlist. It cannot be recalled.`,
      confirmLabel: 'Send announcement',
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await api(`/events/${eventId}/announcements`, { method: 'POST', body: { subject: subject.trim(), message: message.trim() } })
      toast({ kind: 'success', title: 'Announcement is on its way', subtitle: `${audience} ${audience === 1 ? 'person is' : 'people are'} being emailed.` })
      setSubject('')
      setMessage('')
      reload()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!published) return <p className="sub">You can send announcements once the event is published.</p>

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      <form className="pane" onSubmit={send}>
        <TextInput id="announce-subject" labelText="Subject" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="For example: Room change for Saturday" />
        <TextArea id="announce-message" labelText="Message" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} style={{ marginTop: 16 }} helperText="Plain text. Line breaks are kept." />
        <div className="form-actions" style={{ marginTop: 16 }}>
          <Button type="submit" renderIcon={Send} disabled={!ready || busy}>
            {busy ? 'Sending…' : `Send to ${audience} ${audience === 1 ? 'person' : 'people'}`}
          </Button>
          {data && audience === 0 && <span className="sub">Nobody has booked yet, so there is nobody to send to.</span>}
        </div>
      </form>

      {data && data.data.length > 0 && (
        <ul className="announcement-history" aria-label="Sent announcements">
          {data.data.map((a) => (
            <li key={a.id}>
              <strong>{a.subject}</strong>
              <span className="sub">
                {formatWhen(a.created_at)} · to {a.recipients} {a.recipients === 1 ? 'person' : 'people'}
                {a.sender ? ` · by ${a.sender.name}` : ''}
              </span>
              <details>
                <summary>Show the message</summary>
                <p style={{ whiteSpace: 'pre-wrap' }}>{a.message}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
