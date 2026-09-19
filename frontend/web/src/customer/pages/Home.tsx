import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarPlus,
  DownloadSimple,
  EnvelopeSimple,
  Hourglass,
  ListChecks,
  QrCode,
  Scan,
  ShieldCheck,
  Ticket,
} from '@phosphor-icons/react'
import { type Category, type EventItem, type Paginated } from '@/lib/api'
import { useFetch } from '@/lib/useFetch'
import { CATEGORY_LABEL } from '@/customer/ui'
import Tilt from '@/shared/Tilt'
import Backdrop from '@/customer/fx/Backdrop'
import HeroTicket from '@/customer/fx/HeroTicket'
import SeatMap from '@/customer/fx/SeatMap'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]

const CATEGORY_BLURB: Record<Category, string> = {
  ctf: 'Capture the flag, solo or in a team.',
  bootcamp: 'Days of guided, hands-on practice.',
  conference: 'Talks, hallways and new contacts.',
  workshop: 'One topic, one room, real tools.',
}

// Fades sections in as they scroll into view. Without JS or with reduced motion they are simply visible.
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    el.dataset.reveal = 'wait'
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.reveal = 'in'
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

function Reveal({ children, className = '', as: Tag = 'section' }: { children: React.ReactNode; className?: string; as?: 'section' | 'div' }) {
  const ref = useReveal<HTMLElement>()
  return (
    <Tag ref={ref as React.RefObject<never>} className={`reveal ${className}`}>
      {children}
    </Tag>
  )
}

function HeroPoster({ cat, ev, size }: { cat: Category; ev?: EventItem; size: string }) {
  const inner = (
    <>
      <div className="poster-art" aria-hidden="true" />
      <div className="poster-date">
        {ev ? (
          <>
            <span className="poster-day">{new Date(ev.start_at).getDate()}</span>
            <span className="poster-month">{new Date(ev.start_at).toLocaleString('en-MY', { month: 'short' })}</span>
          </>
        ) : (
          <span className="poster-day">{CATEGORY_LABEL[cat].slice(0, 1)}</span>
        )}
      </div>
      <div className="poster-body">
        <span className="poster-kind">{CATEGORY_LABEL[cat]}</span>
        <h3>{ev ? ev.title : CATEGORY_BLURB[cat]}</h3>
      </div>
    </>
  )
  return ev ? (
    <Tilt as={Link} to={`/events/${ev.id}`} className="poster hero-poster" data-cat={cat} data-size={size}>
      {inner}
    </Tilt>
  ) : (
    <Tilt className="poster hero-poster" data-cat={cat} data-size={size} aria-hidden="true">
      {inner}
    </Tilt>
  )
}

export default function Home() {
  const { data } = useFetch<Paginated<EventItem>>(`/events?status=published&per_page=4&sort=start_at`)

  // Real upcoming events when the API has them, one poster per category otherwise.
  const picks: { cat: Category; ev?: EventItem }[] = CATEGORIES.map((cat, i) => {
    const ev = data?.data[i]
    return { cat: ev?.category ?? cat, ev }
  })

  const lead = picks[0].ev

  return (
    <>
      <Backdrop />
      <section className="hero">
        <div className="hero-copy">
          <h1>
            <span className="line">
              <span>Security events,</span>
            </span>
            <span className="line">
              <span>
                booked in <em>seconds.</em>
              </span>
            </span>
          </h1>
          <p>
            SentryPass is where CTFs, bootcamps, conferences and workshops sell seats. You get a signed QR pass on your
            phone, and the door checks it in one scan.
          </p>
          <div className="hero-actions">
            <Link to="/events" className="btn btn-lg">
              Browse events <ArrowRight weight="bold" aria-hidden="true" />
            </Link>
            <a href="#how" className="text-link">
              How it works
            </a>
          </div>
        </div>
        <div className="hero-wall" aria-label="Upcoming events">
          <HeroPoster {...picks[0]} size="a" />
          <HeroPoster {...picks[1]} size="b" />
          <HeroPoster {...picks[2]} size="c" />
          <HeroPoster {...picks[3]} size="d" />
          <HeroTicket
            title={lead?.title ?? 'Your next event'}
            when={lead ? new Date(lead.start_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Signed QR pass'}
          />
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].flatMap((n) =>
            ['CTF', 'Bootcamp', 'Conference', 'Workshop', 'Signed QR passes', 'Live waitlist', 'One seat, one buyer'].map((w) => <span key={`${n}-${w}`}>{w}</span>),
          )}
        </div>
      </div>

      <div className="facts">
        <ul>
          <li>
            <strong>One seat, one buyer</strong>
            <span>The last seat can only be booked once, even when everyone taps at the same moment.</span>
          </li>
          <li>
            <strong>Signed passes</strong>
            <span>Every QR carries a signature, so a screenshot edit or a guess is rejected at the door.</span>
          </li>
          <li>
            <strong>Waitlists that move</strong>
            <span>When someone cancels, the next person in line is confirmed and emailed.</span>
          </li>
        </ul>
      </div>

      <Reveal className="how" >
        <div id="how" className="how-head">
          <h2>From search to seat in three steps.</h2>
          <p>No forms to print, no PDFs to forward. Your pass lives in My passes and works offline once opened.</p>
        </div>
        <ol className="steps">
          <li>
            <span className="step-no">01</span>
            <div>
              <h3>Find your event</h3>
              <p>Filter by type, date and price. Every poster shows how many seats are left before you click.</p>
            </div>
          </li>
          <li>
            <span className="step-no">02</span>
            <div>
              <h3>Take a seat</h3>
              <p>Pick a ticket tier and book. If it is sold out you join the waitlist and are confirmed the moment a seat frees up.</p>
            </div>
          </li>
          <li>
            <span className="step-no">03</span>
            <div>
              <h3>Show your pass</h3>
              <p>Open the QR at the door. Staff scan it, the screen turns green, and you are in.</p>
            </div>
          </li>
        </ol>
      </Reveal>

      <Reveal className="bento-wrap">
        <h2 className="bento-title">Built for the door, not just the checkout.</h2>
        <div className="bento">
          <article className="bento-a">
            <QrCode size={40} weight="bold" aria-hidden="true" />
            <h3>A pass nobody can fake</h3>
            <p>
              Each QR is signed with a secret only the server knows. Edit a single character and the scanner shows a red
              screen.
            </p>
            <div className="qr-art" aria-hidden="true" />
          </article>
          <article className="bento-b">
            <Hourglass size={32} weight="bold" aria-hidden="true" />
            <h3>Self-moving waitlist</h3>
            <p>Sold out is not the end. Cancellations promote the next person automatically.</p>
          </article>
          <article className="bento-c">
            <CalendarPlus size={32} weight="bold" aria-hidden="true" />
            <h3>Straight to your calendar</h3>
            <p>Add any confirmed event to your calendar with one tap.</p>
          </article>
          <article className="bento-d">
            <EnvelopeSimple size={32} weight="bold" aria-hidden="true" />
            <h3>Email you can trust</h3>
            <p>Confirmations, promotions and cancellations arrive as they happen.</p>
          </article>
        </div>
      </Reveal>

      <Reveal className="seats-demo">
        <div className="seats-demo-head">
          <h2>Watch the room fill up, seat by seat.</h2>
          <p>Every event shows its ticket tiers as a room. Free seats glow, taken ones go dark, and the picture updates as people book. Move your cursor over it.</p>
        </div>
        <SeatMap
          blocks={[
            { id: 'front', name: 'Front row', capacity: 36, remaining: 9 },
            { id: 'floor', name: 'General admission', capacity: 84, remaining: 47 },
          ]}
          caption="A sample room. On an event page this shows the real numbers."
        />
      </Reveal>

      <Reveal className="cats">
        <div className="cats-head">
          <h2>Four kinds of events.</h2>
          <p>Pick the one you came for.</p>
        </div>
        <div className="cats-grid">
          {CATEGORIES.map((c) => (
            <Tilt as={Link} key={c} to={`/events?category=${c}`} className="poster cat-poster" data-cat={c}>
              <div className="poster-art" aria-hidden="true" />
              <div className="poster-body">
                <h3>{CATEGORY_LABEL[c]}</h3>
                <p>{CATEGORY_BLURB[c]}</p>
                <span className="cat-go">
                  See events <ArrowRight weight="bold" aria-hidden="true" />
                </span>
              </div>
            </Tilt>
          ))}
        </div>
      </Reveal>

      <Reveal className="organisers">
        <div className="org-copy">
          <h2>Running an event?</h2>
          <p>
            Organisers get their own portal to set up ticket tiers, watch seats fill, export the attendee list and check
            people in by scanning.
          </p>
          <ul>
            <li>
              <ListChecks size={22} weight="bold" aria-hidden="true" /> Tiers with their own price and seat count
            </li>
            <li>
              <DownloadSimple size={22} weight="bold" aria-hidden="true" /> Attendee list as CSV in one click
            </li>
            <li>
              <Scan size={22} weight="bold" aria-hidden="true" /> Camera check-in with a live door count
            </li>
            <li>
              <ShieldCheck size={22} weight="bold" aria-hidden="true" /> Every pass verified before entry
            </li>
          </ul>
          <Link className="btn btn-inverse" to="/organiser">
            Open the organiser portal <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <div className="org-art" aria-hidden="true">
          <div className="door-card">
            <span className="door-ok">
              <ShieldCheck size={44} weight="fill" />
            </span>
            <strong>Cleared to enter</strong>
            <span>Booking 31, General admission</span>
            <div className="door-bar">
              <i />
            </div>
            <span className="door-count">72 of 130 arrived</span>
          </div>
        </div>
      </Reveal>

      <Reveal className="closer">
        <Ticket size={48} weight="bold" aria-hidden="true" />
        <h2>Your next seat is waiting.</h2>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-lg">
            Create your account <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </Reveal>

      <footer className="site-foot">
        <span>SentryPass</span>
        <span>Events, seats and signed passes for the security community.</span>
      </footer>
    </>
  )
}
