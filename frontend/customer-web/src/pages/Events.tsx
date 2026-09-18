import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { type Category, type EventItem, type Paginated } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { CATEGORY_LABEL, Notice } from '../components/ui'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]

// The wall repeats an asymmetric rhythm in three blocks, and a short last block stretches
// so every row of the wall is always full.
const BLOCKS: string[][] = [
  ['xl', 'l', 'w'],
  ['m', 'm', 'm'],
  ['l', 'l2'],
]
const SHORT: Record<string, string[][]> = {
  '0': [['f3'], ['xl', 'l3']],
  '1': [['f2'], ['h', 'h']],
  '2': [['f2']],
}

function wallSizes(count: number): string[] {
  const out: string[] = []
  let block = 0
  while (out.length < count) {
    const full = BLOCKS[block % BLOCKS.length]
    const take = Math.min(full.length, count - out.length)
    out.push(...(take === full.length ? full : SHORT[String(block % BLOCKS.length)][take - 1]))
    block++
  }
  return out
}

function seatState(ev: EventItem) {
  if (!ev.capacity) return 'Tickets not on sale yet'
  const left = ev.seats_remaining ?? 0
  if (left === 0) return 'Sold out, join the waitlist'
  if (left <= Math.max(5, ev.capacity * 0.1)) return `Only ${left} seats left`
  return `${left} seats left`
}

const priceText = (ev: EventItem) =>
  ev.from_price == null ? '' : Number(ev.from_price) === 0 ? 'Free' : `From RM ${Number(ev.from_price).toFixed(0)}`

function Poster({ ev, i, size }: { ev: EventItem; i: number; size: string }) {
  const d = new Date(ev.start_at)
  return (
    <Link
      to={`/events/${ev.id}`}
      className="poster"
      data-cat={ev.category}
      data-size={size}
      style={{ '--i': i } as React.CSSProperties}
    >
      <div className="poster-art" aria-hidden="true" />
      <div className="poster-date">
        <span className="poster-day">{d.getDate()}</span>
        <span className="poster-month">{d.toLocaleString('en-MY', { month: 'short' })}</span>
      </div>
      <div className="poster-body">
        <h2>{ev.title}</h2>
        <p>
          {CATEGORY_LABEL[ev.category]}, {ev.venue?.name ?? 'venue to be announced'}
        </p>
      </div>
      <div className="poster-foot">
        <span>{priceText(ev)}</span>
        <span>{seatState(ev)}</span>
      </div>
    </Link>
  )
}

function WallSkeleton() {
  return (
    <div className="wall wall-skeleton" aria-busy="true" aria-label="Loading events">
      {(['xl', 'l', 'w', 'm', 'm'] as const).map((size, i) => (
        <div key={i} className="poster" data-size={size} />
      ))}
    </div>
  )
}

export default function Events() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [params] = useSearchParams()
  const initial = params.get('category')
  const [category, setCategory] = useState<'' | Category>(CATEGORIES.includes(initial as Category) ? (initial as Category) : '')
  const [page, setPage] = useState(1)
  const [when, setWhen] = useState<'' | '7' | '30'>('')
  const [price, setPrice] = useState<'' | '0' | '50' | '100'>('')
  const [now] = useState(() => Date.now())

  const qs = new URLSearchParams({
    status: 'published',
    from: new Date(now).toISOString(),
    per_page: '8',
    page: String(page),
  })
  if (query) qs.set('search', query)
  if (when) qs.set('to', new Date(now + Number(when) * 86400000).toISOString())
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
            placeholder="Search events, for example web security"
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
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      {!data && !error ? (
        <WallSkeleton />
      ) : data && data.data.length === 0 ? (
        <div className="empty">
          <p>Nothing matches yet. Try a different category, or widen the date and price.</p>
          {hasFilters && (
            <button className="btn-quiet" style={{ marginTop: 16 }} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        data && (
          <div className="wall">
            {wallSizes(data.data.length).map((size, i) => (
              <Poster key={data.data[i].id} ev={data.data[i]} i={i} size={size} />
            ))}
          </div>
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
