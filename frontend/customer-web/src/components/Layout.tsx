import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Layout({ protectedRoute = false }: { protectedRoute?: boolean }) {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (protectedRoute && !loading && !user) navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true })
  }, [protectedRoute, loading, user, navigate, location.pathname])

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <Link to="/" className="wordmark">
            SentryPass
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>
              Events
            </NavLink>
            <NavLink to="/passes">My passes</NavLink>
          </nav>
          <div className="who">
            {user ? (
              <>
                <Link to="/profile" className="who-name">{user.name}</Link>
                <button onClick={() => signOut().then(() => navigate('/'))}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register" className="join">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="page">{protectedRoute && (loading || !user) ? <p className="loading">Checking your session…</p> : <Outlet />}</main>
    </>
  )
}
