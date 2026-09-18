import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { HOME } from '@/lib/roles'
import ThemeSheet from '@/shared/ThemeSheet'
import posterCss from './styles/poster.css?inline'
import homeCss from './styles/home.css?inline'

const CSS = `${posterCss}\n${homeCss}`

/** The public site: home, events, sign-in, and the customer's own passes and profile. */
export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isHome = useLocation().pathname === '/'
  const staff = user && user.role !== 'customer'

  return (
    <ThemeSheet id="public" css={CSS}>
      <header className="masthead">
        <div className="masthead-inner">
          <Link to="/" className="wordmark">
            SentryPass
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/events">Events</NavLink>
            {!staff && <NavLink to="/passes">My passes</NavLink>}
          </nav>
          <div className="who">
            {user ? (
              <>
                {staff ? (
                  <Link to={HOME[user.role]} className="who-name">
                    {user.role === 'admin' ? 'Admin dashboard' : 'Organiser dashboard'}
                  </Link>
                ) : (
                  <Link to="/profile" className="who-name">
                    {user.name}
                  </Link>
                )}
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
      <main className={isHome ? 'home-main' : 'page'}>
        <Outlet />
      </main>
    </ThemeSheet>
  )
}
