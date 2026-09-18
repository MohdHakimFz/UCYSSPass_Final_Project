import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type Category, type EventItem, type Paginated } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { CATEGORY_LABEL, Notice, SeatBar, Skeleton } from '../components/ui'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]

function seatState(ev: EventItem) {
  if (!ev.capacity) return { text: 'Tickets not on sale yet', tone: 'muted' }
  const left = ev.seats_remaining ?? 0
  if (left === 0) return { text: 'Sold out, join the waitlist', tone: 'held' }
  if (left <= Math.max(5, ev.capacity * 0.1)) return { text: `Only ${left} seats left`, tone: 'held' }
  return { text: `${left} seats left`, tone: 'cleared' }
}

const priceText = (ev: EventItem) =>
  ev.from_price == null ? '—' : Number(ev.from_price) === 0 ? 'Free' : `From RM ${Number(ev.from_price).toFixed(0)}`

// The soonest matching event, drawn as a ticket. It is the first result, not decoration.
function FeaturedPass({ ev }: { ev: EventItem }) {
  const d = new Date(ev.start_at)
  const seats = seatState(ev)
  return (
    <Link to={`/events/${ev.id}`} className="feature">
      <div className="feature-stub" aria-hidden="true">
        <span className="stub-day">{d.getDate()}</span>
        <span className="stub-month">{d.toLocaleString('en-MY', { month: 'short' })}</span>
      </div>
      <div className="feature-body">
        <h2>{ev.title}</h2>
        <p>
          {CATEGORY_LABEL[ev.category]} · {ev.venue?.name ?? 'Venue to be announced'}
        </p>
        <p>{d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</p>
        {ev.capacity ? <SeatBar capacity={ev.capacity} remaining={ev.seats_remaining ?? 0} /> : null}
        <div className="feature-foot">
          <span>
            <strong>{priceText(ev)}</strong> · {seats.text}
          </span>
          <span className="feature-cta">Book a seat</span>
        </div>
      </div>
    </Link>
  )
}

export default function Events() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'' | Category>('')
  const [page, setPage] = useState(1)
  const [when, setWhen] = useState<'' | '7' | '30'>('')
  const [price, setPrice] = useState<'' | '0' | '50' | '100'>('')

  const qs = new URLSearchParams({
    status: 'published',
    from: new Date().toISOString(),
    per_page: '8',
    page: String(page),
  })
  if (query) qs.set('search', query)
  if (when) qs.set('to', new Date(Date.now() + Number(when) * 86400000).toISOString())
  if (price) qs.set('max_price', price)
  if (category) qs.set('category', category)
  const { data, error } = useFetch<Paginated<EventItem>>(`/events?${qs}`)

  const hasFilters = !!(query || category || when || price)
  const clearFilters = () => {
    setSearch('')
    setQuery('')
    setCategory('')
    setWhen('')
    setPrice('')
    setPage(1)
  }

  const featured = data?.data[0]
  const rest = page === 1 ? (data?.data.slice(1) ?? []) : (data?.data ?? [])

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
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
          <div className="filters-row">
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
            <div className="selects">
              <select className="pill-select" aria-label="When" value={when} onChange={(e) => { setWhen(e.target.value as typeof when); setPage(1) }}>
                <option value="">Any date</option>
                <option value="7">Next 7 days</option>
                <option value="30">Next 30 days</option>
              </select>
              <select className="pill-select" aria-label="Price" value={price} onChange={(e) => { setPrice(e.target.value as typeof price); setPage(1) }}>
                <option value="">Any price</option>
                <option value="0">Free</option>
                <option value="50">Up to RM 50</option>
                <option value="100">Up to RM 100</option>
              </select>
              {hasFilters && (
                <button className="link-btn" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {page === 1 && (featured ? <FeaturedPass ev={featured} /> : !data && !error ? <div className="feature feature-skeleton" aria-hidden="true" /> : null)}
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      {!data && !error ? (
        <Skeleton rows={4} />
      ) : data && data.data.length === 0 ? (
        <div className="empty">
          <p>Nothing matches yet. Try a different category or widen the date and price.</p>
          {hasFilters && (
            <button className="btn-quiet" style={{ marginTop: 16 }} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        rest.length > 0 && (
          <ul className="passes">
            {rest.map((ev) => {
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
                      <strong>{priceText(ev)}</strong>
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
