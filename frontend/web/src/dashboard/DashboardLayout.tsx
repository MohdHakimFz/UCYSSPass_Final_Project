import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Header, HeaderGlobalAction, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation } from '@carbon/react'
import { Logout } from '@carbon/icons-react'
import { useAuth } from '@/lib/auth'
import ThemeSheet from '@/shared/ThemeSheet'
import dashboardCss from './dashboard.scss?inline'

export type DashboardLink = { to: string; label: string; end?: boolean }

/** Shared chrome for the organiser and admin areas: Carbon header, role name, sign out. */
export default function DashboardLayout({ area, base, links }: { area: string; base: string; links: DashboardLink[] }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isCurrent = (l: DashboardLink) => (l.end ? pathname === l.to : pathname.startsWith(l.to))

  return (
    <ThemeSheet id="dashboard" css={dashboardCss}>
      <Header aria-label={`SentryPass ${area}`}>
        <HeaderName as={Link} to={base} prefix="SentryPass">
          {area}
        </HeaderName>
        <HeaderNavigation aria-label="Main">
          {user?.role === 'admin' && base === '/organiser' && (
            <HeaderMenuItem as={Link} to="/admin">
              Back to admin
            </HeaderMenuItem>
          )}
          {links.map((l) => (
            <HeaderMenuItem key={l.to} as={Link} to={l.to} isCurrentPage={isCurrent(l)}>
              {l.label}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>
        <HeaderGlobalBar>
          <span style={{ color: '#fff', fontSize: '0.875rem', padding: '0 8px' }}>{user?.name}</span>
          <HeaderGlobalAction
            aria-label="Sign out"
            tooltipAlignment="end"
            onClick={() => signOut().then(() => navigate('/login', { replace: true }))}
          >
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <main className="page">
        <Outlet />
      </main>
    </ThemeSheet>
  )
}
