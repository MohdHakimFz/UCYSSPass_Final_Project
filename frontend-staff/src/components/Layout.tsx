import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Layout() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  if (loading || !user) return <p className="loading">Checking your session…</p>

  if (user.role === 'customer') {
    return (
      <main className="page">
        <h1 className="lede">This portal is for event organisers.</h1>
        <p className="lede-sub">
          You&apos;re signed in as {user.email}, which is a customer account. Ask an administrator for an
          organiser account.
        </p>
        <p style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => signOut().then(() => navigate('/login'))}>
            Sign out
          </button>
        </p>
      </main>
    )
  }

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <Link to="/" className="wordmark">
            <span>Organiser</span>SentryPass
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>
              My events
            </NavLink>
            <NavLink to="/checkin">Check-in</NavLink>
          </nav>
          <div className="who">
            <span>{user.name}</span>
            <button onClick={() => signOut().then(() => navigate('/login'))}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
