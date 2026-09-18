import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Header, HeaderGlobalAction, HeaderGlobalBar, HeaderName, HeaderNavigation, HeaderMenuItem } from '@carbon/react'
import { Logout } from '@carbon/icons-react'
import { useAuth } from '../lib/auth'

export default function Layout() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  if (loading || !user) return <p className="loading">Checking your session…</p>

  const leave = () => signOut().then(() => navigate('/login'))

  if (user.role === 'customer') {
    return (
      <main className="page">
        <h1 style={{ fontSize: '2rem', fontWeight: 400 }}>This portal is for event organisers.</h1>
        <p style={{ margin: '16px 0 24px', maxWidth: '60ch' }}>
          You&apos;re signed in as {user.email}, which is a customer account. Ask an administrator for an organiser account.
        </p>
        <Button kind="tertiary" onClick={leave}>
          Sign out
        </Button>
      </main>
    )
  }

  return (
    <>
      <Header aria-label="SentryPass Organiser">
        <HeaderName as={Link} to="/" prefix="SentryPass">
          Organiser
        </HeaderName>
        <HeaderNavigation aria-label="Main">
          <HeaderMenuItem as={Link} to="/" isCurrentPage={pathname === '/' || pathname.startsWith('/events')}>
            My events
          </HeaderMenuItem>
          <HeaderMenuItem as={Link} to="/checkin" isCurrentPage={pathname === '/checkin'}>
            Check-in
          </HeaderMenuItem>
        </HeaderNavigation>
        <HeaderGlobalBar>
          <span style={{ color: 'var(--cds-text-on-color, #fff)', fontSize: '0.875rem', padding: '0 8px' }}>{user.name}</span>
          <HeaderGlobalAction aria-label="Sign out" tooltipAlignment="end" onClick={leave}>
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
