import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type Category, type EventItem, type Paginated } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { CATEGORY_LABEL, Notice } from '../components/ui'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]

function seatState(ev: EventItem) {
  if (!ev.capacity) return { text: 'Tickets not on sale yet', tone: 'muted' }
  const left = ev.seats_remaining ?? 0
  if (left === 0) return { text: 'Sold out — join the waitlist', tone: 'held' }
  if (left <= Math.max(5, ev.capacity * 0.1)) return { text: `Only ${left} seats left`, tone: 'held' }
  return { text: `${left} seats left`, tone: 'cleared' }
}

export default function Events() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'' | Category>('')
  const [page, setPage] = useState(1)

  const qs = new URLSearchParams({
    status: 'published',
    from: new Date().toISOString(),
    per_page: '8',
    page: String(page),
  })
  if (query) qs.set('search', query)
  if (category) qs.set('category', category)
  const { data, error } = useFetch<Paginated<EventItem>>(`/events?${qs}`)

  return (
    <>
      <section className="hero">
        <h1>Find your next CTF, bootcamp or conference.</h1>
        <p className="lede-sub">Book a seat, get a signed QR pass, and walk straight in.</p>
        <form
          className="finder"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            setQuery(search)
          }}
        >
          <input
            type="search"
            className="search"
            placeholder="Search events, for example “web security”"
            aria-label="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn">Search</button>
        </form>
        <div className="chips" role="group" aria-label="Category">
          <button className="chip" aria-pressed={category === ''} onClick={() => { setCategory(''); setPage(1) }}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} className="chip" aria-pressed={category === c} onClick={() => { setCategory(c); setPage(1) }}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      {!data && !error ? (
        <p className="loading">Loading events…</p>
      ) : data && data.data.length === 0 ? (
        <p className="empty">Nothing matches yet. Try a different category or clear the search.</p>
      ) : (
        data && (
          <ul className="passes">
            {data.data.map((ev) => {
              const d = new Date(ev.start_at)
              const seats = seatState(ev)
              return (
                <li key={ev.id}>
                  <Link to={`/events/${ev.id}`} className="pass">
                    <div className="stub" aria-hidden="true">
                      <span className="stub-day">{d.getDate()}</span>
                      <span className="stub-month">{d.toLocaleString('en-MY', { month: 'short' })}</span>
                    </div>
                    <div className="pass-main">
                      <h2>{ev.title}</h2>
                      <p>
                        {CATEGORY_LABEL[ev.category]} · {ev.venue?.name ?? 'Venue to be announced'} ·{' '}
                        {d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="pass-side">
                      <strong>{ev.from_price != null ? (Number(ev.from_price) === 0 ? 'Free' : `From RM ${Number(ev.from_price).toFixed(0)}`) : '—'}</strong>
                      <span className="tag" data-tone={seats.tone}>
                        {seats.text}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )
      )}

      {data && data.last_page > 1 && (
        <div className="pager">
          <button className="btn-quiet" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {data.last_page}
          </span>
          <button className="btn-quiet" disabled={page >= data.last_page} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  )
}
